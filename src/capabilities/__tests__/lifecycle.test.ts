import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LifecycleService, type LifecyclePolicy } from '../lifecycle';
import type { ArchivableEntity } from '@/types';

// ─── Shared mutable stores ────────────────────────────────────────
const mockRows: Record<string, any[]> = {};
const mockAuditEntries: any[] = [];

// ─── powersync mock ───────────────────────────────────────────────
const mockDb = {
  execute: async (sql: string, params: any[] = []) => {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : 'unknown';
    const data = mockRows[table] ?? [];

    // SELECT WHERE id = ?
    if (sql.includes('WHERE id = ?')) {
      const row = data.find((r: any) => r.id === params[0]);
      return { result: row ? [row] : [] };
    }

    // SELECT WHERE org_id = ? AND status = ?
    if (sql.includes('org_id = ?') && sql.includes('status = ?')) {
      const orgId = params[0];
      const status = params[1];
      return { result: data.filter((r: any) => r.org_id === orgId && r.status === status) };
    }

    // Generic SELECT
    return { result: data };
  },
};

vi.mock('@/lib/powersync', () => ({
  getPowerSyncDatabase: () => mockDb,
}));

// ─── auditLogRepo mock ────────────────────────────────────────────
vi.mock('@/lib/audit', () => ({
  auditLogRepo: {
    async write(entry: any) {
      mockAuditEntries.push(entry);
    },
    async list(filters: any = {}) {
      let entries = [...mockAuditEntries];
      if (filters.entityType) {
        entries = entries.filter((e: any) => e.entityType === filters.entityType);
      }
      if (filters.startDate) {
        entries = entries.filter((e: any) => e.createdAt >= filters.startDate);
      }
      if (filters.endDate) {
        entries = entries.filter((e: any) => e.createdAt <= filters.endDate);
      }
      if (filters.actorId) {
        entries = entries.filter((e: any) => e.userId === filters.actorId);
      }
      return entries;
    },
    async getByEntity() {
      return [];
    },
  },
  writeAudit: vi.fn(),
}));

vi.mock('@/lib/orgContext', () => ({
  getOrganizationId: () => 'org-test-1',
}));

describe('lifecycle capability', () => {
  let lifecycle: LifecycleService;

  beforeEach(() => {
    lifecycle = new LifecycleService();
    for (const key of Object.keys(mockRows)) {
      mockRows[key].length = 0;
    }
    mockAuditEntries.length = 0;
  });

  // ─── register / getPolicy ──────────────────────────────────────

  describe('register / getPolicy', () => {
    it('registers and retrieves a policy', () => {
      const policy: LifecyclePolicy = {
        canArchive: async () => ({ ok: true }),
        canRestore: async () => ({ ok: true }),
      };
      lifecycle.register('Group', policy);
      expect(lifecycle.getPolicy('Group')).toBe(policy);
    });

    it('returns undefined for unregistered entity type', () => {
      expect(lifecycle.getPolicy('Event')).toBeUndefined();
    });
  });

  // ─── archive ───────────────────────────────────────────────────

  describe('archive', () => {
    const makeEntity = (type: ArchivableEntity, id = 'ent-1', status = 'ACTIVE') => {
      const table = type === 'Group' ? 'groups' : type === 'Event' ? 'events' : type.toLowerCase() + 's';
      if (!mockRows[table]) mockRows[table] = [];
      const entity: any = { id, status, org_id: 'org-test-1', name: 'Test' };
      // Add lifecycle fields for entities that support them
      if (type !== 'Event') {
        entity.archived_at = null;
        entity.archived_by = null;
        entity.archive_reason = null;
      }
      mockRows[table].push(entity);
      return { type, id };
    };

    it('archives a Group entity to ARCHIVED status', async () => {
      makeEntity('Group');
      lifecycle.register('Group', { canArchive: async () => ({ ok: true }) });
      await lifecycle.archive('Group', 'ent-1', 'old data', 'user-1');
      // The service does the update directly; verify via audit entries
      expect(mockAuditEntries.length).toBe(1);
      expect(mockAuditEntries[0].action).toBe('ARCHIVE');
      expect(mockAuditEntries[0].afterState.status).toBe('ARCHIVED');
    });

    it('cancels an Event entity to CANCELLED status', async () => {
      makeEntity('Event');
      lifecycle.register('Event', { canArchive: async () => ({ ok: true }) });
      await lifecycle.archive('Event', 'ent-1', 'rescheduled', 'user-1');
      expect(mockAuditEntries[0].afterState.status).toBe('CANCELLED');
    });

    it('throws when entity is not found', async () => {
      lifecycle.register('Group', { canArchive: async () => ({ ok: true }) });
      await expect(lifecycle.archive('Group', 'nonexistent', 'reason', 'user-1'))
        .rejects.toThrow('Entity Group with id nonexistent not found');
    });

    it('throws when policy rejects archive', async () => {
      makeEntity('Group');
      lifecycle.register('Group', {
        canArchive: async () => ({ ok: false, reason: 'Has pending transactions' }),
      });
      await expect(lifecycle.archive('Group', 'ent-1', 'reason', 'user-1'))
        .rejects.toThrow('Has pending transactions');
    });

    it('calls onArchive side-effect after archiving', async () => {
      makeEntity('Group');
      const onArchive = vi.fn(async () => {});
      lifecycle.register('Group', {
        canArchive: async () => ({ ok: true }),
        onArchive,
      });
      await lifecycle.archive('Group', 'ent-1', 'reason', 'user-1');
      expect(onArchive).toHaveBeenCalledWith('ent-1');
    });

    it('writes an audit entry on archive', async () => {
      makeEntity('Group');
      lifecycle.register('Group', { canArchive: async () => ({ ok: true }) });
      await lifecycle.archive('Group', 'ent-1', 'reason', 'user-1');
      expect(mockAuditEntries.length).toBe(1);
      const entry = mockAuditEntries[0];
      expect(entry.action).toBe('ARCHIVE');
      expect(entry.entityType).toBe('Group');
      expect(entry.entityId).toBe('ent-1');
      expect(entry.userId).toBe('user-1');
      expect(entry.comment).toBe('reason');
    });

    it('does not set archived_at for Event entities', async () => {
      makeEntity('Event');
      lifecycle.register('Event', { canArchive: async () => ({ ok: true }) });
      await lifecycle.archive('Event', 'ent-1', 'reason', 'user-1');
      // archivedAt should be null in the afterState for events
      expect(mockAuditEntries[0].afterState.archivedAt).toBeNull();
    });
  });

  // ─── restore ───────────────────────────────────────────────────

  describe('restore', () => {
    const makeEntity = (type: ArchivableEntity, id = 'ent-1', status = 'ARCHIVED') => {
      const table = type === 'Group' ? 'groups' : type === 'Event' ? 'events' : type.toLowerCase() + 's';
      if (!mockRows[table]) mockRows[table] = [];
      mockRows[table].push({ id, status, org_id: 'org-test-1', name: 'Test', archived_at: '2024-01-01' });
      return { type, id };
    };

    it('restores a Group entity to ACTIVE status', async () => {
      makeEntity('Group');
      lifecycle.register('Group', { canRestore: async () => ({ ok: true }) });
      await lifecycle.restore('Group', 'ent-1', 'needed again', 'user-1');
      expect(mockAuditEntries[0].afterState.status).toBe('ACTIVE');
    });

    it('restores a CANCELLED Event to PLANIFIED', async () => {
      makeEntity('Event', 'ent-1', 'CANCELLED');
      lifecycle.register('Event', { canRestore: async () => ({ ok: true }) });
      await lifecycle.restore('Event', 'ent-1', 'rescheduled again', 'user-1');
      expect(mockAuditEntries[0].afterState.status).toBe('PLANIFIED');
    });

    it('throws when entity is not found', async () => {
      lifecycle.register('Group', { canRestore: async () => ({ ok: true }) });
      await expect(lifecycle.restore('Group', 'nonexistent', 'reason', 'user-1'))
        .rejects.toThrow('Entity Group with id nonexistent not found');
    });

    it('throws when policy rejects restore', async () => {
      makeEntity('Group');
      lifecycle.register('Group', {
        canRestore: async () => ({ ok: false, reason: 'Data too old' }),
      });
      await expect(lifecycle.restore('Group', 'ent-1', 'reason', 'user-1'))
        .rejects.toThrow('Data too old');
    });

    it('calls onRestore side-effect after restoring', async () => {
      makeEntity('Group');
      const onRestore = vi.fn(async () => {});
      lifecycle.register('Group', {
        canRestore: async () => ({ ok: true }),
        onRestore,
      });
      await lifecycle.restore('Group', 'ent-1', 'reason', 'user-1');
      expect(onRestore).toHaveBeenCalledWith('ent-1');
    });

    it('writes an audit entry on restore', async () => {
      makeEntity('Group');
      lifecycle.register('Group', { canRestore: async () => ({ ok: true }) });
      await lifecycle.restore('Group', 'ent-1', 'reason', 'user-1');
      expect(mockAuditEntries.length).toBe(1);
      expect(mockAuditEntries[0].action).toBe('RESTORE');
    });

    it('clears archived_at for restored Group entities', async () => {
      makeEntity('Group');
      lifecycle.register('Group', { canRestore: async () => ({ ok: true }) });
      await lifecycle.restore('Group', 'ent-1', 'reason', 'user-1');
      // afterState should have archivedAt set to null
      expect(mockAuditEntries[0].afterState.archivedAt).toBeNull();
    });
  });

  // ─── listArchived ──────────────────────────────────────────────

  describe('listArchived', () => {
    it('returns only ARCHIVE and RESTORE audit entries', async () => {
      mockAuditEntries.push(
        { action: 'ARCHIVE', entityType: 'Group', entityId: 'g1' },
        { action: 'CREATE', entityType: 'Group', entityId: 'g2' },
        { action: 'RESTORE', entityType: 'Group', entityId: 'g1' },
        { action: 'UPDATE', entityType: 'Group', entityId: 'g3' },
      );
      const result = await lifecycle.listArchived({ entityType: 'Group' });
      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('ARCHIVE');
      expect(result[1].action).toBe('RESTORE');
    });

    it('returns empty array when no archive/restore entries exist', async () => {
      mockAuditEntries.push({ action: 'CREATE', entityType: 'Group' });
      const result = await lifecycle.listArchived();
      expect(result).toHaveLength(0);
    });

    it('applies entityType filter', async () => {
      mockAuditEntries.push(
        { action: 'ARCHIVE', entityType: 'Group' },
        { action: 'ARCHIVE', entityType: 'Event' },
      );
      const result = await lifecycle.listArchived({ entityType: 'Event' });
      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('Event');
    });

    it('applies actorId filter', async () => {
      mockAuditEntries.push(
        { action: 'ARCHIVE', entityType: 'Group', userId: 'user-a', createdAt: '2024-06-01' },
        { action: 'ARCHIVE', entityType: 'Group', userId: 'user-b', createdAt: '2024-06-02' },
      );
      const result = await lifecycle.listArchived({ actorId: 'user-a' });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-a');
    });

    it('applies period filter', async () => {
      mockAuditEntries.push(
        { action: 'ARCHIVE', entityType: 'Group', userId: 'user-a', createdAt: '2024-01-01' },
        { action: 'ARCHIVE', entityType: 'Group', userId: 'user-a', createdAt: '2024-06-01' },
      );
      const result = await lifecycle.listArchived({
        period: { start: '2024-03-01', end: '2024-12-31' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBe('2024-06-01');
    });
  });

  // ─── isLifecycleActive ─────────────────────────────────────────

  describe('isLifecycleActive', () => {
    it('returns true for ACTIVE entity', async () => {
      if (!mockRows['groups']) mockRows['groups'] = [];
      mockRows['groups'].push({ id: 'g1', status: 'ACTIVE' });
      const result = await lifecycle.isLifecycleActive('Group', 'g1');
      expect(result).toBe(true);
    });

    it('returns false for ARCHIVED entity', async () => {
      if (!mockRows['groups']) mockRows['groups'] = [];
      mockRows['groups'].push({ id: 'g1', status: 'ARCHIVED' });
      const result = await lifecycle.isLifecycleActive('Group', 'g1');
      expect(result).toBe(false);
    });

    it('returns false for CANCELLED event', async () => {
      if (!mockRows['events']) mockRows['events'] = [];
      mockRows['events'].push({ id: 'e1', status: 'CANCELLED' });
      const result = await lifecycle.isLifecycleActive('Event', 'e1');
      expect(result).toBe(false);
    });

    it('returns false for non-existent entity', async () => {
      const result = await lifecycle.isLifecycleActive('Group', 'missing');
      expect(result).toBe(false);
    });

    it('returns true for PLANIFIED event', async () => {
      if (!mockRows['events']) mockRows['events'] = [];
      mockRows['events'].push({ id: 'e1', status: 'PLANIFIED' });
      const result = await lifecycle.isLifecycleActive('Event', 'e1');
      expect(result).toBe(true);
    });
  });
});
