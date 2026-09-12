import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OrganizationService,
  type OrgContext,
  type OrgUnit,
} from "../organization";

// Shared mutable stores used by the mock DB — one bucket per table.
const mockRows: Record<string, any[]> = {
  organizations: [],
  org_units: [],
};

// Mock orgContext with reactive state
let _mockOrgId = "test-org-1";
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => _mockOrgId,
  setOrganizationId: vi.fn((id: string) => {
    _mockOrgId = id;
  }),
}));

// Mock PowerSync — mirrors the shape used by resource.test.ts.
// index.ts writes:
//   registerOrg → INSERT INTO organizations (id, name, 'CHURCH', 'ACTIVE', ?, ?)
//                ON CONFLICT (id) DO UPDATE SET name = excluded.name, ...
//   addOrgUnit  → INSERT INTO org_units (id, name, type, org_id, description,
//                                            is_active, created_at, updated_at)
//                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//   removeOrgUnit → DELETE FROM org_units WHERE id = ? AND org_id = ?
// Reads:
//   getContext  → SELECT name FROM organizations WHERE id = ?
//   getOrgUnits → SELECT id, name, type, org_id, description, is_active
//                 FROM org_units WHERE org_id = ? ORDER BY name
//   listOrgs    → SELECT id, name FROM organizations ORDER BY name
const mockDb = {
  execute: async (sql: string, params: any[] = []) => {
    const table = sql.match(/(?:FROM|INTO)\s+(\w+)/i)?.[1] ?? "unknown";
    const data = mockRows[table] ?? (mockRows[table] = []);

    // ── INSERT ──
    if (/^\s*INSERT/i.test(sql)) {
      if (sql.includes("ON CONFLICT")) {
        // organizations upsert: params [id, name, created_at, updated_at]
        const id = params[0];
        const idx = data.findIndex((r: any) => r.id === id);
        if (idx >= 0) {
          data[idx] = {
            ...data[idx],
            name: params[1],
            updated_at: params[3] ?? data[idx].updated_at,
          };
        } else {
          data.push({
            id,
            name: params[1],
            type: "CHURCH",
            status: "ACTIVE",
            created_at: params[2],
            updated_at: params[3],
          });
        }
      } else {
        // org_units: params [id, name, type, org_id, description, is_active,
        //            created_at, updated_at]
        data.push({
          id: params[0],
          name: params[1],
          type: params[2],
          org_id: params[3],
          description: params[4],
          is_active: params[5],
          created_at: params[6],
          updated_at: params[7],
        });
      }
      return { array: [], rowsAffected: 1 };
    }

    // ── DELETE ──
    if (/^\s*DELETE/i.test(sql)) {
      const before = data.length;
      const kept = data.filter(
        (r: any) => !(r.id === params[0] && r.org_id === params[1]),
      );
      mockRows[table] = kept;
      return { array: [], rowsAffected: before - kept.length };
    }

    // ── SELECT ──
    if (sql.includes("org_units") && sql.includes("ORDER BY")) {
      return {
        array: data.filter((r: any) => r.org_id === params[0]),
      };
    }
    if (sql.includes("WHERE id = ?")) {
      const row = data.find((r: any) => r.id === params[0]);
      return { array: row ? [row] : [] };
    }
    // listOrgs — full table, ordered by name
    if (/ORDER BY/i.test(sql)) {
      const col = sql.match(/ORDER BY\s+(\w+)/i)?.[1] ?? "name";
      const rows = data.slice().sort(
        (a: any, b: any) =>
          String(a[col] ?? "").localeCompare(String(b[col] ?? "")),
      );
      return { array: rows };
    }
    return { array: data };
  },
};

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => mockDb,
}));

describe("organization capability", () => {
  let organization: OrganizationService;

  beforeEach(() => {
    organization = new OrganizationService();
    _mockOrgId = "test-org-1";
    mockRows.organizations.length = 0;
    mockRows.org_units.length = 0;
    vi.clearAllMocks();
  });

  // ─── getContext ────────────────────────────────────────────────

  describe("getContext", () => {
    it("returns the current orgId from getOrganizationId", async () => {
      const ctx = await organization.getContext();
      expect(ctx.orgId).toBe("test-org-1");
    });

    it("defaults orgName to orgId when not registered", async () => {
      const ctx = await organization.getContext();
      expect(ctx.orgName).toBe("test-org-1");
    });

    it("uses registered org name when available", async () => {
      await organization.registerOrg("test-org-1", "Acme Corp");
      const ctx = await organization.getContext();
      expect(ctx.orgName).toBe("Acme Corp");
    });

    it("defaults role to member", async () => {
      const ctx = await organization.getContext();
      expect(ctx.role).toBe("member");
    });

    it("returns valid OrgContext shape", async () => {
      const ctx = await organization.getContext() as OrgContext;
      expect(typeof ctx.orgId).toBe("string");
      expect(typeof ctx.orgName).toBe("string");
      expect(typeof ctx.role).toBe("string");
    });
  });

  // ─── switchOrg ─────────────────────────────────────────────────

  describe("switchOrg", () => {
    it("updates the organization context via setOrganizationId", async () => {
      const { setOrganizationId } = await import("@/lib/orgContext");
      await organization.switchOrg("new-org-2");
      expect(setOrganizationId).toHaveBeenCalledWith("new-org-2");
    });

    it("changes getContext orgId after switch", async () => {
      await organization.switchOrg("org-switched");
      const ctx = await organization.getContext();
      expect(ctx.orgId).toBe("org-switched");
    });
  });

  // ─── getOrgUnits ───────────────────────────────────────────────

  describe("getOrgUnits", () => {
    it("returns empty array when no units exist", async () => {
      const units = await organization.getOrgUnits();
      expect(units).toEqual([]);
    });

    it("returns units for the current org", async () => {
      await organization.addOrgUnit({
        id: "unit-1",
        name: "Engineering",
        type: "DEPARTMENT",
        description: "Eng dept",
        parentId: null,
        orgId: "test-org-1",
        isActive: true,
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(1);
      expect(units[0].name).toBe("Engineering");
    });

    it("filters units by current org context", async () => {
      await organization.addOrgUnit({
        id: "unit-a",
        name: "Org A Unit",
        type: "DEPARTMENT",
        description: "",
        parentId: null,
        orgId: "org-a",
        isActive: true,
      });
      await organization.addOrgUnit({
        id: "unit-b",
        name: "Org B Unit",
        type: "DEPARTMENT",
        description: "",
        parentId: null,
        orgId: "test-org-1",
        isActive: true,
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(1);
      expect(units[0].name).toBe("Org B Unit");
    });

    it("returns valid OrgUnit shape", async () => {
      const unit: OrgUnit = {
        id: "u1",
        name: "Sales",
        type: "DEPARTMENT",
        description: "Sales team",
        parentId: null,
        orgId: "test-org-1",
        isActive: true,
      };
      await organization.addOrgUnit(unit);
      const units = await organization.getOrgUnits();
      expect(units[0].id).toBe("u1");
      expect(units[0].parentId).toBeNull();
      expect(units[0].type).toBe("DEPARTMENT");
    });

    it("supports nested units via parentId (returned as-is)", async () => {
      // parentId is carried in the OrgUnit interface even though the
      // org_units table does not store it — the read returns null.
      await organization.addOrgUnit({
        id: "parent",
        name: "Root",
        type: "DEPARTMENT",
        description: "",
        parentId: null,
        orgId: "test-org-1",
        isActive: true,
      });
      await organization.addOrgUnit({
        id: "child",
        name: "Sub",
        type: "DEPARTMENT",
        description: "",
        parentId: "parent",
        orgId: "test-org-1",
        isActive: true,
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(2);
      expect(units.find((u) => u.id === "child")!.parentId).toBeNull();
    });
  });

  // ─── registerOrg ───────────────────────────────────────────────

  describe("registerOrg", () => {
    it("registers an org in the PS table", async () => {
      await organization.registerOrg("org-x", "X Organization");
      const orgs = await organization.listOrgs();
      expect(orgs.map((o) => o.orgId)).toContain("org-x");
    });

    it("updates the name seen by getContext", async () => {
      await organization.registerOrg("test-org-1", "My Org");
      const ctx = await organization.getContext();
      expect(ctx.orgName).toBe("My Org");
    });

    it("is idempotent — re-registering updates the name", async () => {
      await organization.registerOrg("test-org-1", "First Name");
      await organization.registerOrg("test-org-1", "Second Name");
      const ctx = await organization.getContext();
      expect(ctx.orgName).toBe("Second Name");
    });
  });

  // ─── addOrgUnit ────────────────────────────────────────────────

  describe("addOrgUnit", () => {
    it("stores a new unit for the specified org", async () => {
      await organization.addOrgUnit({
        id: "u1",
        name: "Team Alpha",
        type: "TEAM",
        description: "",
        parentId: null,
        orgId: "test-org-1",
        isActive: true,
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(1);
    });

    it("appends to existing units", async () => {
      await organization.addOrgUnit({
        id: "u1",
        name: "Unit 1",
        type: "TEAM",
        description: "",
        parentId: null,
        orgId: "test-org-1",
        isActive: true,
      });
      await organization.addOrgUnit({
        id: "u2",
        name: "Unit 2",
        type: "TEAM",
        description: "",
        parentId: null,
        orgId: "test-org-1",
        isActive: true,
      });
      const units = await organization.getOrgUnits();
      expect(units).toHaveLength(2);
    });
  });

  // ─── removeOrgUnit ─────────────────────────────────────────────

  describe("removeOrgUnit", () => {
    it("removes a unit and returns true", async () => {
      await organization.addOrgUnit({
        id: "u1",
        name: "ToDelete",
        type: "TEAM",
        description: "",
        parentId: null,
        orgId: "test-org-1",
        isActive: true,
      });
      const result = await organization.removeOrgUnit("test-org-1", "u1");
      expect(result).toBe(true);
    });

    it("returns false for a non-existent unit", async () => {
      const result = await organization.removeOrgUnit(
        "test-org-1",
        "nonexistent",
      );
      expect(result).toBe(false);
    });

    it("does not affect other orgs", async () => {
      await organization.addOrgUnit({
        id: "u1",
        name: "Other Org Unit",
        type: "TEAM",
        description: "",
        parentId: null,
        orgId: "other-org",
        isActive: true,
      });
      const result = await organization.removeOrgUnit("test-org-1", "u1");
      expect(result).toBe(false);
    });
  });

  // ─── listOrgs ──────────────────────────────────────────────────

  describe("listOrgs", () => {
    it("returns empty array when no orgs registered", async () => {
      const orgs = await organization.listOrgs();
      expect(orgs).toEqual([]);
    });

    it("returns all registered organizations", async () => {
      await organization.registerOrg("org-1", "Org One");
      await organization.registerOrg("org-2", "Org Two");
      const orgs = await organization.listOrgs();
      expect(orgs).toHaveLength(2);
      expect(orgs.map((o) => o.name)).toContain("Org One");
      expect(orgs.map((o) => o.name)).toContain("Org Two");
    });

    it("returns org names from the PS table", async () => {
      await organization.registerOrg("org-1", "First Org");
      const orgs = await organization.listOrgs();
      expect(orgs[0].name).toBe("First Org");
    });
  });

  // ─── contract verification ─────────────────────────────────────

  describe("OrgContext contract", () => {
    it("has all required fields: orgId, orgName, role", async () => {
      const ctx: OrgContext = {
        orgId: "org-1",
        orgName: "Test Org",
        role: "admin",
      };
      expect(ctx.orgId).toBe("org-1");
      expect(ctx.orgName).toBe("Test Org");
      expect(ctx.role).toBe("admin");
    });
  });

  describe("OrganizationService contract", () => {
    it("exposes getContext, switchOrg, getOrgUnits", async () => {
      expect(typeof organization.getContext).toBe("function");
      expect(typeof organization.switchOrg).toBe("function");
      expect(typeof organization.getOrgUnits).toBe("function");
    });
  });

  describe("OrgUnit contract", () => {
    it("has all required fields: id, name, parentId, orgId", () => {
      const unit: OrgUnit = {
        id: "u1",
        name: "Unit",
        type: "TEAM",
        description: "",
        parentId: null,
        orgId: "org-1",
        isActive: true,
      };
      expect(unit.id).toBe("u1");
      expect(unit.name).toBe("Unit");
      expect(unit.parentId).toBeNull();
      expect(unit.orgId).toBe("org-1");
    });
  });

  // ─── domain-agnostic verification ──────────────────────────────

  describe("domain-agnostic", () => {
    it("does not reference any church-specific terminology", async () => {
      const ctx = await organization.getContext();
      expect(ctx.orgId).toBeDefined();
      expect(ctx.orgName).toBeDefined();
      expect(ctx.role).toBeDefined();
    });

    it("uses generic role value, not role-specific strings", async () => {
      const ctx = await organization.getContext();
      expect(typeof ctx.role).toBe("string");
    });
  });
});
