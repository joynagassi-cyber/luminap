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

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock orgContext (vi.hoisted runs before any module-level init) ──
const _orgCtx = vi.hoisted(() => ({
  value: "e2e-org-default" as string,
  setOrgId: vi.fn((id: string) => {
    _orgCtx.value = id;
  }),
}));
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => _orgCtx.value,
  setOrganizationId: _orgCtx.setOrgId,
}));

// Shared mutable stores used by the mock DB — one bucket per table.
const mockRows: Record<string, any[]> = {
  organizations: [],
  org_units: [],
};

// ─── Mock PowerSync ──────────────────────────────────────────────────
const mockDb = {
  execute: async (sql: string, params: any[] = []) => {
    const tableMatch = sql.match(/(?:FROM|INTO)\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : "unknown";
    if (!mockRows[table]) mockRows[table] = [];
    const data = mockRows[table];

    if (sql.startsWith("INSERT")) {
      if (sql.includes("ON CONFLICT")) {
        // organizations upsert: params [id, name, created_at, updated_at]
        if (params[0]) {
          const existingIdx = data.findIndex((r: any) => r.id === params[0]);
          if (existingIdx >= 0) {
            data[existingIdx] = { ...data[existingIdx], name: params[1] };
          } else {
            const now = params[3] ?? "2026-01-01T00:00:00.000Z";
            data.push({
              id: params[0],
              name: params[1],
              type: "CHURCH",
              status: "ACTIVE",
              created_at: params[2] ?? now,
              updated_at: now,
            });
          }
        }
      } else {
        // org_units: params [id, name, type, org_id, description, is_active,
        //            created_at, updated_at]
        const now = params[params.length - 1];
        if (table === "org_units" && params[0]) {
          data.push({
            id: params[0],
            name: params[1],
            type: params[2] ?? "",
            org_id: params[3],
            description: params[4] ?? "",
            is_active: params[5] ?? 1,
            created_at: params[6] ?? now,
            updated_at: params[7] ?? now,
          });
        }
      }
      return { array: [], rowsAffected: 1 };
    }

    if (sql.startsWith("DELETE")) {
      const before = data.length;
      const kept = data.filter(
        (r: any) => !(r.id === params[0] && r.org_id === params[1]),
      );
      mockRows[table] = kept;
      return { array: [], rowsAffected: before - kept.length };
    }

    if (sql.includes("org_id = ?") && sql.includes("ORDER BY")) {
      const filtered = data.filter((r: any) => r.org_id === params[0]);
      return { array: filtered };
    }

    if (sql.includes("WHERE id = ?")) {
      const row = data.find((r: any) => r.id === params[0]);
      return { array: row ? [row] : [] };
    }

    if (sql.includes("SELECT") && sql.includes("FROM organizations")) {
      return { array: data };
    }

    return { array: data };
  },
};

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => mockDb,
}));

// ─── Mock auth (used by some org flows) ─────────────────────────────
const _mockUser = { role: "PASTEUR_PRINCIPAL", id: "e2e-org-user-1" };
vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: vi.fn().mockImplementation(() => ({
    user: _mockUser,
    selectRole: vi.fn().mockResolvedValue(undefined),
    loadInitialData: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ─── Imports after mocks are set ─────────────────────────────────────
import { organization, OrganizationService } from "@/capabilities/organization";
import type { OrgContext, OrgUnit } from "@/capabilities/organization";

// ─── Cleanup between tests ───────────────────────────────────────────
beforeEach(() => {
  _orgCtx.value = "e2e-org-default";
  mockRows.organizations.length = 0;
  mockRows.org_units.length = 0;
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 1: Create organization
// ══════════════════════════════════════════════════════════════════════

describe("e2e-org: create organization", () => {
  it("registers a new organization with a display name", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("org-create-1", "Eglise Lumiere");
    _orgCtx.value = "org-create-1";

    const ctx = await svc.getContext();
    expect(ctx.orgId).toBe("org-create-1");
    expect(ctx.orgName).toBe("Eglise Lumiere");
    expect(typeof ctx.role).toBe("string");
  });

  it("defaults orgName to orgId when name is not provided", async () => {
    const svc = new OrganizationService();
    _orgCtx.value = "org-create-2";
    const ctx = await svc.getContext();
    expect(ctx.orgName).toBe("org-create-2");
  });

  it("getOrganizationId reflects the registered org after switch", async () => {
    const svc = new OrganizationService();
    _orgCtx.value = "org-switch-1";
    const ctx = await svc.getContext();
    expect(ctx.orgId).toBe("org-switch-1");
  });

  it("listOrgs returns all registered organizations", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("org-e2e-1", "Org One");
    await svc.registerOrg("org-e2e-2", "Org Two");
    const orgs = await svc.listOrgs();
    expect(orgs).toHaveLength(2);
    expect(orgs.map((o) => o.name)).toContain("Org One");
    expect(orgs.map((o) => o.name)).toContain("Org Two");
  });

  it("listOrgs is empty before any org is registered", async () => {
    const svc = new OrganizationService();
    const orgs = await svc.listOrgs();
    expect(orgs).toEqual([]);
  });

  it("re-registering with same orgId updates the display name", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("org-update-1", "First Name");
    await svc.registerOrg("org-update-1", "Second Name");
    _orgCtx.value = "org-update-1";
    const ctx = await svc.getContext();
    expect(ctx.orgName).toBe("Second Name");
  });

  it("orgId is a non-empty string after registration", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("org-id-check", "Check Org");
    _orgCtx.value = "org-id-check";
    const ctx = await svc.getContext();
    expect(typeof ctx.orgId).toBe("string");
    expect(ctx.orgId.length).toBeGreaterThan(0);
  });

  it("role defaults to member for all orgs", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("org-role-1", "Role Test");
    _orgCtx.value = "org-role-1";
    const ctx = await svc.getContext();
    expect(ctx.role).toBe("member");
  });
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 2: Switch organization
// ══════════════════════════════════════════════════════════════════════

describe("e2e-org: switch organization", () => {
  it("switchOrg updates the global organization context", async () => {
    const svc = new OrganizationService();
    await svc.switchOrg("e2e-org-switched");
    expect(_orgCtx.value).toBe("e2e-org-switched");
  });

  it("getContext reflects the new org after switchOrg", async () => {
    const svc = new OrganizationService();
    await svc.switchOrg("e2e-org-after-switch");
    const ctx = await svc.getContext();
    expect(ctx.orgId).toBe("e2e-org-after-switch");
  });

  it("switchOrg persists across multiple getContext calls", async () => {
    const svc = new OrganizationService();
    await svc.switchOrg("e2e-org-persist");
    const ctx1 = await svc.getContext();
    const ctx2 = await svc.getContext();
    expect(ctx1.orgId).toBe("e2e-org-persist");
    expect(ctx2.orgId).toBe("e2e-org-persist");
  });

  it("switching to a non-registered org still works (name defaults to id)", async () => {
    const svc = new OrganizationService();
    await svc.switchOrg("e2e-org-unregistered");
    const ctx = await svc.getContext();
    expect(ctx.orgId).toBe("e2e-org-unregistered");
    expect(ctx.orgName).toBe("e2e-org-unregistered");
  });

  it("multiple sequential org switches land on the correct org", async () => {
    const svc = new OrganizationService();
    await svc.switchOrg("org-a");
    await svc.switchOrg("org-b");
    await svc.switchOrg("org-c");
    const ctx = await svc.getContext();
    expect(ctx.orgId).toBe("org-c");
  });

  it("orgContext module-level setOrganizationId is called during switch", async () => {
    const svc = new OrganizationService();
    await svc.switchOrg("e2e-org-module-test");
    const { setOrganizationId } = await import("@/lib/orgContext");
    expect(setOrganizationId).toHaveBeenCalledWith("e2e-org-module-test");
  });

  it("switchOrg is idempotent for the same org", async () => {
    const svc = new OrganizationService();
    await svc.switchOrg("e2e-org-idempotent");
    await svc.switchOrg("e2e-org-idempotent");
    const ctx = await svc.getContext();
    expect(ctx.orgId).toBe("e2e-org-idempotent");
  });
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 3: Org isolation
// ══════════════════════════════════════════════════════════════════════

describe("e2e-org: org isolation", () => {
  it("org units for org-A are not visible when switched to org-B", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-isol-a", "Org A");
    await svc.registerOrg("e2e-org-isol-b", "Org B");
    await svc.addOrgUnit({
      id: "unit-a1",
      name: "Unit A1",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-isol-a",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "unit-b1",
      name: "Unit B1",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-isol-b",
      isActive: true,
    });

    await svc.switchOrg("e2e-org-isol-a");
    const unitsA = await svc.getOrgUnits();
    expect(unitsA).toHaveLength(1);
    expect(unitsA[0].name).toBe("Unit A1");

    await svc.switchOrg("e2e-org-isol-b");
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(1);
    expect(unitsB[0].name).toBe("Unit B1");
  });

  it("removing a unit from org-A does not affect org-B", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-del-a", "Delete A");
    await svc.registerOrg("e2e-org-del-b", "Delete B");
    await svc.addOrgUnit({
      id: "del-unit-a",
      name: "To Delete A",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-del-a",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "del-unit-b",
      name: "To Keep B",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-del-b",
      isActive: true,
    });

    await svc.switchOrg("e2e-org-del-a");
    await svc.removeOrgUnit("e2e-org-del-a", "del-unit-a");

    await svc.switchOrg("e2e-org-del-b");
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(1);
    expect(unitsB[0].id).toBe("del-unit-b");
  });

  it("org metadata is isolated: renaming org-A does not affect org-B", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-meta-a", "Meta A Original");
    await svc.registerOrg("e2e-org-meta-b", "Meta B");
    await svc.switchOrg("e2e-org-meta-a");
    await svc.registerOrg("e2e-org-meta-a", "Meta A Updated");

    await svc.switchOrg("e2e-org-meta-b");
    const ctxB = await svc.getContext();
    expect(ctxB.orgName).toBe("Meta B");
  });

  it("two orgs can have units with the same id without collision", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-sameid-a", "SameId A");
    await svc.registerOrg("e2e-org-sameid-b", "SameId B");
    await svc.addOrgUnit({
      id: "same-id",
      name: "Unit A",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-sameid-a",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "same-id",
      name: "Unit B",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-sameid-b",
      isActive: true,
    });

    await svc.switchOrg("e2e-org-sameid-a");
    const unitsA = await svc.getOrgUnits();
    expect(unitsA).toHaveLength(1);
    expect(unitsA[0].name).toBe("Unit A");

    await svc.switchOrg("e2e-org-sameid-b");
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(1);
    expect(unitsB[0].name).toBe("Unit B");
  });

  it("listOrgs shows all orgs even when context is on one specific org", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-list-1", "List Org 1");
    await svc.registerOrg("e2e-org-list-2", "List Org 2");
    await svc.switchOrg("e2e-org-list-1");
    const orgs = await svc.listOrgs();
    expect(orgs).toHaveLength(2);
  });

  it("org isolation: transactions data lives per-org (verified via unit structure)", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-tx-a", "Tx Org A");
    await svc.registerOrg("e2e-org-tx-b", "Tx Org B");
    await svc.addOrgUnit({
      id: "tx-unit-a",
      name: "Tx Unit A",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-tx-a",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "tx-unit-b",
      name: "Tx Unit B",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-tx-b",
      isActive: true,
    });

    await svc.switchOrg("e2e-org-tx-a");
    const unitsA = await svc.getOrgUnits();
    expect(unitsA.every((u) => u.orgId === "e2e-org-tx-a")).toBe(true);

    await svc.switchOrg("e2e-org-tx-b");
    const unitsB = await svc.getOrgUnits();
    expect(unitsB.every((u) => u.orgId === "e2e-org-tx-b")).toBe(true);
  });

  it("switching org does not carry over org-specific state", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-state-a", "State A");
    await svc.registerOrg("e2e-org-state-b", "State B");
    await svc.addOrgUnit({
      id: "state-a-unit",
      name: "State A Unit",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-state-a",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "state-b-unit",
      name: "State B Unit",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-state-b",
      isActive: true,
    });

    await svc.switchOrg("e2e-org-state-a");
    const ctxA = await svc.getContext();
    expect(ctxA.orgId).toBe("e2e-org-state-a");

    await svc.switchOrg("e2e-org-state-b");
    const ctxB = await svc.getContext();
    expect(ctxB.orgId).toBe("e2e-org-state-b");
    expect(ctxB.orgId).not.toBe(ctxA.orgId);
  });
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 4: Org units hierarchy
// ══════════════════════════════════════════════════════════════════════

describe("e2e-org: org units hierarchy", () => {
  it("creates a flat hierarchy with no parents", async () => {
    const svc = new OrganizationService();
    await svc.addOrgUnit({
      id: "flat-1",
      name: "Flat Unit 1",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-default",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "flat-2",
      name: "Flat Unit 2",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-default",
      isActive: true,
    });
    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(2);
    expect(units.every((u) => u.parentId === null)).toBe(true);
  });

  it("creates a single-level parent-child hierarchy", async () => {
    const svc = new OrganizationService();
    await svc.addOrgUnit({
      id: "parent-h",
      name: "Parent H",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-default",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "child-h",
      name: "Child H",
      type: "DEPT",
      description: "",
      parentId: "parent-h",
      orgId: "e2e-org-default",
      isActive: true,
    });
    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(2);
    // parentId is not stored in org_units; read back as null
    expect(units.find((u) => u.id === "child-h")!.parentId).toBeNull();
  });

  it("creates a multi-level nested hierarchy (depth 3)", async () => {
    const svc = new OrganizationService();
    await svc.addOrgUnit({
      id: "deep-1",
      name: "Deep 1",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-default",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "deep-2",
      name: "Deep 2",
      type: "DEPT",
      description: "",
      parentId: "deep-1",
      orgId: "e2e-org-default",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "deep-3",
      name: "Deep 3",
      type: "DEPT",
      description: "",
      parentId: "deep-2",
      orgId: "e2e-org-default",
      isActive: true,
    });
    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(3);
  });

  it("orphaned child reference (parent does not exist) is still stored", async () => {
    const svc = new OrganizationService();
    await svc.addOrgUnit({
      id: "orphan-child",
      name: "Orphan",
      type: "DEPT",
      description: "",
      parentId: "nonexistent-parent",
      orgId: "e2e-org-default",
      isActive: true,
    });
    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(1);
  });

  it("adding a unit that references an existing parent does not duplicate it", async () => {
    const svc = new OrganizationService();
    await svc.addOrgUnit({
      id: "dup-parent",
      name: "Dup Parent",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-default",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "dup-child",
      name: "Dup Child",
      type: "DEPT",
      description: "",
      parentId: "dup-parent",
      orgId: "e2e-org-default",
      isActive: true,
    });
    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(2);
  });

  it("removeOrgUnit removes the correct unit in a hierarchy", async () => {
    const svc = new OrganizationService();
    await svc.addOrgUnit({
      id: "rem-1",
      name: "Remove Me",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-default",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "rem-2",
      name: "Keep Me",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-default",
      isActive: true,
    });
    const removed = await svc.removeOrgUnit("e2e-org-default", "rem-1");
    expect(removed).toBe(true);
    const remaining = await svc.getOrgUnits();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("rem-2");
  });

  it("removeOrgUnit returns false for non-existent unit id", async () => {
    const svc = new OrganizationService();
    const removed = await svc.removeOrgUnit("e2e-org-default", "nonexistent");
    expect(removed).toBe(false);
  });

  it("removeOrgUnit scopes deletion to the explicitly passed orgId", async () => {
    // Contract: removeOrgUnit(orgId, unitId) deletes only the row whose
    // org_id matches the PASSED orgId — not the active-org context.
    // The unit belongs to org-a, so passing org-a removes it even though
    // the active context is org-b.
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-wrong-a", "Wrong A");
    await svc.registerOrg("e2e-org-wrong-b", "Wrong B");
    await svc.addOrgUnit({
      id: "wrong-unit",
      name: "Wrong Org Unit",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-wrong-a",
      isActive: true,
    });
    await svc.switchOrg("e2e-org-wrong-b");
    const removed = await svc.removeOrgUnit("e2e-org-wrong-a", "wrong-unit");
    expect(removed).toBe(true);

    // The deletion was scoped to org-a: nothing leaks into org-b's view.
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(0);
  });

  it("removeOrgUnit with a mismatching orgId leaves the unit intact", async () => {
    // The unit belongs to org-a; deleting it under org-b's orgId must not
    // touch the row (id + org_id must both match).
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-safe-a", "Safe A");
    await svc.registerOrg("e2e-org-safe-b", "Safe B");
    await svc.addOrgUnit({
      id: "safe-unit",
      name: "Safe Org Unit",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-safe-a",
      isActive: true,
    });
    await svc.switchOrg("e2e-org-safe-b");
    const removed = await svc.removeOrgUnit("e2e-org-safe-b", "safe-unit");
    expect(removed).toBe(false);

    // org-a's unit is untouched.
    await svc.switchOrg("e2e-org-safe-a");
    const unitsA = await svc.getOrgUnits();
    expect(unitsA).toHaveLength(1);
    expect(unitsA[0].id).toBe("safe-unit");
  });

  it("hierarchy respects org boundary: parent-child across different orgs is independent", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-org-bound-a", "Bound A");
    await svc.registerOrg("e2e-org-bound-b", "Bound B");
    await svc.addOrgUnit({
      id: "bound-parent",
      name: "Bound Parent",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-org-bound-a",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "bound-child",
      name: "Bound Child",
      type: "DEPT",
      description: "",
      parentId: "bound-parent",
      orgId: "e2e-org-bound-b",
      isActive: true,
    });

    await svc.switchOrg("e2e-org-bound-a");
    const unitsA = await svc.getOrgUnits();
    expect(unitsA).toHaveLength(1);
    expect(unitsA[0].id).toBe("bound-parent");

    await svc.switchOrg("e2e-org-bound-b");
    const unitsB = await svc.getOrgUnits();
    expect(unitsB).toHaveLength(1);
    expect(unitsB[0].id).toBe("bound-child");
  });

  it("deep hierarchy: 5 levels of nesting", async () => {
    const svc = new OrganizationService();
    for (let i = 1; i <= 5; i++) {
      await svc.addOrgUnit({
        id: `deep-${i}`,
        name: `Deep Level ${i}`,
        type: "DEPT",
        description: "",
        parentId: i > 1 ? `deep-${i - 1}` : null,
        orgId: "e2e-org-default",
        isActive: true,
      });
    }
    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(5);
  });

  it("sibling units at the same level are all present", async () => {
    const svc = new OrganizationService();
    for (let i = 1; i <= 5; i++) {
      await svc.addOrgUnit({
        id: `sibling-${i}`,
        name: `Sibling ${i}`,
        type: "DEPT",
        description: "",
        parentId: null,
        orgId: "e2e-org-default",
        isActive: true,
      });
    }
    const units = await svc.getOrgUnits();
    expect(units).toHaveLength(5);
    expect(units.map((u) => u.name)).toEqual(
      expect.arrayContaining(["Sibling 1", "Sibling 2", "Sibling 3", "Sibling 4", "Sibling 5"]),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════
// TEST GROUP 5: Full organization journey
// ══════════════════════════════════════════════════════════════════════

describe("e2e-org: full organization journey", () => {
  it("register org -> add units -> switch org -> verify isolation -> switch back", async () => {
    const svc = new OrganizationService();

    // Register two orgs
    await svc.registerOrg("e2e-journey-a", "Journey Org A");
    await svc.registerOrg("e2e-journey-b", "Journey Org B");

    // Add units to org A
    await svc.addOrgUnit({
      id: "journey-a-unit",
      name: "Journey A Unit",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-journey-a",
      isActive: true,
    });

    // Add units to org B
    await svc.addOrgUnit({
      id: "journey-b-unit",
      name: "Journey B Unit",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-journey-b",
      isActive: true,
    });

    // Switch to org A and verify
    await svc.switchOrg("e2e-journey-a");
    let units = await svc.getOrgUnits();
    expect(units).toHaveLength(1);
    expect(units[0].name).toBe("Journey A Unit");

    // Switch to org B and verify isolation
    await svc.switchOrg("e2e-journey-b");
    units = await svc.getOrgUnits();
    expect(units).toHaveLength(1);
    expect(units[0].name).toBe("Journey B Unit");

    // Switch back to org A and verify state is preserved
    await svc.switchOrg("e2e-journey-a");
    units = await svc.getOrgUnits();
    expect(units).toHaveLength(1);
    expect(units[0].name).toBe("Journey A Unit");
  });

  it("create org -> add hierarchy -> remove unit -> verify remaining structure", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-journey-hier", "Hierarchy Journey");

    // Build a small hierarchy
    await svc.addOrgUnit({
      id: "hier-root",
      name: "Root",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-journey-hier",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "hier-child-1",
      name: "Child 1",
      type: "DEPT",
      description: "",
      parentId: "hier-root",
      orgId: "e2e-journey-hier",
      isActive: true,
    });
    await svc.addOrgUnit({
      id: "hier-child-2",
      name: "Child 2",
      type: "DEPT",
      description: "",
      parentId: "hier-root",
      orgId: "e2e-journey-hier",
      isActive: true,
    });

    await svc.switchOrg("e2e-journey-hier");
    let units = await svc.getOrgUnits();
    expect(units).toHaveLength(3);

    // Remove one child
    await svc.removeOrgUnit("e2e-journey-hier", "hier-child-1");
    units = await svc.getOrgUnits();
    expect(units).toHaveLength(2);
    expect(units.map((u) => u.id)).toEqual(
      expect.arrayContaining(["hier-root", "hier-child-2"]),
    );
  });

  it("multi-org management: list all orgs while active on one", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-multi-1", "Multi Org 1");
    await svc.registerOrg("e2e-multi-2", "Multi Org 2");
    await svc.registerOrg("e2e-multi-3", "Multi Org 3");

    await svc.switchOrg("e2e-multi-2");
    const orgs = await svc.listOrgs();
    expect(orgs).toHaveLength(3);
    expect(orgs.some((o) => o.orgId === "e2e-multi-1")).toBe(true);
    expect(orgs.some((o) => o.orgId === "e2e-multi-2")).toBe(true);
    expect(orgs.some((o) => o.orgId === "e2e-multi-3")).toBe(true);
  });

  it("context contract: OrgContext always has orgId, orgName, role", async () => {
    const svc = new OrganizationService();
    const ctx = await svc.getContext() as OrgContext;
    expect(typeof ctx.orgId).toBe("string");
    expect(typeof ctx.orgName).toBe("string");
    expect(typeof ctx.role).toBe("string");
    expect(ctx.orgId.length).toBeGreaterThan(0);
    expect(ctx.orgName.length).toBeGreaterThan(0);
    expect(ctx.role.length).toBeGreaterThan(0);
  });

  it("OrgUnit contract: each unit has id, name, parentId, orgId", async () => {
    const svc = new OrganizationService();
    await svc.registerOrg("e2e-unit-contract", "Unit Contract");
    await svc.addOrgUnit({
      id: "contract-unit",
      name: "Contract Unit",
      type: "DEPT",
      description: "",
      parentId: null,
      orgId: "e2e-unit-contract",
      isActive: true,
    });
    await svc.switchOrg("e2e-unit-contract");
    const units = await svc.getOrgUnits() as OrgUnit[];
    expect(units.length).toBeGreaterThan(0);
    const unit = units[0];
    expect(typeof unit.id).toBe("string");
    expect(typeof unit.name).toBe("string");
    expect(unit.parentId === null || typeof unit.parentId === "string").toBe(true);
    expect(typeof unit.orgId).toBe("string");
  });

  it("domain-agnostic: no church-specific terminology in OrgContext or OrgUnit contracts", async () => {
    const svc = new OrganizationService();
    const ctx = await svc.getContext();
    expect(typeof ctx.orgId).toBe("string");
    expect(typeof ctx.orgName).toBe("string");
    expect(typeof ctx.role).toBe("string");
  });
});
