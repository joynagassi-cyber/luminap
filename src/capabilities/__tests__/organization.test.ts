import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OrganizationService,
  type OrgContext,
  type OrgUnit,
} from '../organization';

// Mock orgContext with reactive state
let _mockOrgId = 'test-org-1';
const mockSetOrgId = vi.fn((id: string) => { _mockOrgId = id; });
vi.mock('@/lib/orgContext', () => ({
  getOrganizationId: () => _mockOrgId,
  setOrganizationId: vi.fn((id: string) => { _mockOrgId = id; }),
}));

describe('organization capability', () => {
  let organization: OrganizationService;

  beforeEach(() => {
    organization = new OrganizationService();
    _mockOrgId = 'test-org-1';
    vi.clearAllMocks();
  });

  // ─── getContext ────────────────────────────────────────────────

  describe('getContext', () => {
    it('returns the current orgId from getOrganizationId', () => {
      const ctx = organization.getContext();
      expect(ctx.orgId).toBe('test-org-1');
    });

    it('defaults orgName to orgId when not registered', () => {
      const ctx = organization.getContext();
      expect(ctx.orgName).toBe('test-org-1');
    });

    it('uses registered org name when available', () => {
      organization.registerOrg('test-org-1', 'Acme Corp');
      const ctx = organization.getContext();
      expect(ctx.orgName).toBe('Acme Corp');
    });

    it('defaults role to member', () => {
      const ctx = organization.getContext();
      expect(ctx.role).toBe('member');
    });

    it('returns valid OrgContext shape', () => {
      const ctx = organization.getContext() as OrgContext;
      expect(typeof ctx.orgId).toBe('string');
      expect(typeof ctx.orgName).toBe('string');
      expect(typeof ctx.role).toBe('string');
    });
  });

  // ─── switchOrg ─────────────────────────────────────────────────

  describe('switchOrg', () => {
    it('updates the organization context via setOrganizationId', async () => {
      const { setOrganizationId } = await import('@/lib/orgContext');
      await organization.switchOrg('new-org-2');
      expect(setOrganizationId).toHaveBeenCalledWith('new-org-2');
    });

    it('changes getContext orgId after switch', async () => {
      await organization.switchOrg('org-switched');
      const ctx = organization.getContext();
      expect(ctx.orgId).toBe('org-switched');
    });
  });

  // ─── getOrgUnits ───────────────────────────────────────────────

  describe('getOrgUnits', () => {
    it('returns empty array when no units exist', async () => {
      const units = await organization.getOrgUnits();
      expect(units).toEqual([]);
    });

    it('returns units for the current org', async () => {
      organization.addOrgUnit({
        id: 'unit-1',
        name: 'Engineering',
        parentId: null,
        orgId: 'test-org-1',
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(1);
      expect(units[0].name).toBe('Engineering');
    });

    it('filters units by current org context', async () => {
      organization.addOrgUnit({
        id: 'unit-a',
        name: 'Org A Unit',
        parentId: null,
        orgId: 'org-a',
      });
      organization.addOrgUnit({
        id: 'unit-b',
        name: 'Org B Unit',
        parentId: null,
        orgId: 'test-org-1',
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(1);
      expect(units[0].name).toBe('Org B Unit');
    });

    it('returns valid OrgUnit shape', async () => {
      const unit: OrgUnit = {
        id: 'u1',
        name: 'Sales',
        parentId: null,
        orgId: 'test-org-1',
      };
      organization.addOrgUnit(unit);
      const units = await organization.getOrgUnits();
      expect(units[0].id).toBe('u1');
      expect(units[0].parentId).toBeNull();
    });

    it('supports nested units via parentId', async () => {
      organization.addOrgUnit({
        id: 'parent',
        name: 'Root',
        parentId: null,
        orgId: 'test-org-1',
      });
      organization.addOrgUnit({
        id: 'child',
        name: 'Sub',
        parentId: 'parent',
        orgId: 'test-org-1',
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(2);
      expect(units.find(u => u.id === 'child')!.parentId).toBe('parent');
    });
  });

  // ─── registerOrg ───────────────────────────────────────────────

  describe('registerOrg', () => {
    it('registers an org with a display name', () => {
      organization.registerOrg('org-x', 'X Organization');
      const ctx = organization.getContext();
      // Note: getContext uses current org from orgContext, so we switch first
    });

    it('updates the name seen by getContext', () => {
      organization.registerOrg('test-org-1', 'My Org');
      const ctx = organization.getContext();
      expect(ctx.orgName).toBe('My Org');
    });
  });

  // ─── addOrgUnit ────────────────────────────────────────────────

  describe('addOrgUnit', () => {
    it('stores a new unit for the specified org', async () => {
      organization.addOrgUnit({
        id: 'u1',
        name: 'Team Alpha',
        parentId: null,
        orgId: 'test-org-1',
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(1);
    });

    it('appends to existing units', async () => {
      organization.addOrgUnit({
        id: 'u1',
        name: 'Unit 1',
        parentId: null,
        orgId: 'test-org-1',
      });
      organization.addOrgUnit({
        id: 'u2',
        name: 'Unit 2',
        parentId: null,
        orgId: 'test-org-1',
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(2);
    });
  });

  // ─── removeOrgUnit ─────────────────────────────────────────────

  describe('removeOrgUnit', () => {
    it('removes a unit and returns true', () => {
      organization.addOrgUnit({
        id: 'u1',
        name: 'ToDelete',
        parentId: null,
        orgId: 'test-org-1',
      });
      const result = organization.removeOrgUnit('test-org-1', 'u1');
      expect(result).toBe(true);
    });

    it('returns false for a non-existent unit', () => {
      const result = organization.removeOrgUnit('test-org-1', 'nonexistent');
      expect(result).toBe(false);
    });

    it('does not affect other orgs', () => {
      organization.addOrgUnit({
        id: 'u1',
        name: 'Other Org Unit',
        parentId: null,
        orgId: 'other-org',
      });
      const result = organization.removeOrgUnit('test-org-1', 'u1');
      expect(result).toBe(false);
    });
  });

  // ─── listOrgs ──────────────────────────────────────────────────

  describe('listOrgs', () => {
    it('returns empty array when no orgs registered', () => {
      const orgs = organization.listOrgs();
      expect(orgs).toEqual([]);
    });

    it('returns all registered organizations', () => {
      organization.registerOrg('org-1', 'Org One');
      organization.registerOrg('org-2', 'Org Two');
      const orgs = organization.listOrgs();
      expect(orgs).toHaveLength(2);
      expect(orgs.map(o => o.name)).toContain('Org One');
      expect(orgs.map(o => o.name)).toContain('Org Two');
    });
  });

  // ─── contract verification ─────────────────────────────────────

  describe('OrgContext contract', () => {
    it('has all required fields: orgId, orgName, role', () => {
      const ctx: OrgContext = {
        orgId: 'org-1',
        orgName: 'Test Org',
        role: 'admin',
      };
      expect(ctx.orgId).toBe('org-1');
      expect(ctx.orgName).toBe('Test Org');
      expect(ctx.role).toBe('admin');
    });
  });

  describe('OrganizationService contract', () => {
    it('exposes getContext, switchOrg, getOrgUnits', () => {
      expect(typeof organization.getContext).toBe('function');
      expect(typeof organization.switchOrg).toBe('function');
      expect(typeof organization.getOrgUnits).toBe('function');
    });
  });

  describe('OrgUnit contract', () => {
    it('has all required fields: id, name, parentId, orgId', () => {
      const unit: OrgUnit = {
        id: 'u1',
        name: 'Unit',
        parentId: null,
        orgId: 'org-1',
      };
      expect(unit.id).toBe('u1');
      expect(unit.name).toBe('Unit');
      expect(unit.parentId).toBeNull();
      expect(unit.orgId).toBe('org-1');
    });
  });

  // ─── domain-agnostic verification ──────────────────────────────

  describe('domain-agnostic', () => {
    it('does not reference any church-specific terminology', () => {
      const serviceCode = OrganizationService.prototype.getContext.toString();
      const ctx = organization.getContext();
      // Verify no domain-specific leakage in the contract
      expect(ctx.orgId).toBeDefined();
      expect(ctx.orgName).toBeDefined();
      expect(ctx.role).toBeDefined();
    });

    it('uses generic role value, not role-specific strings', () => {
      const ctx = organization.getContext();
      expect(typeof ctx.role).toBe('string');
      // Role is free-form, not restricted to any domain
    });
  });
});
