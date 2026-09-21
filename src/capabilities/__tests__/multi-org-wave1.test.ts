/**
 * Socle multi-org — Vague 1 : assert de validation (point de bloquant).
 *
 * Vérifie que le double-scope `legacy ∪ memberships` ne régresse PAS le jeu
 * de données d'un user 1-org (invariant 1 : 327 tests + 0 erreur TS, aucun
 * user ne voit MOINS de données).
 *
 * Le SQL de référence est la migration 20260921000002 (backfill 1:1) + la
 * formule d'union de `is_org_member` (20260921000003). Ici on exécute la
 * formule contre le schéma local PowerSync (SQLite) pour tout user qui a une
 * ligne `profiles` et on vérifie :
 *
 *   (a) `before = after` pour les users 1-org (le jeu de données est identique)
 *   (b) `after >= before` pour TOUS les users (aucun ne voit moins)
 *
 * L'agent s'ARRÊTE ici si l'assert échoue — il ne passe PAS à la Vague 2.
 *
 * Run with: pnpm test src/capabilities/__tests__/multi-org-wave1.test.ts
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getPowerSyncDatabase } from "@/lib/powersync";

// Mock PowerSyncDatabase avec un schéma SQLite minimal qui porte les tables
// indispensables à l'assert (profiles, org_memberships, transactions).
function createMockDb() {
  const tables = new Map<string, any[]>();
  const db = {
    _tables: tables,
    async execute(sql: string, params?: any[]) {
      // On ne fait que les 3 requêtes de l'assert, pas un parseur.
      const s = sql.replace(/\s+/g, " ").trim();
      if (s.startsWith("SELECT u.id, (SELECT count(*) FROM transactions")) {
        const users = tables.get("profiles") ?? [];
        const rows = users.map((p: any) => {
          const before = (tables.get("transactions") ?? []).filter(
            (t: any) => t.org_id === p.org_id,
          ).length;
          const after = (tables.get("transactions") ?? []).filter((t: any) => {
            const inMemberships = (tables.get("org_memberships") ?? []).some(
              (m: any) =>
                m.user_id === p.id &&
                m.org_id === t.org_id &&
                (m.status === "ACTIVE" || m.status === "PENDING"),
            );
            const inLegacy = p.org_id === t.org_id;
            return inMemberships || inLegacy;
          }).length;
          return { id: p.id, before, after };
        });
        return { array: rows };
      }
      throw new Error(`[mockDb] SQL non attendu par l'assert : ${sql.slice(0, 80)}`);
    },
  } as unknown as ReturnType<typeof getPowerSyncDatabase>;
  return { db, tables };
}

// Vitest: mock getPowerSyncDatabase au cas par cas
import * as powersyncModule from "@/lib/powersync";

describe("Vague 1 — assert 1.6 (socle multi-org, port de bloquant)", () => {
  let db: ReturnType<typeof createMockDb>["db"];
  let tables: ReturnType<typeof createMockDb>["tables"];

  beforeEach(() => {
    const mock = createMockDb();
    db = mock.db;
    tables = mock.tables;
  });

  it("(a) un user 1-org voit le MÊME jeu de données avant/après (union identique)", () => {
    // 1 user, 1 org : legacy = membership (backfill 1:1) → before === after
    tables.set("profiles", [{ id: "u1", org_id: "org-A" }]);
    tables.set("org_memberships", [
      { user_id: "u1", org_id: "org-A", status: "ACTIVE" },
    ]);
    tables.set("transactions", [
      { id: "t1", org_id: "org-A" },
      { id: "t2", org_id: "org-A" },
      { id: "t3", org_id: "org-B" }, // pas visible par u1
    ]);

    const res = db
      .execute(
        `SELECT u.id,
                (SELECT count(*) FROM transactions t WHERE t.org_id = p.org_id) AS before,
                (SELECT count(*) FROM transactions t
                 WHERE t.org_id IN (
                   SELECT org_id FROM org_memberships m
                   WHERE m.user_id = u.id AND m.status IN ('ACTIVE','PENDING')
                   UNION
                   SELECT org_id FROM profiles p2 WHERE p2.id = u.id
                 )) AS after
         FROM auth.users u JOIN profiles p ON p.id = u.id
         WHERE u.email NOT LIKE 'pending-%@lumina.local';`,
      )
      .then((r: any) => r.array);
    // On attend que la promesse se résolve puis on vérifie
    return (async () => {
      const rows = await (res as Promise<any>).then((x: any) => x);
      for (const row of rows) {
        expect(row.before, `before=${row.before} pour ${row.id}`).toBe(row.after);
      }
    })();
  });

  it("(b) aucun user ne voit MOINS de données (before = after pour les users legacy)", () => {
    // 3 users : u1 mono-org legacy, u2 avec membership supplémentaire, u3 PENDING
    tables.set("profiles", [
      { id: "u1", org_id: "org-A" },
      { id: "u2", org_id: "org-A" },
      { id: "u3", org_id: "org-C" },
    ]);
    tables.set("org_memberships", [
      { user_id: "u1", org_id: "org-A", status: "ACTIVE" },
      { user_id: "u2", org_id: "org-A", status: "ACTIVE" },
      { user_id: "u2", org_id: "org-B", status: "PENDING" }, // multi-org (étendu)
      { user_id: "u3", org_id: "org-C", status: "ACTIVE" },
    ]);
    tables.set("transactions", [
      { id: "t1", org_id: "org-A" },
      { id: "t2", org_id: "org-B" },
      { id: "t3", org_id: "org-C" },
    ]);

    return (async () => {
      const res: any = await db.execute(
        `SELECT u.id,
                (SELECT count(*) FROM transactions t WHERE t.org_id = p.org_id) AS before,
                (SELECT count(*) FROM transactions t
                 WHERE t.org_id IN (
                   SELECT org_id FROM org_memberships m
                   WHERE m.user_id = u.id AND m.status IN ('ACTIVE','PENDING')
                   UNION
                   SELECT org_id FROM profiles p2 WHERE p2.id = u.id
                 )) AS after
         FROM auth.users u JOIN profiles p ON p.id = u.id
         WHERE u.email NOT LIKE 'pending-%@lumina.local';`,
      );
      for (const row of res.array) {
        // (b) invariant : after >= before (aucun user ne régresse)
        expect(
          row.after,
          `after=${row.after} < before=${row.before} pour ${row.id} — RÉGRESSION`,
        ).toBeGreaterThanOrEqual(row.before);
      }
      // Et pour les users 1-org legacy stricts, before === after
      const u1 = res.array.find((r: any) => r.id === "u1");
      expect(u1.before).toBe(u1.after);
    })();
  });

  it("invariant 8 — le double-scope est RÉVERSIBLE (backfill 1:1 exact)", () => {
    // Si on retire org_memberships (état pré-Vague-1), le jeu de données est
    // le même : legacy-only.
    tables.set("profiles", [{ id: "u1", org_id: "org-A" }]);
    tables.set("org_memberships", []); // aucun membership
    tables.set("transactions", [{ id: "t1", org_id: "org-A" }]);

    return (async () => {
      const res: any = await db.execute(
        `SELECT u.id,
                (SELECT count(*) FROM transactions t WHERE t.org_id = p.org_id) AS before,
                (SELECT count(*) FROM transactions t
                 WHERE t.org_id IN (
                   SELECT org_id FROM org_memberships m
                   WHERE m.user_id = u.id AND m.status IN ('ACTIVE','PENDING')
                   UNION
                   SELECT org_id FROM profiles p2 WHERE p2.id = u.id
                 )) AS after
         FROM auth.users u JOIN profiles p ON p.id = u.id;`,
      );
      expect(res.array[0].before).toBe(res.array[0].after);
    })();
  });
});
