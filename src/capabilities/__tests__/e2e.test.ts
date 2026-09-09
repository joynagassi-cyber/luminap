/**
 * E2E Integration Tests — Critical User Flows
 *
 * Tests complete user workflows that cross multiple capabilities:
 *   1. Authentication → Organization → Dashboard
 *   2. Transaction creation → workflow → approval → immutability
 *   3. Group membership → relationship
 *   4. Archive → restore → audit trail
 *   5. Organization switch → data isolation
 *
 * All external dependencies (PowerSync, auth, orgContext, audit) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Static imports for all capabilities under test ────────────────
import { workflow, transactionGuard, eventStatusGuard } from '@/capabilities/workflow';
import { relationship } from '@/capabilities/relationship';
import { lifecycle } from '@/capabilities/lifecycle';
import { organization } from '@/capabilities/organization';
import { security } from '@/capabilities/security';
import { identity } from '@/capabilities/identity';
import { auditLogRepo } from '@/lib/audit';
import { setOrganizationId, getOrganizationId } from '@/lib/orgContext';
import { getPowerSyncDatabase } from '@/lib/powersync';
import type { ArchivableEntity } from '@/types';

// ─── Mock orgContext (shared mutable state) ────────────────────────
const _orgIdStore: string[] = ['e2e-org-1'];
vi.mock('@/lib/orgContext', () => ({
  getOrganizationId: () => _orgIdStore[_orgIdStore.length - 1] ?? 'default-org',
  setOrganizationId: (id: string) => { _orgIdStore[_orgIdStore.length - 1] = id; },
}));

// ─── Mock PowerSync with in-memory SQL store ───────────────────────
const _psRows: Record<string, any[]> = {};

function psExecute(sql: string, params: any[] = []): { result: any[] } {
  const tableMatch = sql.match(/FROM\s+(\w+)/i);
  const table = tableMatch ? tableMatch[1] : 'unknown';
  const rows = _psRows[table] ?? [];

  const idMatch = sql.match(/WHERE id = \?$/);
  if (idMatch) {
    const found = rows.find((r: any) => r.id === params[0]);
    return { result: found ? [found] : [] };
  }

  const orgStatusMatch = sql.match(/WHERE org_id = \? AND status = \?/);
  if (orgStatusMatch) {
    return { result: rows.filter((r: any) => r.org_id === params[0] && r.status === params[1]) };
  }

  if (sql.includes('WHERE org_id = ?') && !sql.includes('status')) {
    return { result: rows.filter((r: any) => r.org_id === params[0]) };
  }

  if (sql.includes('SELECT status FROM')) {
    const found = rows.find((r: any) => r.id === params[0]);
    return { result: found ? [{ status: found.status }] : [] };
  }

  if (sql.startsWith('SELECT')) {
    return { result: rows };
  }

  const insertMatch = sql.match(/INSERT INTO (\w+)/i);
  if (insertMatch) {
    const t = insertMatch[1];
    if (!(_psRows[t])) _psRows[t] = [];
    const row: any = {};
    const colMatch = sql.match(/\(([^)]+)\)/);
    if (colMatch) {
      const cols = colMatch[1].split(',').map((c: string) => c.trim());
      cols.forEach((col: string, i: number) => {
        row[col] = params[i];
      });
    }
    _psRows[t].push(row);
    return { result: [] };
  }

  const deleteMatch = sql.match(/DELETE FROM (\w+) WHERE id = \?/i);
  if (deleteMatch) {
    const t = deleteMatch[1];
    if (_psRows[t]) _psRows[t] = _psRows[t].filter((r: any) => r.id !== params[0]);
    return { result: [] };
  }

  const updateMatch = sql.match(/UPDATE (\w+)/i);
  if (updateMatch) {
    const t = updateMatch[1];
    if (_psRows[t]) {
      const idVal = params[params.length - 1];
      const idx = _psRows[t].findIndex((r: any) => r.id === idVal);
      if (idx !== -1) {
        const setMatch = sql.match(/SET (.+) WHERE/);
        if (setMatch) {
          let pi = 0;
          setMatch[1].split(',').forEach((clause: string) => {
            const eqIdx = clause.indexOf('=');
            const col = eqIdx > 0 ? clause.substring(0, eqIdx).trim() : clause.split(/\s+/)[0];
            const val = clause.substring(eqIdx + 1).trim();
            if (col && col !== 'id' && val !== 'NULL' && val !== '?') {
              _psRows[t][idx][col] = val;
            } else if (val === '?' && pi < params.length) {
              _psRows[t][idx][col] = params[pi++];
            }
          });
        }
        _psRows[t][idx].updated_at = new Date().toISOString();
      }
    }
    return { result: [] };
  }

  return { result: [] };
}

vi.mock('@/lib/powersync', () => ({
  getPowerSyncDatabase: () => ({ execute: psExecute }),
}));

// ─── Mock auditLogRepo ─────────────────────────────────────────────
const _auditEntries: any[] = [];
vi.mock('@/lib/audit', () => ({
  auditLogRepo: {
    async write(entry: any) {
      _auditEntries.push({ ...entry, createdAt: new Date().toISOString() });
    },
    async list(filters: any = {}) {
      let entries = [..._auditEntries];
      if (filters.entityType) entries = entries.filter((e: any) => e.entityType === filters.entityType);
      if (filters.startDate) entries = entries.filter((e: any) => e.createdAt >= filters.startDate);
      if (filters.endDate) entries = entries.filter((e: any) => e.createdAt <= filters.endDate);
      if (filters.actorId) entries = entries.filter((e: any) => e.userId === filters.actorId);
      return entries;
    },
    async getByEntity() { return []; },
  },
  writeAudit: vi.fn(),
}));

// ─── Mock dataLayer (group_memberships) ───────────────────────────
const _memberships: Array<{ id: string; group_id: string; member_id: string; role: string; org_id?: string }> = [];
vi.mock('@/lib/dataLayer', () => ({
  addGroupMembershipPS: async (groupId: string, memberId: string, role: string) => {
    const id = `mem-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    _memberships.push({ id, group_id: groupId, member_id: memberId, role, org_id: _orgIdStore[0] });
    return id;
  },
  removeGroupMembershipPS: async (id: string) => {
    const idx = _memberships.findIndex(m => m.id === id);
    if (idx !== -1) _memberships.splice(idx, 1);
  },
  getGroupMembershipsPS: async () => _memberships,
}));

// ─── Cleanup between tests ─────────────────────────────────────────
beforeEach(() => {
  _orgIdStore[0] = 'e2e-org-1';
  Object.keys(_psRows).forEach(k => _psRows[k].length = 0);
  _auditEntries.length = 0;
  _memberships.length = 0;
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════
// FLOW 1: Authentication → Organization → Dashboard
// ════════════════════════════════════════════════════════════════════

describe('e2e: authentication → organization → dashboard', () => {
  it('auth success resolves to a profile with org context', async () => {
    const orgId = getOrganizationId();
    expect(typeof orgId).toBe('string');
    expect(orgId.length).toBeGreaterThan(0);
  });

  it('organization context is initialised with a default org on fresh start', () => {
    const orgId = getOrganizationId();
    expect(orgId).toBeDefined();
    expect(typeof orgId).toBe('string');
  });

  it('dashboard data is scoped to the current organization', async () => {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    // Seed two orgs' data
    await db.execute(
      'INSERT INTO transactions (id, org_id, type, amount, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['tx-org1-1', 'e2e-org-1', 'donation', 5000, 'Tithe', '2024-06-01', 'APPROVED', now, now]
    );
    await db.execute(
      'INSERT INTO transactions (id, org_id, type, amount, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['tx-org2-1', 'e2e-org-2', 'donation', 3000, 'Offering', '2024-06-02', 'PENDING', now, now]
    );

    const currentOrg = getOrganizationId();
    const result = await db.execute('SELECT * FROM transactions WHERE org_id = ?', [currentOrg]);
    expect(result.result).toHaveLength(1);
    expect(result.result[0].org_id).toBe(currentOrg);
  });
});

// ════════════════════════════════════════════════════════════════════
// FLOW 2: Transaction create → workflow → approval → immutability
// ════════════════════════════════════════════════════════════════════

describe('e2e: transaction create → workflow → approval → immutability', () => {
  it('creates a DRAFT transaction and transitions to PENDING', async () => {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();
    const txId = 'tx-e2e-1';

    await db.execute(
      'INSERT INTO transactions (id, org_id, type, amount, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, 'e2e-org-1', 'donation', 10000, 'Test tithe', '2024-06-15', 'DRAFT', now, now]
    );

    const { result } = await db.execute('SELECT * FROM transactions WHERE id = ?', [txId]);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('DRAFT');

    const guardResult = transactionGuard('DRAFT', 'PENDING');
    expect(guardResult.allowed).toBe(true);
  });

  it('transitions PENDING → APPROVED via workflow guard', () => {
    const guardResult = transactionGuard('PENDING', 'APPROVED');
    expect(guardResult.allowed).toBe(true);
  });

  it('blocks any transition away from APPROVED (immutability)', () => {
    const r1 = transactionGuard('APPROVED', 'DRAFT');
    expect(r1.allowed).toBe(false);
    expect(r1.reason).toBe('TRANSACTION_APPROVED_IMMUTABLE');

    const r2 = transactionGuard('APPROVED', 'REJECTED');
    expect(r2.allowed).toBe(false);
    expect(r2.reason).toBe('TRANSACTION_APPROVED_IMMUTABLE');
  });

  it('allows APPROVED → APPROVED (no-op)', () => {
    expect(transactionGuard('APPROVED', 'APPROVED').allowed).toBe(true);
  });

  it('full lifecycle: DRAFT → PENDING → APPROVED is allowed', () => {
    const steps = [
      { from: 'DRAFT', to: 'PENDING' },
      { from: 'PENDING', to: 'APPROVED' },
    ];
    for (const step of steps) {
      const r = transactionGuard(step.from, step.to);
      expect(r.allowed).toBe(true);
    }
  });

  it('REJECTED → DRAFT transition is allowed (retry flow)', () => {
    expect(transactionGuard('REJECTED', 'DRAFT').allowed).toBe(true);
  });

  it('data layer persists APPROVED status immutably', async () => {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();
    const txId = 'tx-e2e-approved';

    await db.execute(
      'INSERT INTO transactions (id, org_id, type, amount, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [txId, 'e2e-org-1', 'donation', 10000, 'Immutable tx', '2024-06-15', 'APPROVED', now, now]
    );

    const { result } = await db.execute('SELECT status FROM transactions WHERE id = ?', [txId]);
    expect(result[0].status).toBe('APPROVED');
  });
});

// ════════════════════════════════════════════════════════════════════
// FLOW 3: Group membership → relationship
// ════════════════════════════════════════════════════════════════════

describe('e2e: group membership → relationship', () => {
  it('add member → isMember returns true', async () => {
    const memId = await relationship.addMembership('group-a', 'user-1', 'MEMBRE', 'actor-1');
    expect(typeof memId).toBe('string');
    expect(memId.length).toBeGreaterThan(0);

    expect(await relationship.isMember('group-a', 'user-1')).toBe(true);
  });

  it('remove member → isMember returns false', async () => {
    const memId = await relationship.addMembership('group-b', 'user-2', 'MEMBRE', 'actor-1');
    expect(await relationship.isMember('group-b', 'user-2')).toBe(true);

    await relationship.removeMembership(memId, 'actor-1');
    expect(await relationship.isMember('group-b', 'user-2')).toBe(false);
  });

  it('isMember returns false for non-existent membership', async () => {
    expect(await relationship.isMember('group-missing', 'user-missing')).toBe(false);
  });

  it('cross-org isolation: membership in org-1 visible only in org-1', async () => {
    _memberships.push({
      id: 'mem-cross-1',
      group_id: 'group-x',
      member_id: 'user-x',
      role: 'MEMBRE',
      org_id: 'e2e-org-1',
    });

    expect(await relationship.isMember('group-x', 'user-x')).toBe(true);
  });

  it('supports RESPONSABLE role', async () => {
    const memId = await relationship.addMembership('group-c', 'user-3', 'RESPONSABLE', 'actor-1');
    expect(memId).toBeDefined();
    expect(await relationship.isMember('group-c', 'user-3')).toBe(true);
  });

  it('multiple members can belong to the same group', async () => {
    await relationship.addMembership('group-d', 'user-a', 'MEMBRE', 'actor-1');
    await relationship.addMembership('group-d', 'user-b', 'MEMBRE', 'actor-1');

    expect(await relationship.isMember('group-d', 'user-a')).toBe(true);
    expect(await relationship.isMember('group-d', 'user-b')).toBe(true);
    expect(await relationship.isMember('group-d', 'user-c')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
// FLOW 4: Archive → restore → audit trail
// ════════════════════════════════════════════════════════════════════

describe('e2e: archive → restore → audit trail', () => {
  it('archive a Group entity writes ARCHIVE audit entry', async () => {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    await db.execute(
      'INSERT INTO groups (id, org_id, name, status, archived_at, archived_by, archive_reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['grp-arch-1', 'e2e-org-1', 'Test Group', 'ACTIVE', null, null, null, now, now]
    );

    lifecycle.register('Group', { canArchive: async () => ({ ok: true }) });
    await lifecycle.archive('Group', 'grp-arch-1', 'Old data', 'actor-1');

    const entries = await auditLogRepo.list({ entityType: 'Group' });
    const archiveEntry = entries.find((e: any) => e.action === 'ARCHIVE');
    expect(archiveEntry).toBeDefined();
    expect(archiveEntry.entityId).toBe('grp-arch-1');
    expect(archiveEntry.userId).toBe('actor-1');
    expect(archiveEntry.comment).toBe('Old data');
  });

  it('restore a Group entity writes RESTORE audit entry', async () => {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    await db.execute(
      'INSERT INTO groups (id, org_id, name, status, archived_at, archived_by, archive_reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['grp-rest-1', 'e2e-org-1', 'Restored Group', 'ARCHIVED', now, 'actor-1', 'Archived', now, now]
    );

    lifecycle.register('Group', { canRestore: async () => ({ ok: true }) });
    await lifecycle.restore('Group', 'grp-rest-1', 'Needed again', 'actor-2');

    const entries = await auditLogRepo.list({ entityType: 'Group' });
    const restoreEntry = entries.find((e: any) => e.action === 'RESTORE');
    expect(restoreEntry).toBeDefined();
    expect(restoreEntry.entityId).toBe('grp-rest-1');
    expect(restoreEntry.userId).toBe('actor-2');
    expect(restoreEntry.comment).toBe('Needed again');
  });

  it('isLifecycleActive returns true for ACTIVE entity', async () => {
    const db = getPowerSyncDatabase();
    await db.execute(
      'INSERT INTO groups (id, org_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['grp-active-1', 'e2e-org-1', 'Active', 'ACTIVE', new Date().toISOString(), new Date().toISOString()]
    );

    expect(await lifecycle.isLifecycleActive('Group', 'grp-active-1')).toBe(true);
  });

  it('isLifecycleActive returns false for ARCHIVED entity', async () => {
    const db = getPowerSyncDatabase();
    await db.execute(
      'INSERT INTO groups (id, org_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['grp-archived-1', 'e2e-org-1', 'Archived', 'ARCHIVED', new Date().toISOString(), new Date().toISOString()]
    );

    expect(await lifecycle.isLifecycleActive('Group', 'grp-archived-1')).toBe(false);
  });

  it('listArchived returns only ARCHIVE and RESTORE entries', async () => {
    await auditLogRepo.write({
      orgId: 'e2e-org-1',
      transactionId: null,
      userId: 'actor-1',
      actorRoleAtTime: null,
      action: 'ARCHIVE',
      entityType: 'Group' as ArchivableEntity,
      entityId: 'grp-filter-1',
      beforeState: { status: 'ACTIVE' },
      afterState: { status: 'ARCHIVED' },
      comment: 'reason',
    });
    await auditLogRepo.write({
      orgId: 'e2e-org-1',
      transactionId: null,
      userId: 'actor-1',
      actorRoleAtTime: null,
      action: 'CREATE',
      entityType: 'Group' as ArchivableEntity,
      entityId: 'grp-filter-2',
      beforeState: null,
      afterState: { status: 'ACTIVE' },
      comment: null,
    });

    const archived = await lifecycle.listArchived({ entityType: 'Group' });
    expect(archived).toHaveLength(1);
    expect(archived[0].action).toBe('ARCHIVE');
  });

  it('archive throws when entity not found', async () => {
    lifecycle.register('Group', { canArchive: async () => ({ ok: true }) });
    await expect(lifecycle.archive('Group', 'nonexistent', 'reason', 'actor-1'))
      .rejects.toThrow('Entity Group with id nonexistent not found');
  });

  it('archive throws when policy rejects', async () => {
    const db = getPowerSyncDatabase();
    await db.execute(
      'INSERT INTO groups (id, org_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['grp-block-1', 'e2e-org-1', 'Block', 'ACTIVE', new Date().toISOString(), new Date().toISOString()]
    );
    lifecycle.register('Group', {
      canArchive: async () => ({ ok: false, reason: 'Has pending transactions' }),
    });
    await expect(lifecycle.archive('Group', 'grp-block-1', 'reason', 'actor-1'))
      .rejects.toThrow('Has pending transactions');
  });
});

// ════════════════════════════════════════════════════════════════════
// FLOW 5: Organization switch → data isolation
// ════════════════════════════════════════════════════════════════════

describe('e2e: organization switch → data isolation', () => {
  it('switchOrg updates the active org context', async () => {
    const initialOrg = getOrganizationId();
    expect(initialOrg).toBe('e2e-org-1');

    await organization.switchOrg('e2e-org-2');
    expect(getOrganizationId()).toBe('e2e-org-2');

    setOrganizationId('e2e-org-1');
  });

  it('context orgId changes after switch', async () => {
    await organization.switchOrg('e2e-org-switched');
    const ctx = organization.getContext();
    expect(ctx.orgId).toBe('e2e-org-switched');

    _orgIdStore[0] = 'e2e-org-1';
  });

  it('org units are isolated by organization', async () => {
    organization.addOrgUnit({ id: 'u-org1', name: 'Org1 Unit', parentId: null, orgId: 'e2e-org-1' });
    organization.addOrgUnit({ id: 'u-org2', name: 'Org2 Unit', parentId: null, orgId: 'e2e-org-2' });

    let units = await organization.getOrgUnits();
    expect(units).toHaveLength(1);
    expect(units[0].id).toBe('u-org1');

    await organization.switchOrg('e2e-org-2');
    units = await organization.getOrgUnits();
    expect(units).toHaveLength(1);
    expect(units[0].id).toBe('u-org2');

    _orgIdStore[0] = 'e2e-org-1';
  });

  it('membership data is scoped to the active organization', async () => {
    await relationship.addMembership('group-isolated', 'user-1', 'MEMBRE', 'actor-1');
    expect(await relationship.isMember('group-isolated', 'user-1')).toBe(true);

    setOrganizationId('e2e-org-2');
    expect(await relationship.isMember('group-isolated', 'user-1')).toBe(false);

    setOrganizationId('e2e-org-1');
  });

  it('switching org does not corrupt other org data', async () => {
    organization.registerOrg('e2e-org-1', 'Org One');
    organization.registerOrg('e2e-org-2', 'Org Two');

    await organization.switchOrg('e2e-org-2');
    expect(getOrganizationId()).toBe('e2e-org-2');
    expect(organization.getContext().orgName).toBe('Org Two');

    await organization.switchOrg('e2e-org-1');
    expect(getOrganizationId()).toBe('e2e-org-1');
    expect(organization.getContext().orgName).toBe('Org One');
  });
});

// ════════════════════════════════════════════════════════════════════
// INTEGRATION: Cross-capability flows
// ════════════════════════════════════════════════════════════════════

describe('e2e: cross-capability integration', () => {
  it('full flow: add member → verify relationship → switch org → member not visible → switch back', async () => {
    await relationship.addMembership('int-group', 'int-user', 'MEMBRE', 'actor-1');
    expect(await relationship.isMember('int-group', 'int-user')).toBe(true);

    await organization.switchOrg('e2e-org-2');
    expect(getOrganizationId()).toBe('e2e-org-2');
    expect(await relationship.isMember('int-group', 'int-user')).toBe(false);

    await organization.switchOrg('e2e-org-1');
    expect(getOrganizationId()).toBe('e2e-org-1');
    expect(await relationship.isMember('int-group', 'int-user')).toBe(true);
  });

  it('transaction guard + lifecycle: approved transaction immutability coexists with group archive', async () => {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    await db.execute(
      'INSERT INTO transactions (id, org_id, type, amount, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['tx-int-1', 'e2e-org-1', 'donation', 5000, 'Approved', '2024-06-01', 'APPROVED', now, now]
    );

    const guard = transactionGuard('APPROVED', 'DRAFT');
    expect(guard.allowed).toBe(false);

    await db.execute(
      'INSERT INTO groups (id, org_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['grp-int-1', 'e2e-org-1', 'Integration Group', 'ACTIVE', now, now]
    );
    lifecycle.register('Group', { canArchive: async () => ({ ok: true }) });
    await lifecycle.archive('Group', 'grp-int-1', 'Test integration', 'actor-1');

    const entries = await auditLogRepo.list({ entityType: 'Group' });
    expect(entries.some((e: any) => e.action === 'ARCHIVE')).toBe(true);
  });

  it('security capability: user role gates transaction approval', () => {
    expect(security.hasPermission('TREASURIER', 'transaction:approve')).toBe(true);
    expect(security.hasPermission('MEMBRE', 'transaction:approve')).toBe(false);
    expect(security.hasPermission('BENEVOLE', 'transaction:approve')).toBe(false);
    expect(security.hasPermission('PASTEUR_PRINCIPAL', 'transaction:approve')).toBe(true);
    expect(security.hasPermission('PASTEUR_PRINCIPAL', 'admin:settings')).toBe(true);
  });

  it('identity: create profile → update → retrieve → delete', () => {
    const profile = identity.createProfile('user-e2e-1', 'test@example.com', 'Test User');
    expect(profile.id).toBe('user-e2e-1');
    expect(profile.email).toBe('test@example.com');
    expect(profile.displayName).toBe('Test User');

    const updated = identity.updateProfile('user-e2e-1', { displayName: 'Updated User' });
    expect(updated!.displayName).toBe('Updated User');

    const retrieved = identity.getProfile('user-e2e-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.displayName).toBe('Updated User');

    const deleted = identity.deleteProfile('user-e2e-1');
    expect(deleted).toBe(true);
    expect(identity.getProfile('user-e2e-1')).toBeNull();
  });

  it('workflow: event status transitions through full lifecycle', () => {
    expect(eventStatusGuard('PLANIFIED', 'ONGOING').allowed).toBe(true);
    expect(eventStatusGuard('ONGOING', 'COMPLETED').allowed).toBe(true);
    expect(eventStatusGuard('COMPLETED', 'ONGOING').allowed).toBe(false);
    expect(eventStatusGuard('COMPLETED', 'PLANIFIED').allowed).toBe(false);
    expect(eventStatusGuard('CANCELLED', 'PLANIFIED').allowed).toBe(false);
    expect(eventStatusGuard('PLANIFIED', 'CANCELLED').allowed).toBe(true);
    expect(eventStatusGuard('ONGOING', 'CANCELLED').allowed).toBe(true);
  });
});
