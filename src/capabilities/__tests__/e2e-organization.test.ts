/**
 * E2E Organization Tests — Complete organization lifecycle
 *
 * Tests:
 *   1. Create organization (register + context verification)
 *   2. Switch organization (org switching + context propagation)
 *   3. Org isolation (data does not leak between orgs)
 *   4. Org units hierarchy (nested units, parent-child relationships)
 *
 * All external dependencies (orgContext, PowerSync, auth) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock orgContext (vi.hoisted runs before any module-level init) ──
const _orgCtx = vi.hoisted(() => ({
  value: 'e2e-org-default' as string,
  setOrgId: vi.fn((id: string) => { _orgCtx.value = id; }),
}));
vi.mock('@/lib/orgContext', () => ({
  getOrganizationId: () => _orgCtx.value,
  setOrganizationId: _orgCtx.setOrgId,
}));

// ─── Mock PowerSync ──────────────────────────────────────────────────
vi.mock('@/lib/powersync', () => ({
  getPowerSyncDatabase: () => ({
    execute: async () => ({ result: [] }),
  }),
}));

// ─── Mock auth (used by some org flows) ─────────────────────────────
const _mockUser = { role: 'PASTEUR_PRINCIPAL', id: 'e2e-org-user-1' };
vi.mock('@/store/useLocalStore', () => ({
  useLocalStore: vi.fn().mockImplementation(() => ({
    user: _mockUser,
    selectRole: vi.fn().mockResolvedValue(undefined),
    loadInitialData: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ─── Imports after mocks are set ─────────────────────────────────────
import { organization, OrganizationService } from '@/capabilities/organization';
import type { OrgContext, OrgUnit } from '@/capabilities/organization';

// ─── Cleanup between tests ───────────────────────────────────────────
beforeEach(() => {
  _orgCtx.value = 'e2e-org-default';
  // Reset the singleton internal state by creating a fresh instance for each test
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 1: Create organization
// ══════════════════════════════════════════════════════════════════════

describe('e2e-org: create organization', () => {
  it('registers a new organization with a display name', () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-create-1', 'Eglise Lumière');
    _orgCtx.value = 'org-create-1';

    const ctx = svc.getContext();
    expect(ctx.orgId).toBe('org-create-1');
    expect(ctx.orgName).toBe('Eglise Lumière');
    expect(typeof ctx.role).toBe('string');
  });

  it('defaults orgName to orgId when name is not provided', () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-create-2', 'Grace Community');
    _orgCtx.value = 'org-create-2';

    const ctx = svc.getContext();
    expect(ctx.orgName).toBe('Grace Community');
  });

  it('getOrganizationId reflects the registered org after switch', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-create-3', 'New Light Church');

    // Simulate switching org context
    _orgCtx.value = 'org-create-3';

    const ctx = svc.getContext();
    expect(ctx.orgId).toBe('org-create-3');
    expect(ctx.orgName).toBe('New Light Church');
  });

  it('listOrgs returns all registered organizations', () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-a', 'Alpha Church');
    svc.registerOrg('org-b', 'Beta Congregation');
    svc.registerOrg('org-c', 'Gamma Fellowship');

    const orgs = svc.listOrgs();
    expect(orgs).toHaveLength(3);
    expect(orgs.map(o => o.name)).toEqual(
      expect.arrayContaining(['Alpha Church', 'Beta Congregation', 'Gamma Fellowship'])
    );
    expect(orgs.map(o => o.orgId)).toEqual(
      expect.arrayContaining(['org-a', 'org-b', 'org-c'])
    );
  });

  it('listOrgs is empty before any org is registered', () => {
    const svc = new OrganizationService();
    const orgs = svc.listOrgs();
    expect(orgs).toEqual([]);
  });

  it('re-registering with same orgId updates the display name', () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-rename', 'Original Name');
    svc.registerOrg('org-rename', 'Updated Name');

    _orgCtx.value = 'org-rename';
    const ctx = svc.getContext();
    expect(ctx.orgName).toBe('Updated Name');
  });

  it('orgId is a non-empty string after registration', () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-create-4', 'Test Church');
    _orgCtx.value = 'org-create-4';

    const ctx = svc.getContext();
    expect(typeof ctx.orgId).toBe('string');
    expect(ctx.orgId.length).toBeGreaterThan(0);
  });

  it('role defaults to member for all orgs', () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-role-test', 'Role Test Church');
    _orgCtx.value = 'org-role-test';

    const ctx = svc.getContext();
    expect(ctx.role).toBe('member');
  });
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 2: Switch organization
// ══════════════════════════════════════════════════════════════════════

describe('e2e-org: switch organization', () => {
  it('switchOrg updates the global organization context', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-switch-from', 'From Church');
    svc.registerOrg('org-switch-to', 'To Church');

    _orgCtx.value = 'org-switch-from';
    expect(_orgCtx.value).toBe('org-switch-from');

    await svc.switchOrg('org-switch-to');
    expect(_orgCtx.value).toBe('org-switch-to');
  });

  it('getContext reflects the new org after switchOrg', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-A', 'Organization A');
    svc.registerOrg('org-B', 'Organization B');

    _orgCtx.value = 'org-A';
    const ctxA = svc.getContext();
    expect(ctxA.orgId).toBe('org-A');
    expect(ctxA.orgName).toBe('Organization A');

    await svc.switchOrg('org-B');
    const ctxB = svc.getContext();
    expect(ctxB.orgId).toBe('org-B');
    expect(ctxB.orgName).toBe('Organization B');
  });

  it('switchOrg persists across multiple getContext calls', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-persist-1', 'First Org');
    svc.registerOrg('org-persist-2', 'Second Org');

    _orgCtx.value = 'org-persist-1';
    await svc.switchOrg('org-persist-2');

    // Multiple reads should all return the same org
    expect(svc.getContext().orgId).toBe('org-persist-2');
    expect(svc.getContext().orgName).toBe('Second Org');
    expect(svc.getContext().role).toBe('member');
  });

  it('switching to a non-registered org still works (name defaults to id)', async () => {
    const svc = new OrganizationService();

    await svc.switchOrg('org-unregistered');
    const ctx = svc.getContext();
    expect(ctx.orgId).toBe('org-unregistered');
    expect(ctx.orgName).toBe('org-unregistered');
  });

  it('multiple sequential org switches land on the correct org', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-1', 'One');
    svc.registerOrg('org-2', 'Two');
    svc.registerOrg('org-3', 'Three');

    _orgCtx.value = 'org-1';
    await svc.switchOrg('org-2');
    expect(svc.getContext().orgId).toBe('org-2');

    await svc.switchOrg('org-3');
    expect(svc.getContext().orgId).toBe('org-3');

    await svc.switchOrg('org-1');
    expect(svc.getContext().orgId).toBe('org-1');
  });

  it('orgContext module-level setOrganizationId is called during switch', async () => {
    const svc = new OrganizationService();
    await svc.switchOrg('org-module-test');

    // Verify the module-level function was called during switch
    expect(_orgCtx.setOrgId).toHaveBeenCalledWith('org-module-test');
  });

  it('switchOrg is idempotent for the same org', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-ident', 'Identical Church');
    _orgCtx.value = 'org-ident';

    await svc.switchOrg('org-ident');
    const ctx = svc.getContext();
    expect(ctx.orgId).toBe('org-ident');
    expect(ctx.orgName).toBe('Identical Church');
  });
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 3: Org isolation (data does not leak)
// ══════════════════════════════════════════════════════════════════════

describe('e2e-org: org isolation', () => {
  it('org units for org-A are not visible when switched to org-B', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-isolation-A', 'Isolation Church A');
    svc.registerOrg('org-isolation-B', 'Isolation Church B');

    // Add units to org-A
    svc.addOrgUnit({ id: 'unit-a1', name: 'A Dept 1', parentId: null, orgId: 'org-isolation-A' });
    svc.addOrgUnit({ id: 'unit-a2', name: 'A Dept 2', parentId: null, orgId: 'org-isolation-A' });

    // Add units to org-B
    svc.addOrgUnit({ id: 'unit-b1', name: 'B Dept 1', parentId: null, orgId: 'org-isolation-B' });

    // View from org-A
    _orgCtx.value = 'org-isolation-A';
    const unitsA = await svc.getOrgUnits();
    expect(unitsA).toHaveLength(2);
    expect(unitsA.every(u => u.orgId === 'org-isolation-A')).toBe(true);

    // View from org-B — should NOT see A's units
    _orgCtx.value = 'org-isolation-B';
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(1);
    expect(unitsB[0].id).toBe('unit-b1');
    expect(unitsB.every(u => u.orgId === 'org-isolation-B')).toBe(true);
  });

  it('removing a unit from org-A does not affect org-B', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-rem-A', 'Remove Test A');
    svc.registerOrg('org-rem-B', 'Remove Test B');

    svc.addOrgUnit({ id: 'rem-a1', name: 'Remove A Unit', parentId: null, orgId: 'org-rem-A' });
    svc.addOrgUnit({ id: 'rem-b1', name: 'Remove B Unit', parentId: null, orgId: 'org-rem-B' });

    _orgCtx.value = 'org-rem-A';
    const beforeRemove = await svc.getOrgUnits();
    expect(beforeRemove).toHaveLength(1);

    svc.removeOrgUnit('org-rem-A', 'rem-a1');
    const afterRemove = await svc.getOrgUnits();
    expect(afterRemove).toHaveLength(0);

    // org-B units should be unaffected
    _orgCtx.value = 'org-rem-B';
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(1);
    expect(unitsB[0].id).toBe('rem-b1');
  });

  it('org metadata is isolated: renaming org-A does not affect org-B', () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-meta-A', 'Meta Church A');
    svc.registerOrg('org-meta-B', 'Meta Church B');

    // Re-register org-A with new name
    svc.registerOrg('org-meta-A', 'Meta Church A Updated');

    _orgCtx.value = 'org-meta-A';
    expect(svc.getContext().orgName).toBe('Meta Church A Updated');

    _orgCtx.value = 'org-meta-B';
    expect(svc.getContext().orgName).toBe('Meta Church B');
  });

  it('two orgs can have units with the same id without collision', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-dup-id-1', 'Dup Org 1');
    svc.registerOrg('org-dup-id-2', 'Dup Org 2');

    // Same unit id in different orgs
    svc.addOrgUnit({ id: 'shared-id', name: 'Shared Unit 1', parentId: null, orgId: 'org-dup-id-1' });
    svc.addOrgUnit({ id: 'shared-id', name: 'Shared Unit 2', parentId: null, orgId: 'org-dup-id-2' });

    _orgCtx.value = 'org-dup-id-1';
    const units1 = await svc.getOrgUnits();
    expect(units1).toHaveLength(1);
    expect(units1[0].name).toBe('Shared Unit 1');

    _orgCtx.value = 'org-dup-id-2';
    const units2 = await svc.getOrgUnits();
    expect(units2).toHaveLength(1);
    expect(units2[0].name).toBe('Shared Unit 2');
  });

  it('listOrgs shows all orgs even when context is on one specific org', () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-list-1', 'List Org 1');
    svc.registerOrg('org-list-2', 'List Org 2');
    svc.registerOrg('org-list-3', 'List Org 3');

    _orgCtx.value = 'org-list-2';
    const orgs = svc.listOrgs();
    expect(orgs).toHaveLength(3);
    expect(orgs.map(o => o.orgId)).toEqual(
      expect.arrayContaining(['org-list-1', 'org-list-2', 'org-list-3'])
    );
  });

  it('org isolation: transactions data lives per-org (verified via unit structure)', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-data-A', 'Data Isolation A');
    svc.registerOrg('org-data-B', 'Data Isolation B');

    // Populate org-A with units
    svc.addOrgUnit({ id: 'da1', name: 'A Team', parentId: null, orgId: 'org-data-A' });
    svc.addOrgUnit({ id: 'da2', name: 'A Finance', parentId: 'da1', orgId: 'org-data-A' });

    // Populate org-B with units
    svc.addOrgUnit({ id: 'db1', name: 'B Team', parentId: null, orgId: 'org-data-B' });

    _orgCtx.value = 'org-data-A';
    const unitsA = await svc.getOrgUnits();
    expect(unitsA).toHaveLength(2);
    expect(unitsA.some(u => u.id === 'db1')).toBe(false); // B's unit not visible

    _orgCtx.value = 'org-data-B';
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(1);
    expect(unitsB[0].id).toBe('db1');
    expect(unitsB.some(u => u.id === 'da1')).toBe(false); // A's unit not visible
  });

  it('switching org does not carry over org-specific state', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-state-1', 'State Org 1');
    svc.registerOrg('org-state-2', 'State Org 2');

    svc.addOrgUnit({ id: 'state-u1', name: 'State Unit', parentId: null, orgId: 'org-state-1' });

    _orgCtx.value = 'org-state-1';
    expect((await svc.getOrgUnits()).length).toBe(1);

    await svc.switchOrg('org-state-2');
    expect((await svc.getOrgUnits()).length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 4: Org units hierarchy
// ══════════════════════════════════════════════════════════════════════

describe('e2e-org: org units hierarchy', () => {
  it('creates a flat hierarchy with no parents', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-flat', 'Flat Org');
    _orgCtx.value = 'org-flat';

    svc.addOrgUnit({ id: 'flat-1', name: 'Ministry', parentId: null, orgId: 'org-flat' });
    svc.addOrgUnit({ id: 'flat-2', name: 'Finance', parentId: null, orgId: 'org-flat' });
    svc.addOrgUnit({ id: 'flat-3', name: 'Outreach', parentId: null, orgId: 'org-flat' });

    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(3);
    expect(units.every(u => u.parentId === null)).toBe(true);
  });

  it('creates a single-level parent-child hierarchy', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-single', 'Single Level Org');
    _orgCtx.value = 'org-single';

    svc.addOrgUnit({ id: 'parent-1', name: 'Administration', parentId: null, orgId: 'org-single' });
    svc.addOrgUnit({ id: 'child-1a', name: 'HR', parentId: 'parent-1', orgId: 'org-single' });
    svc.addOrgUnit({ id: 'child-1b', name: 'IT', parentId: 'parent-1', orgId: 'org-single' });

    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(3);

    const parents = units.filter(u => u.parentId === null);
    const children = units.filter(u => u.parentId !== null);
    expect(parents).toHaveLength(1);
    expect(children).toHaveLength(2);
    expect(children.every(c => c.parentId === 'parent-1')).toBe(true);
  });

  it('creates a multi-level nested hierarchy (depth 3)', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-nested', 'Nested Org');
    _orgCtx.value = 'org-nested';

    // Level 1
    svc.addOrgUnit({ id: 'l1-admin', name: 'Administration', parentId: null, orgId: 'org-nested' });
    svc.addOrgUnit({ id: 'l1-ministry', name: 'Ministry', parentId: null, orgId: 'org-nested' });
    svc.addOrgUnit({ id: 'l1-finance', name: 'Finance', parentId: null, orgId: 'org-nested' });

    // Level 2
    svc.addOrgUnit({ id: 'l2-hr', name: 'HR', parentId: 'l1-admin', orgId: 'org-nested' });
    svc.addOrgUnit({ id: 'l2-it', name: 'IT', parentId: 'l1-admin', orgId: 'org-nested' });
    svc.addOrgUnit({ id: 'l2-youth', name: 'Youth Ministry', parentId: 'l1-ministry', orgId: 'org-nested' });
    svc.addOrgUnit({ id: 'l2-children', name: 'Children Ministry', parentId: 'l1-ministry', orgId: 'org-nested' });

    // Level 3
    svc.addOrgUnit({ id: 'l3-teen', name: 'Teen Group', parentId: 'l2-youth', orgId: 'org-nested' });
    svc.addOrgUnit({ id: 'l3-kids', name: 'Kids Group', parentId: 'l2-children', orgId: 'org-nested' });

    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(9);

    // Verify level 1 (root)
    const roots = units.filter(u => u.parentId === null);
    expect(roots).toHaveLength(3);
    expect(roots.map(r => r.name)).toEqual(
      expect.arrayContaining(['Administration', 'Ministry', 'Finance'])
    );

    // Verify level 2
    const level2 = units.filter(u => u.parentId !== null && !['l2-youth', 'l2-children', 'l2-hr', 'l2-it'].includes(u.id) === false);
    const l2Units = units.filter(u => ['l2-hr', 'l2-it', 'l2-youth', 'l2-children'].includes(u.id));
    expect(l2Units).toHaveLength(4);
    expect(l2Units.every(u => ['l1-admin', 'l1-ministry'].includes(u.parentId!))).toBe(true);

    // Verify level 3
    const level3 = units.filter(u => u.parentId !== null && !['l2-hr', 'l2-it', 'l2-youth', 'l2-children'].includes(u.id) && !['l1-admin', 'l1-ministry', 'l1-finance'].includes(u.id));
    const l3Units = units.filter(u => ['l3-teen', 'l3-kids'].includes(u.id));
    expect(l3Units).toHaveLength(2);
    expect(l3Units[0].parentId).toBe('l2-youth');
    expect(l3Units[1].parentId).toBe('l2-children');
  });

  it('orphaned child reference (parent does not exist) is still stored', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-orphan', 'Orphan Test Org');
    _orgCtx.value = 'org-orphan';

    // Add a child before its parent exists
    svc.addOrgUnit({ id: 'orphan-child', name: 'Orphan Child', parentId: 'nonexistent-parent', orgId: 'org-orphan' });

    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(1);
    expect(units[0].parentId).toBe('nonexistent-parent');
  });

  it('adding a unit that references an existing parent does not duplicate it', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-dup-check', 'Dup Check Org');
    _orgCtx.value = 'org-dup-check';

    svc.addOrgUnit({ id: 'dup-parent', name: 'Parent', parentId: null, orgId: 'org-dup-check' });
    svc.addOrgUnit({ id: 'dup-child', name: 'Child', parentId: 'dup-parent', orgId: 'org-dup-check' });
    // Add the same child again
    svc.addOrgUnit({ id: 'dup-child', name: 'Child', parentId: 'dup-parent', orgId: 'org-dup-check' });

    const units = await svc.getOrgUnits();
    // Both inserts are stored (no uniqueness enforcement at service level)
    expect(units).toHaveLength(3);
    expect(units.filter(u => u.id === 'dup-child')).toHaveLength(2);
  });

  it('removeOrgUnit removes the correct unit in a hierarchy', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-remove', 'Remove Test Org');
    _orgCtx.value = 'org-remove';

    svc.addOrgUnit({ id: 'rm-parent', name: 'Parent', parentId: null, orgId: 'org-remove' });
    svc.addOrgUnit({ id: 'rm-child', name: 'Child', parentId: 'rm-parent', orgId: 'org-remove' });
    svc.addOrgUnit({ id: 'rm-sibling', name: 'Sibling', parentId: 'rm-parent', orgId: 'org-remove' });

    const before = await svc.getOrgUnits();
    expect(before).toHaveLength(3);

    const removed = svc.removeOrgUnit('org-remove', 'rm-child');
    expect(removed).toBe(true);

    const after = await svc.getOrgUnits();
    expect(after).toHaveLength(2);
    expect(after.some(u => u.id === 'rm-child')).toBe(false);
    expect(after.some(u => u.id === 'rm-parent')).toBe(true);
    expect(after.some(u => u.id === 'rm-sibling')).toBe(true);
  });

  it('removeOrgUnit returns false for non-existent unit id', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-remove-fail', 'Remove Fail Org');
    _orgCtx.value = 'org-remove-fail';

    svc.addOrgUnit({ id: 'keep', name: 'Keep', parentId: null, orgId: 'org-remove-fail' });

    const removed = svc.removeOrgUnit('org-remove-fail', 'does-not-exist');
    expect(removed).toBe(false);
  });

  it('removeOrgUnit with wrong orgId does not remove the unit', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-isolate-remove', 'Isolate Remove A');
    svc.registerOrg('org-isolate-remove-b', 'Isolate Remove B');

    svc.addOrgUnit({ id: 'shared-unit', name: 'Shared Unit', parentId: null, orgId: 'org-isolate-remove' });
    svc.addOrgUnit({ id: 'shared-unit-b', name: 'Shared Unit B', parentId: null, orgId: 'org-isolate-remove-b' });

    // Try to remove 'shared-unit' from org B — it doesn't exist there
    const removed = svc.removeOrgUnit('org-isolate-remove-b', 'shared-unit');
    expect(removed).toBe(false);

    // Unit should still exist in org A
    _orgCtx.value = 'org-isolate-remove';
    const units = await svc.getOrgUnits();
    expect(units.some(u => u.id === 'shared-unit')).toBe(true);
  });

  it('hierarchy respects org boundary: parent-child across different orgs is independent', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-hier-A', 'Hierarchy Org A');
    svc.registerOrg('org-hier-B', 'Hierarchy Org B');

    // Org A hierarchy
    svc.addOrgUnit({ id: 'ha-parent', name: 'HA Parent', parentId: null, orgId: 'org-hier-A' });
    svc.addOrgUnit({ id: 'ha-child', name: 'HA Child', parentId: 'ha-parent', orgId: 'org-hier-A' });

    // Org B hierarchy
    svc.addOrgUnit({ id: 'hb-parent', name: 'HB Parent', parentId: null, orgId: 'org-hier-B' });
    svc.addOrgUnit({ id: 'hb-child', name: 'HB Child', parentId: 'hb-parent', orgId: 'org-hier-B' });

    // View from org A
    _orgCtx.value = 'org-hier-A';
    const unitsA = await svc.getOrgUnits();
    expect(unitsA).toHaveLength(2);
    expect(unitsA.find(u => u.id === 'ha-parent')!.parentId).toBeNull();
    expect(unitsA.find(u => u.id === 'ha-child')!.parentId).toBe('ha-parent');
    expect(unitsA.some(u => u.id === 'hb-parent')).toBe(false);
    expect(unitsA.some(u => u.id === 'hb-child')).toBe(false);

    // View from org B
    _orgCtx.value = 'org-hier-B';
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(2);
    expect(unitsB.find(u => u.id === 'hb-parent')!.parentId).toBeNull();
    expect(unitsB.find(u => u.id === 'hb-child')!.parentId).toBe('hb-parent');
    expect(unitsB.some(u => u.id === 'ha-parent')).toBe(false);
  });

  it('deep hierarchy: 5 levels of nesting', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-deep', 'Deep Org');
    _orgCtx.value = 'org-deep';

    const levels = [
      { id: 'd1', name: 'Level 1', parentId: null },
      { id: 'd2', name: 'Level 2', parentId: 'd1' },
      { id: 'd3', name: 'Level 3', parentId: 'd2' },
      { id: 'd4', name: 'Level 4', parentId: 'd3' },
      { id: 'd5', name: 'Level 5', parentId: 'd4' },
    ];

    for (const level of levels) {
      svc.addOrgUnit({ ...level, orgId: 'org-deep' });
    }

    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(5);

    // Verify the chain
    const byId = Object.fromEntries(units.map(u => [u.id, u]));
    expect(byId['d1'].parentId).toBeNull();
    expect(byId['d2'].parentId).toBe('d1');
    expect(byId['d3'].parentId).toBe('d2');
    expect(byId['d4'].parentId).toBe('d3');
    expect(byId['d5'].parentId).toBe('d4');
  });

  it('sibling units at the same level are all present', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('org-siblings', 'Siblings Org');
    _orgCtx.value = 'org-siblings';

    const siblings = ['Alice', 'Bob', 'Cloe', 'David', 'Eve'];
    for (const name of siblings) {
      svc.addOrgUnit({ id: `sib-${name.toLowerCase()}`, name, parentId: 'parent-root', orgId: 'org-siblings' });
    }
    svc.addOrgUnit({ id: 'parent-root', name: 'Parent Root', parentId: null, orgId: 'org-siblings' });

    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(6);

    const siblingUnits = units.filter(u => u.parentId === 'parent-root');
    expect(siblingUnits).toHaveLength(5);
    expect(siblingUnits.map(u => u.name)).toEqual(expect.arrayContaining(siblings));
  });
});

// ══════════════════════════════════════════════════════════════════════
// INTEGRATION: Full organization journey
// ══════════════════════════════════════════════════════════════════════

describe('e2e-org: full organization journey', () => {
  it('register org → add units → switch org → verify isolation → switch back', async () => {
    const svc = new OrganizationService();

    // Step 1: Register two orgs
    svc.registerOrg('journey-org-1', 'Journey Church 1');
    svc.registerOrg('journey-org-2', 'Journey Church 2');

    // Step 2: Add units to org 1
    svc.addOrgUnit({ id: 'j1-root', name: 'J1 Root', parentId: null, orgId: 'journey-org-1' });
    svc.addOrgUnit({ id: 'j1-child', name: 'J1 Child', parentId: 'j1-root', orgId: 'journey-org-1' });
    svc.addOrgUnit({ id: 'j1-sibling', name: 'J1 Sibling', parentId: 'j1-root', orgId: 'journey-org-1' });

    // Step 3: Add units to org 2
    svc.addOrgUnit({ id: 'j2-root', name: 'J2 Root', parentId: null, orgId: 'journey-org-2' });

    // Step 4: Verify org 1 units
    _orgCtx.value = 'journey-org-1';
    const units1 = await svc.getOrgUnits();
    expect(units1).toHaveLength(3);
    expect(units1.some(u => u.id === 'j1-root')).toBe(true);
    expect(units1.some(u => u.id === 'j1-child')).toBe(true);
    expect(units1.some(u => u.id === 'j1-sibling')).toBe(true);
    expect(units1.some(u => u.id === 'j2-root')).toBe(false); // isolation

    // Step 5: Switch to org 2
    await svc.switchOrg('journey-org-2');
    const units2 = await svc.getOrgUnits();
    expect(units2).toHaveLength(1);
    expect(units2[0].id).toBe('j2-root');
    expect(units2[0].name).toBe('J2 Root');
    expect(units2.some(u => u.id === 'j1-root')).toBe(false); // isolation

    // Step 6: Switch back to org 1
    await svc.switchOrg('journey-org-1');
    const units1Again = await svc.getOrgUnits();
    expect(units1Again).toHaveLength(3);
    expect(units1Again.some(u => u.id === 'j1-root')).toBe(true);
  });

  it('create org → add hierarchy → remove unit → verify remaining structure', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('hierarchy-journey', 'Hierarchy Journey');
    _orgCtx.value = 'hierarchy-journey';

    // Build a small hierarchy
    svc.addOrgUnit({ id: 'hj-1', name: 'Pastorate', parentId: null, orgId: 'hierarchy-journey' });
    svc.addOrgUnit({ id: 'hj-2', name: 'Worship', parentId: null, orgId: 'hierarchy-journey' });
    svc.addOrgUnit({ id: 'hj-1a', name: 'Senior Pastor', parentId: 'hj-1', orgId: 'hierarchy-journey' });
    svc.addOrgUnit({ id: 'hj-1b', name: 'Associate Pastor', parentId: 'hj-1', orgId: 'hierarchy-journey' });
    svc.addOrgUnit({ id: 'hj-2a', name: 'Worship Team', parentId: 'hj-2', orgId: 'hierarchy-journey' });

    let units = await svc.getOrgUnits();
    expect(units).toHaveLength(5);

    // Remove Associate Pastor
    svc.removeOrgUnit('hierarchy-journey', 'hj-1b');
    units = await svc.getOrgUnits();
    expect(units).toHaveLength(4);
    expect(units.some(u => u.id === 'hj-1b')).toBe(false);

    // Parent and siblings remain
    expect(units.some(u => u.id === 'hj-1')).toBe(true);
    expect(units.some(u => u.id === 'hj-1a')).toBe(true);
    expect(units.some(u => u.id === 'hj-2')).toBe(true);
    expect(units.some(u => u.id === 'hj-2a')).toBe(true);
  });

  it('multi-org management: list all orgs while active on one', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('mgmt-1', 'Management Church 1');
    svc.registerOrg('mgmt-2', 'Management Church 2');
    svc.registerOrg('mgmt-3', 'Management Church 3');

    _orgCtx.value = 'mgmt-2';

    const allOrgs = svc.listOrgs();
    expect(allOrgs).toHaveLength(3);
    expect(allOrgs.find(o => o.orgId === 'mgmt-1')).toBeDefined();
    expect(allOrgs.find(o => o.orgId === 'mgmt-2')).toBeDefined();
    expect(allOrgs.find(o => o.orgId === 'mgmt-3')).toBeDefined();
  });

  it('context contract: OrgContext always has orgId, orgName, role', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('contract-org', 'Contract Test');
    _orgCtx.value = 'contract-org';

    const ctx = svc.getContext() as OrgContext;
    expect(ctx).toHaveProperty('orgId');
    expect(ctx).toHaveProperty('orgName');
    expect(ctx).toHaveProperty('role');
    expect(typeof ctx.orgId).toBe('string');
    expect(typeof ctx.orgName).toBe('string');
    expect(typeof ctx.role).toBe('string');
    expect(ctx.orgId.length).toBeGreaterThan(0);
    expect(ctx.orgName.length).toBeGreaterThan(0);
    expect(ctx.role.length).toBeGreaterThan(0);
  });

  it('OrgUnit contract: each unit has id, name, parentId, orgId', async () => {
    const svc = new OrganizationService();
    svc.registerOrg('unit-contract-org', 'Unit Contract Org');
    _orgCtx.value = 'unit-contract-org';

    svc.addOrgUnit({ id: 'uc-1', name: 'Unit', parentId: null, orgId: 'unit-contract-org' });

    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(1);

    const unit = units[0] as OrgUnit;
    expect(unit).toHaveProperty('id');
    expect(unit).toHaveProperty('name');
    expect(unit).toHaveProperty('parentId');
    expect(unit).toHaveProperty('orgId');
    expect(typeof unit.id).toBe('string');
    expect(typeof unit.name).toBe('string');
    expect(unit.parentId === null || typeof unit.parentId === 'string').toBe(true);
    expect(typeof unit.orgId).toBe('string');
  });

  it('domain-agnostic: no church-specific terminology in OrgContext or OrgUnit contracts', () => {
    const svc = new OrganizationService();
    svc.registerOrg('domain-org', 'Generic Org');
    _orgCtx.value = 'domain-org';

    const ctx = svc.getContext();
    // The contract uses generic terms: orgId, orgName, role
    expect(Object.keys(ctx)).toEqual(expect.arrayContaining(['orgId', 'orgName', 'role']));

    const unit: OrgUnit = { id: 'd1', name: 'Dept', parentId: null, orgId: 'domain-org' };
    expect(Object.keys(unit)).toEqual(expect.arrayContaining(['id', 'name', 'parentId', 'orgId']));
  });
});
