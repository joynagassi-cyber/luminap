/**
 * PR3 (complément) — purge définitive de la corbeille (`src/lib/trash.ts`).
 *
 * Ce que ces tests verrouillent :
 *   1. `purgeEntity` supprime RÉELLEMENT un élément archivé (ligne + lignes
 *      filles cohérentes, comme `deleteGroupPS`) et écrit un audit `DELETE` ;
 *   2. GARDE FAIL-CLOSED : purger un élément NON archivé est REFUSÉ (aucune
 *      suppression, aucun audit) — sinon la purge contournerait le
 *      soft-delete ;
 *   3. bornage ORG : un élément d'une autre organisation n'est jamais purgé ;
 *   4. `purgeAllArchived` ne touche QUE l'org active, et respecte
 *      `olderThanDays`.
 *
 * ── NON-VACUITÉ (vérifié manuellement, puis restauré) ────────────────────────
 * Retirer la garde `if (entity.status !== archivedStatus(entityType)) throw …`
 * de `purgeEntity` fait ÉCHOUER le test « refuse un élément non archivé »
 * (la ligne active est alors supprimée) : le test détecte bien l'absence de la
 * garde.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Stores mutables partagés ───────────────────────────────────────
const tables: Record<string, any[]> = {};
const auditEntries: any[] = [];

function resetTables() {
  for (const key of Object.keys(tables)) delete tables[key];
}

/** Interpréteur minimal des requêtes utilisées par `trash.ts`. */
const mockDb = {
  execute: async (sql: string, params: any[] = []) => {
    const s = sql.trim().replace(/\s+/g, " ");

    const del = s.match(/^DELETE FROM (\w+)/i);
    if (del) {
      const table = del[1];
      const rows = tables[table] ?? [];
      const where = s.match(/WHERE (.+)$/i);
      let remaining = rows;
      if (where) {
        const m = where[1].match(/(\w+) = \?/);
        if (m) {
          const col = m[1];
          const val = params[0];
          remaining = rows.filter((r) => r[col] !== val);
        }
      }
      tables[table] = remaining;
      return { rowsAffected: rows.length - remaining.length };
    }

    if (/^SELECT/i.test(s)) {
      const from = s.match(/FROM (\w+)/i);
      const table = from ? from[1] : "unknown";
      let rows = [...(tables[table] ?? [])];
      const where = s.match(/WHERE (.+?)(?: ORDER BY .*)?$/i);
      if (where) {
        const conditions = where[1].split(/ AND /i);
        let pi = 0;
        for (const cond of conditions) {
          const isNotNull = cond.match(/(\w+) IS NOT NULL/i);
          const le = cond.match(/(\w+) <= \?/);
          const eq = cond.match(/(\w+) = \?/);
          if (eq) {
            const col = eq[1];
            const val = params[pi++];
            rows = rows.filter((r) => r[col] === val);
          } else if (le) {
            const col = le[1];
            const val = params[pi++];
            rows = rows.filter((r) => r[col] != null && r[col] <= val);
          } else if (isNotNull) {
            const col = isNotNull[1];
            rows = rows.filter((r) => r[col] != null);
          }
        }
      }
      return { array: rows };
    }

    return { array: [] };
  },
};

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => mockDb,
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-test-1",
}));

vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(async (entry: any) => {
    auditEntries.push(entry);
  }),
}));

import { purgeEntity, purgeAllArchived, PURGE_ERRORS } from "@/lib/trash";

function seed(table: string, rows: any[]) {
  tables[table] = rows;
}

beforeEach(() => {
  resetTables();
  auditEntries.length = 0;
});

describe("purgeEntity — garde fail-closed (soft-delete non contournable)", () => {
  it("supprime un élément ARCHIVÉ et écrit un audit DELETE", async () => {
    seed("groups", [
      {
        id: "g1",
        org_id: "org-test-1",
        name: "Chorale",
        status: "ARCHIVED",
        archived_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    seed("group_memberships", [
      { id: "gm1", org_id: "org-test-1", group_id: "g1", member_id: "m1" },
    ]);
    seed("caisses", [{ id: "g1", org_id: "org-test-1" }]);
    seed("accounts", [{ id: "g1", org_id: "org-test-1", status: "ARCHIVED" }]);
    seed("org_units", [{ id: "g1", org_id: "org-test-1" }]);

    await purgeEntity("Group", "g1", "admin-1");

    // Ligne principale ET lignes filles supprimées (comme deleteGroupPS).
    expect(tables["groups"]).toHaveLength(0);
    expect(tables["group_memberships"]).toHaveLength(0);
    expect(tables["caisses"]).toHaveLength(0);
    expect(tables["accounts"]).toHaveLength(0);
    expect(tables["org_units"]).toHaveLength(0);

    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]).toMatchObject({
      action: "DELETE",
      entityType: "Group",
      entityId: "g1",
      userId: "admin-1",
      comment: "purge définitive",
    });
    // Snapshot avant purge conservé (traçabilité).
    expect(auditEntries[0].beforeState).toMatchObject({ id: "g1", status: "ARCHIVED" });
  });

  it("REFUSE de purger un élément NON archivé (aucune suppression, aucun audit)", async () => {
    seed("groups", [
      { id: "g2", org_id: "org-test-1", name: "Actif", status: "ACTIVE" },
    ]);

    await expect(purgeEntity("Group", "g2", "admin-1")).rejects.toThrow(
      PURGE_ERRORS.NOT_ARCHIVED,
    );

    expect(tables["groups"]).toHaveLength(1);
    expect(auditEntries).toHaveLength(0);
  });

  it("REFUSE un élément d'une autre organisation (anti-fuite inter-org)", async () => {
    seed("groups", [
      { id: "g3", org_id: "org-other", name: "Autre", status: "ARCHIVED" },
    ]);

    await expect(purgeEntity("Group", "g3", "admin-1")).rejects.toThrow(
      PURGE_ERRORS.ORG_MISMATCH,
    );
    expect(tables["groups"]).toHaveLength(1);
    expect(auditEntries).toHaveLength(0);
  });

  it("REFUSE un élément inexistant", async () => {
    await expect(purgeEntity("Group", "missing", "admin-1")).rejects.toThrow(
      PURGE_ERRORS.NOT_FOUND,
    );
    expect(auditEntries).toHaveLength(0);
  });
});

describe("purgeAllArchived — bornée à l'org active", () => {
  it("ne purge QUE l'org active (jamais une autre organisation)", async () => {
    seed("groups", [
      { id: "g1", org_id: "org-test-1", status: "ARCHIVED", archived_at: "2026-01-01T00:00:00.000Z" },
      { id: "gX", org_id: "org-other", status: "ARCHIVED", archived_at: "2026-01-01T00:00:00.000Z" },
    ]);
    seed("members", [
      { id: "m1", org_id: "org-test-1", status: "ARCHIVED", archived_at: "2026-01-01T00:00:00.000Z" },
    ]);

    const res = await purgeAllArchived("admin-1");

    expect(res.purged).toBe(2);
    expect(res.byType).toEqual({ Group: 1, Member: 1 });
    // L'élément de l'autre org est INTACT.
    expect(tables["groups"].map((g) => g.id)).toEqual(["gX"]);
    expect(auditEntries).toHaveLength(2);
    expect(auditEntries.every((e) => e.action === "DELETE")).toBe(true);
  });

  it("respecte olderThanDays (n'écarte que les éléments assez anciens)", async () => {
    const recent = new Date().toISOString();
    seed("groups", [
      { id: "old", org_id: "org-test-1", status: "ARCHIVED", archived_at: "2020-01-01T00:00:00.000Z" },
      { id: "new", org_id: "org-test-1", status: "ARCHIVED", archived_at: recent },
    ]);

    const res = await purgeAllArchived("admin-1", { olderThanDays: 30 });

    expect(res.purged).toBe(1);
    expect(tables["groups"].map((g) => g.id)).toEqual(["new"]);
  });

  it("écarte un élément sans horodatage quand olderThanDays est demandé (fail-closed)", async () => {
    seed("groups", [
      { id: "no-ts", org_id: "org-test-1", status: "ARCHIVED", archived_at: null },
    ]);

    const res = await purgeAllArchived("admin-1", { olderThanDays: 1 });

    expect(res.purged).toBe(0);
    expect(tables["groups"]).toHaveLength(1);
  });
});
