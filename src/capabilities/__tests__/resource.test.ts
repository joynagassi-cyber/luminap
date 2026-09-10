import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResourceService } from "../resource";

// Mock org context
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-test-1",
}));

// Shared mutable stores
const mockRows: Record<string, any[]> = {};

// Shared mock database
const mockDb = {
  execute: async (sql: string, params: any[] = []) => {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : "unknown";
    const data = mockRows[table] ?? [];

    // COUNT query
    if (sql.includes("COUNT")) {
      const orgId = params[0];
      const filtered =
        orgId !== undefined
          ? data.filter((r: any) => r.org_id === orgId)
          : data;
      return { array: [{ total: filtered.length }] };
    }

    // SELECT WHERE id = ?
    if (sql.includes("WHERE id = ?")) {
      const row = data.find((r: any) => r.id === params[0]);
      return { array: row ? [row] : [] };
    }

    // SELECT WHERE org_id = ? AND status = ? (with optional extra conditions)
    if (sql.includes("org_id = ?") && sql.includes("status = ?")) {
      let filtered = data.filter(
        (r: any) => r.org_id === params[0] && r.status === params[1],
      );
      let paramIdx = 2;
      // Apply any extra conditions beyond org_id and status
      const condRegex = /(\w+)\s*(=|!=|>|>=|<|<=|LIKE)\s*\?/g;
      let m;
      while ((m = condRegex.exec(sql)) !== null) {
        const col = m[1];
        const op = m[2];
        if (col === "org_id" || col === "status") continue;
        const val = params[paramIdx++];
        switch (op) {
          case "=":
            filtered = filtered.filter((r: any) => r[col] === val);
            break;
          case "!=":
            filtered = filtered.filter((r: any) => r[col] !== val);
            break;
          case ">":
            filtered = filtered.filter((r: any) => r[col] > val);
            break;
          case ">=":
            filtered = filtered.filter((r: any) => r[col] >= val);
            break;
          case "<":
            filtered = filtered.filter((r: any) => r[col] < val);
            break;
          case "<=":
            filtered = filtered.filter((r: any) => r[col] <= val);
            break;
          case "LIKE": {
            const search = String(val).replace(/%/g, "");
            filtered = filtered.filter((r: any) =>
              String(r[col]).includes(search),
            );
            break;
          }
        }
      }
      return { array: filtered };
    }

    // SELECT WHERE org_id = ? (general list)
    if (sql.includes("org_id = ?")) {
      let filtered = data.filter((r: any) => r.org_id === params[0]);
      let paramIdx = 1;

      // Parse additional conditions from SQL, skipping org_id
      const condRegex = /(\w+)\s*(=|!=|>|>=|<|<=|LIKE)\s*\?/g;
      let m;
      while ((m = condRegex.exec(sql)) !== null) {
        const col = m[1];
        const op = m[2];
        if (col === "org_id") continue;
        const val = params[paramIdx++];
        switch (op) {
          case "=":
            filtered = filtered.filter((r: any) => r[col] === val);
            break;
          case "!=":
            filtered = filtered.filter((r: any) => r[col] !== val);
            break;
          case ">":
            filtered = filtered.filter((r: any) => r[col] > val);
            break;
          case ">=":
            filtered = filtered.filter((r: any) => r[col] >= val);
            break;
          case "<":
            filtered = filtered.filter((r: any) => r[col] < val);
            break;
          case "<=":
            filtered = filtered.filter((r: any) => r[col] <= val);
            break;
          case "LIKE": {
            const search = String(val).replace(/%/g, "");
            filtered = filtered.filter((r: any) =>
              String(r[col]).includes(search),
            );
            break;
          }
        }
      }

      // ORDER BY
      const orderMatch = sql.match(/ORDER BY (\w+) (asc|desc)/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const dir = orderMatch[2].toLowerCase() === "desc" ? -1 : 1;
        filtered.sort((a: any, b: any) => {
          if (a[col] < b[col]) return -dir;
          if (a[col] > b[col]) return dir;
          return 0;
        });
      }

      // LIMIT / OFFSET
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1]);
        const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
        filtered = filtered.slice(offset, offset + limit);
      }

      return { array: filtered };
    }

    return { array: data };
  },
};

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => mockDb,
}));

describe("resource capability", () => {
  let resource: ResourceService;

  beforeEach(() => {
    resource = new ResourceService();
    for (const key of Object.keys(mockRows)) {
      mockRows[key].length = 0;
    }
    vi.clearAllMocks();
  });

  // ─── get ───────────────────────────────────────────────────────

  describe("get", () => {
    it("returns an entity when found", async () => {
      if (!mockRows["groups"]) mockRows["groups"] = [];
      mockRows["groups"].push({
        id: "g1",
        org_id: "org-test-1",
        name: "Alpha",
        status: "ACTIVE" as any,
      });
      const result = await resource.get("Group", "g1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("g1");
      expect((result as any).name).toBe("Alpha");
    });

    it("returns null when entity not found", async () => {
      const result = await resource.get("Group", "missing");
      expect(result).toBeNull();
    });

    it("converts snake_case columns to camelCase", async () => {
      if (!mockRows["groups"]) mockRows["groups"] = [];
      mockRows["groups"].push({
        id: "g1",
        org_id: "org-test-1",
        name: "Beta",
        status: "ACTIVE" as any,
      });
      const result = await resource.get("Group", "g1");
      expect(result!).toHaveProperty("orgId");
      expect(result!).not.toHaveProperty("org_id");
    });
  });

  // ─── list ──────────────────────────────────────────────────────

  describe("list", () => {
    const seedGroups = () => {
      if (!mockRows["groups"]) mockRows["groups"] = [];
      mockRows["groups"].push(
        { id: "g1", org_id: "org-test-1", name: "Alpha", status: "ACTIVE" },
        { id: "g2", org_id: "org-test-1", name: "Beta", status: "ACTIVE" },
        { id: "g3", org_id: "org-test-1", name: "Gamma", status: "ARCHIVED" },
      );
    };

    it("returns all entities of a type with default query", async () => {
      seedGroups();
      const result = await resource.list("Group");
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("filters by eq condition", async () => {
      seedGroups();
      const result = await resource.list("Group", {
        filter: [{ field: "status", op: "eq", value: "ACTIVE" }],
      });
      expect(result.items).toHaveLength(2);
      expect(result.items.every((i: any) => i.status === "ACTIVE")).toBe(true);
    });

    it("filters by neq condition", async () => {
      seedGroups();
      const result = await resource.list("Group", {
        filter: [{ field: "status", op: "neq", value: "ACTIVE" }],
      });
      expect(result.items).toHaveLength(1);
      expect((result.items[0] as any).status).toBe("ARCHIVED");
    });

    it("filters by contains condition", async () => {
      seedGroups();
      const result = await resource.list("Group", {
        filter: [{ field: "name", op: "contains", value: "Al" }],
      });
      expect(result.items).toHaveLength(1);
      expect((result.items[0] as any).name).toBe("Alpha");
    });

    it("sorts by field in ascending order", async () => {
      seedGroups();
      const result = await resource.list("Group", {
        sortBy: "name",
        sortOrder: "asc",
      });
      expect((result.items[0] as any).name).toBe("Alpha");
      expect((result.items[1] as any).name).toBe("Beta");
      expect((result.items[2] as any).name).toBe("Gamma");
    });

    it("sorts by field in descending order", async () => {
      seedGroups();
      const result = await resource.list("Group", {
        sortBy: "name",
        sortOrder: "desc",
      });
      expect((result.items[0] as any).name).toBe("Gamma");
      expect((result.items[2] as any).name).toBe("Alpha");
    });

    it("paginates with limit and offset", async () => {
      seedGroups();
      const result = await resource.list("Group", { limit: 2, offset: 1 });
      expect(result.items).toHaveLength(2);
      expect(result.hasNext).toBe(true);
    });

    it("sets hasNext to false when no limit is applied", async () => {
      seedGroups();
      const result = await resource.list("Group");
      expect(result.hasNext).toBe(false);
    });

    it("returns empty result set when no entities exist", async () => {
      const result = await resource.list("Group");
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─── listByStatus ──────────────────────────────────────────────

  describe("listByStatus", () => {
    const seedGroups = () => {
      if (!mockRows["groups"]) mockRows["groups"] = [];
      mockRows["groups"].push(
        { id: "g1", org_id: "org-test-1", name: "Alpha", status: "ACTIVE" },
        { id: "g2", org_id: "org-test-1", name: "Beta", status: "ACTIVE" },
        { id: "g3", org_id: "org-test-1", name: "Gamma", status: "ARCHIVED" },
      );
    };

    it("returns only ACTIVE groups", async () => {
      seedGroups();
      const result = await resource.listByStatus("Group", "ACTIVE");
      expect(result).toHaveLength(2);
      expect(result.every((g: any) => g.status === "ACTIVE")).toBe(true);
    });

    it("returns only ARCHIVED groups", async () => {
      seedGroups();
      const result = await resource.listByStatus("Group", "ARCHIVED");
      expect(result).toHaveLength(1);
      expect((result[0] as any).name).toBe("Gamma");
    });

    it("returns empty array for non-existent status", async () => {
      seedGroups();
      const result = await resource.listByStatus("Group", "DELETED");
      expect(result).toHaveLength(0);
    });
  });

  // ─── listArchived ──────────────────────────────────────────────

  describe("listArchived", () => {
    const seedGroups = () => {
      if (!mockRows["groups"]) mockRows["groups"] = [];
      mockRows["groups"].push(
        { id: "g1", org_id: "org-test-1", name: "Alpha", status: "ACTIVE" },
        { id: "g2", org_id: "org-test-1", name: "Beta", status: "ARCHIVED" },
        { id: "g3", org_id: "org-test-1", name: "Gamma", status: "ARCHIVED" },
      );
    };

    const seedEvents = () => {
      if (!mockRows["events"]) mockRows["events"] = [];
      mockRows["events"].push(
        { id: "e1", org_id: "org-test-1", name: "Culte", status: "PLANIFIED" },
        {
          id: "e2",
          org_id: "org-test-1",
          name: "Conference",
          status: "CANCELLED",
        },
      );
    };

    it("returns ARCHIVED groups", async () => {
      seedGroups();
      const result = await resource.listArchived("Group");
      expect(result.items).toHaveLength(2);
      expect(result.items.every((g: any) => g.status === "ARCHIVED")).toBe(
        true,
      );
    });

    it("returns CANCELLED events", async () => {
      seedEvents();
      const result = await resource.listArchived("Event");
      expect(result.items).toHaveLength(1);
      expect((result.items[0] as any).status).toBe("CANCELLED");
    });

    it("returns empty when no archived entities", async () => {
      seedGroups();
      const result = await resource.listArchived("Event");
      expect(result.items).toHaveLength(0);
    });

    it("supports additional filters", async () => {
      seedGroups();
      const result = await resource.listArchived("Group", {
        filter: [{ field: "name", op: "eq", value: "Beta" }],
      });
      expect(result.items).toHaveLength(1);
      expect((result.items[0] as any).name).toBe("Beta");
    });

    it("returns total equal to items length and hasNext=false", async () => {
      seedGroups();
      const result = await resource.listArchived("Group");
      expect(result.total).toBe(2);
      expect(result.hasNext).toBe(false);
    });
  });

  // ─── exists ────────────────────────────────────────────────────

  describe("exists", () => {
    it("returns true for an existing entity", async () => {
      if (!mockRows["groups"]) mockRows["groups"] = [];
      mockRows["groups"].push({ id: "g1", org_id: "org-test-1" } as any);
      const result = await resource.exists("Group", "g1");
      expect(result).toBe(true);
    });

    it("returns false for a non-existent entity", async () => {
      const result = await resource.exists("Group", "missing");
      expect(result).toBe(false);
    });
  });
});
