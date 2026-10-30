// @vitest-environment node
/**
 * R141.d — clôture du chantier d'autorisation d'ÉCRITURE.
 *
 * Dernières politiques INSERT/UPDATE/DELETE restées sur `is_org_member` SEUL,
 * après R137 (15), R141 (14 tables financières) et R141.b/c (8 non financières) :
 *   * `invitation_claims` UPDATE  → invitation:manage
 *   * `notifications` INSERT/UPDATE/DELETE → admin:settings
 *   * `role_assignments` INSERT/UPDATE/DELETE → admin:settings (table morte)
 *   * `audit_entries` INSERT → LAISSÉ au niveau membre (journal de ses propres
 *     actions — restriction volontaire).
 *
 * Sûreté : aucune écriture REST de ces tables côté client (PowerSync, BYPASSRLS).
 * Même patron que `r141bc-write-permission-guard.test.ts` : lecture des
 * migrations, sans base.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");
const GUARD_MIGRATION = "20261031000004_rls_write_permission_r141d.sql";

/** Table → permission canon attendue + commandes gardées. */
const R141D_TABLES: Record<string, { perm: string; cmds: string[] }> = {
  invitation_claims: { perm: "invitation:manage", cmds: ["update"] },
  notifications: { perm: "admin:settings", cmds: ["insert", "update", "delete"] },
  role_assignments: { perm: "admin:settings", cmds: ["insert", "update", "delete"] },
};

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
}
function readMigration(name: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, name), "utf8");
}

describe("R141.d — écriture gardée sur les dernières tables non gardées", () => {
  it("la migration câble chaque politique sur la permission attendue", () => {
    const sql = readMigration(GUARD_MIGRATION);
    for (const [t, { perm, cmds }] of Object.entries(R141D_TABLES)) {
      const [res, act] = perm.split(":");
      for (const cmd of cmds) {
        const re = new RegExp(
          `CREATE POLICY ${t}_${cmd} ON public\\.${t}[\\s\\S]*?has_permission\\([\\s\\S]*?'${res}', '${act}'\\)`,
          "i",
        );
        expect(re.test(sql), `${t}_${cmd} non gardée par has_permission(${perm})`).toBe(true);
      }
    }
  });

  it("`audit_entries` INSERT reste au niveau membre (journal de ses propres actions)", () => {
    const sql = readMigration(GUARD_MIGRATION);
    expect(/CREATE POLICY audit_entries_insert/i.test(sql)).toBe(false);
  });

  it("aucune migration tardive ne réécrit une politique R141.d sans has_permission", () => {
    const files = migrationFiles();
    const idx = files.indexOf(GUARD_MIGRATION);
    expect(idx).toBeGreaterThan(-1);
    for (const f of files.slice(idx + 1)) {
      const sql = readMigration(f);
      for (const [t, { cmds }] of Object.entries(R141D_TABLES)) {
        for (const cmd of cmds) {
          const re = new RegExp(`CREATE POLICY ${t}_${cmd} ON public\\.${t}([\\s\\S]*?);`, "i");
          const m = sql.match(re);
          if (m) {
            expect(/has_permission/i.test(m[1]), `${f} réécrit ${t}_${cmd} sans has_permission`).toBe(true);
          }
        }
      }
    }
  });

  it("la migration est réversible (rollback présent)", () => {
    const rb = readFileSync(resolve(MIGRATIONS_DIR, "rollback/20261031000004_rollback.sql"), "utf8");
    for (const [t, { cmds }] of Object.entries(R141D_TABLES)) {
      for (const cmd of cmds) {
        expect(rb).toMatch(new RegExp(`CREATE POLICY ${t}_${cmd} ON public\\.${t}`));
      }
    }
  });
});

describe("R141.d — cohérence TS ↔ permissions utilisées", () => {
  it("les permissions câblées existent dans la matrice TS canon", async () => {
    const { PERMISSION_MATRIX } = await import("@/lib/rbac");
    const all = new Set(Object.values(PERMISSION_MATRIX).flat());
    for (const { perm } of Object.values(R141D_TABLES)) {
      expect(all.has(perm as never), `permission absente du canon TS : ${perm}`).toBe(true);
    }
  });
});
