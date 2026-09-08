import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationshipService, type MembershipRole } from '../relationship';

// Mock dataLayer
const _memberships: Array<{ id: string; group_id: string; member_id: string; role: string; org_id?: string }> = [];

vi.mock('@/lib/dataLayer', () => ({
  addGroupMembershipPS: vi.fn(async (groupId: string, memberId: string, role: string) => {
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    _memberships.push({ id, group_id: groupId, member_id: memberId, role, org_id: 'test-org-1' });
    return id;
  }),
  removeGroupMembershipPS: vi.fn(async (id: string) => {
    const idx = _memberships.findIndex(m => m.id === id);
    if (idx !== -1) _memberships.splice(idx, 1);
  }),
  getGroupMembershipsPS: vi.fn(async () => _memberships),
}));

const mockGetOrgId = vi.fn(() => 'test-org-1');

vi.mock('@/lib/orgContext', () => ({
  getOrganizationId: () => mockGetOrgId(),
}));

describe('relationship capability', () => {
  let relationship: RelationshipService;

  beforeEach(() => {
    relationship = new RelationshipService();
    _memberships.length = 0;
    vi.clearAllMocks();
  });

  // ─── addMembership ─────────────────────────────────────────────

  describe('addMembership', () => {
    it('returns a membership id on success', async () => {
      const id = await relationship.addMembership('group-1', 'member-1', 'MEMBRE', 'actor-1');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('persists the membership in the data layer', async () => {
      await relationship.addMembership('group-1', 'member-1', 'MEMBRE', 'actor-1');
      const { getGroupMembershipsPS } = await import('@/lib/dataLayer');
      const members = await getGroupMembershipsPS();
      expect(members).toHaveLength(1);
      expect(members[0].group_id).toBe('group-1');
      expect(members[0].member_id).toBe('member-1');
      expect(members[0].role).toBe('MEMBRE');
    });

    it('persists RESPONSABLE role correctly', async () => {
      await relationship.addMembership('group-1', 'member-2', 'RESPONSABLE', 'actor-1');
      const { getGroupMembershipsPS } = await import('@/lib/dataLayer');
      const members = await getGroupMembershipsPS();
      expect(members[0].role).toBe('RESPONSABLE');
    });

    it('generates a unique id for each call', async () => {
      const id1 = await relationship.addMembership('group-1', 'member-1', 'MEMBRE', 'actor-1');
      const id2 = await relationship.addMembership('group-1', 'member-2', 'MEMBRE', 'actor-1');
      expect(id1).not.toBe(id2);
    });

    it('allows adding the same member to different groups', async () => {
      await relationship.addMembership('group-1', 'member-1', 'MEMBRE', 'actor-1');
      await relationship.addMembership('group-2', 'member-1', 'MEMBRE', 'actor-1');
      const { getGroupMembershipsPS } = await import('@/lib/dataLayer');
      const members = await getGroupMembershipsPS();
      expect(members).toHaveLength(2);
    });
  });

  // ─── removeMembership ──────────────────────────────────────────

  describe('removeMembership', () => {
    it('removes a membership by id', async () => {
      const id = await relationship.addMembership('group-1', 'member-1', 'MEMBRE', 'actor-1');
      await relationship.removeMembership(id, 'actor-1');
      const { getGroupMembershipsPS } = await import('@/lib/dataLayer');
      const members = await getGroupMembershipsPS();
      expect(members).toHaveLength(0);
    });

    it('is a no-op for a non-existent membership id', async () => {
      // Should not throw
      await expect(relationship.removeMembership('nonexistent', 'actor-1'))
        .resolves.toBeUndefined();
    });

    it('does not affect other memberships', async () => {
      const id1 = await relationship.addMembership('group-1', 'member-1', 'MEMBRE', 'actor-1');
      await relationship.addMembership('group-1', 'member-2', 'MEMBRE', 'actor-1');
      await relationship.removeMembership(id1, 'actor-1');
      const { getGroupMembershipsPS } = await import('@/lib/dataLayer');
      const members = await getGroupMembershipsPS();
      expect(members).toHaveLength(1);
      expect(members[0].member_id).toBe('member-2');
    });
  });

  // ─── isMember ──────────────────────────────────────────────────

  describe('isMember', () => {
    it('returns true when member is in the group', async () => {
      await relationship.addMembership('group-1', 'member-1', 'MEMBRE', 'actor-1');
      const result = await relationship.isMember('group-1', 'member-1');
      expect(result).toBe(true);
    });

    it('returns false when member is not in the group', async () => {
      const result = await relationship.isMember('group-1', 'member-99');
      expect(result).toBe(false);
    });

    it('returns false for an empty membership list', async () => {
      const result = await relationship.isMember('group-1', 'member-1');
      expect(result).toBe(false);
    });

    it('returns false when member exists in a different group', async () => {
      await relationship.addMembership('group-2', 'member-1', 'MEMBRE', 'actor-1');
      const result = await relationship.isMember('group-1', 'member-1');
      expect(result).toBe(false);
    });

    it('returns true regardless of role', async () => {
      await relationship.addMembership('group-1', 'member-1', 'RESPONSABLE', 'actor-1');
      const result = await relationship.isMember('group-1', 'member-1');
      expect(result).toBe(true);
    });

    it('handles multiple memberships correctly', async () => {
      await relationship.addMembership('group-1', 'member-1', 'MEMBRE', 'actor-1');
      await relationship.addMembership('group-1', 'member-2', 'RESPONSABLE', 'actor-1');
      await relationship.addMembership('group-2', 'member-1', 'MEMBRE', 'actor-1');

      expect(await relationship.isMember('group-1', 'member-1')).toBe(true);
      expect(await relationship.isMember('group-1', 'member-2')).toBe(true);
      expect(await relationship.isMember('group-2', 'member-1')).toBe(true);
      expect(await relationship.isMember('group-2', 'member-2')).toBe(false);
    });

    it('isMember filters by org_id — cross-org isolation', async () => {
      // Insert two memberships: same group/member but DIFFERENT org_ids
      // The org-1 membership should be invisible when org context is org-2
      _memberships.push(
        { id: 'mem-org1', group_id: 'group-1', member_id: 'member-a', role: 'MEMBRE', org_id: 'org-1' },
        { id: 'mem-diff', group_id: 'group-2', member_id: 'member-a', role: 'MEMBRE', org_id: 'org-2' },
      );

      // With org-1 context: finds the membership in org-1
      mockGetOrgId.mockReturnValue('org-1');
      expect(await relationship.isMember('group-1', 'member-a')).toBe(true);

      // With org-2 context: membership is for group-2 only, group-1 is isolated
      mockGetOrgId.mockReturnValue('org-2');
      expect(await relationship.isMember('group-1', 'member-a')).toBe(false);
      // group-2 membership IS visible in org-2
      expect(await relationship.isMember('group-2', 'member-a')).toBe(true);
    });
  });
});
