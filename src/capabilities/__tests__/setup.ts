/**
 * Shared test setup — mocks external dependencies so capability tests
 * run in isolation without a real PowerSync database.
 */

// ─── PowerSync mock ───────────────────────────────────────────────
const mockRows: Record<string, any[]> = {};

function createMockDb() {
  return {
    execute: async (sql: string, params: any[] = []) => {
      // Very lightweight matcher for the queries used by our capabilities
      const match = (pattern: RegExp) => pattern.test(sql);

      // SELECT * FROM <table> WHERE id = ?
      if (match(/^SELECT \* FROM (\w+) WHERE id = \?$/)) {
        const table = sql.match(/^SELECT \* FROM (\w+)/)![1];
        return {
          result: (mockRows[table] ?? []).find((r: any) => r.id === params[0])
            ? [(mockRows[table] ?? []).find((r: any) => r.id === params[0])]
            : [],
        };
      }

      // SELECT 1 FROM <table> WHERE id = ? LIMIT 1
      if (match(/^SELECT 1 FROM (\w+) WHERE id = \? LIMIT 1$/)) {
        return { result: [] };
      }

      // SELECT * FROM <table> WHERE org_id = ? AND status = ? ORDER BY name
      if (match(/^SELECT \* FROM (\w+) WHERE org_id = \? AND status = \?/)) {
        const table = sql.match(/^SELECT \* FROM (\w+)/)![1];
        const status = params[1];
        return {
          result: (mockRows[table] ?? []).filter(
            (r: any) => r.status === status,
          ),
        };
      }

      // SELECT * FROM <table> WHERE org_id = ? AND status = ? AND <extra>
      if (sql.includes("WHERE") && sql.includes("AND")) {
        const table = sql.match(/^SELECT \* FROM (\w+)/)?.[1];
        const rows = mockRows[table] ?? [];
        return { result: rows };
      }

      // SELECT COUNT(*) as total FROM <table> WHERE ...
      if (match(/^SELECT COUNT/)) {
        return { result: [{ total: 0 }] };
      }

      // INSERT
      if (match(/^INSERT/)) {
        const table = sql.match(/INTO (\w+)/)?.[1];
        if (table) {
          const idIdx = sql.indexOf("id,");
          const idVal = params[0];
          const row: any = { id: idVal };
          const keys =
            sql
              .match(/INSERT INTO \w+ \(([^)]+)\)/)?.[1]
              ?.split(",")
              .map((k: string) => k.trim()) ?? [];
          keys.forEach((k: string, i: number) => {
            if (k !== "id") row[k] = params[i + 1];
          });
          if (!mockRows[table]) mockRows[table] = [];
          mockRows[table].push(row);
        }
        return { result: [] };
      }

      // DELETE
      if (match(/^DELETE FROM (\w+) WHERE id = \?$/)) {
        const table = sql.match(/^DELETE FROM (\w+)/)![1];
        if (mockRows[table]) {
          mockRows[table] = mockRows[table].filter(
            (r: any) => r.id !== params[0],
          );
        }
        return { result: [] };
      }

      // UPDATE
      if (match(/^UPDATE/)) {
        const table = sql.match(/UPDATE (\w+)/)![1];
        const idVal = params[params.length - 1];
        if (mockRows[table]) {
          const idx = mockRows[table].findIndex((r: any) => r.id === idVal);
          if (idx !== -1) {
            // Rebuild params mapping from SQL SET clause
            const setMatch = sql.match(/SET (.+) WHERE/);
            if (setMatch) {
              const setClauses = setMatch[1]
                .split(",")
                .map((c: string) => c.trim());
              let paramIdx = 0;
              setClauses.forEach((clause: string) => {
                const eqIdx = clause.indexOf("=");
                const col =
                  eqIdx !== -1
                    ? clause.substring(0, eqIdx).trim()
                    : clause.split(/\s+/)[0];
                const valPart =
                  eqIdx !== -1 ? clause.substring(eqIdx + 1).trim() : "";
                if (col && col !== "id") {
                  if (valPart.toUpperCase() === "NULL") {
                    mockRows[table][idx][col] = null;
                  } else if (valPart === "?" && paramIdx < params.length) {
                    mockRows[table][idx][col] = params[paramIdx];
                    paramIdx++;
                  }
                }
              });
            }
          }
        }
        return { result: [] };
      }

      // Generic SELECT *
      if (match(/^SELECT \* FROM (\w+)/)) {
        const table = sql.match(/^SELECT \* FROM (\w+)/)![1];
        return { result: mockRows[table] ?? [] };
      }

      return { result: [] };
    },
  };
}

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => createMockDb(),
}));

// ─── orgContext mock ──────────────────────────────────────────────
const _orgId = "test-org-1";
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => _orgId,
  setOrganizationId: (id: string) => {},
}));

// ─── auditLogRepo mock ────────────────────────────────────────────
const _auditEntries: any[] = [];
vi.mock("@/lib/audit", () => ({
  auditLogRepo: {
    async write(entry: any) {
      _auditEntries.push(entry);
    },
    async list(_filters?: any) {
      return _auditEntries;
    },
    async getByEntity() {
      return [];
    },
  },
  writeAudit: vi.fn(),
}));

// ─── dataLayer mock (relationship capability) ─────────────────────
const _memberships: Array<{
  id: string;
  group_id: string;
  member_id: string;
  role: string;
  org_id?: string;
}> = [];

vi.mock("@/lib/dataLayer", () => ({
  addGroupMembershipPS: async (
    groupId: string,
    memberId: string,
    role: string,
  ) => {
    const id = `mock-mem-${Date.now()}`;
    _memberships.push({
      id,
      group_id: groupId,
      member_id: memberId,
      role,
      org_id: "test-org-1",
    });
    return id;
  },
  removeGroupMembershipPS: async (id: string) => {
    const idx = _memberships.findIndex((m) => m.id === id);
    if (idx !== -1) _memberships.splice(idx, 1);
  },
  getGroupMembershipsPS: async () => _memberships,
}));

// ─── cleanup between tests ────────────────────────────────────────
beforeEach(() => {
  // Reset mock data
  Object.keys(mockRows).forEach((k) => delete mockRows[k]);
  _auditEntries.length = 0;
  _memberships.length = 0;
  vi.clearAllMocks();
});
