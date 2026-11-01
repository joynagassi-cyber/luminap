// @vitest-environment node
/**
 * R141.b / R141.c — l'autorisation d'ÉCRITURE est appliquée aux tables NON
 * FINANCIÈRES restées en `is_org_member` SEUL (suite de R141, qui avait couvert
 * les tables financières + 3 tables du Lot 1).
 *
 * Défaut mesuré (2026-10-31) : ces tables avaient leurs politiques
 * INSERT/UPDATE/DELETE fondées sur `is_org_member` SEUL → tout MEMBRE pouvait
 * écrire via le client REST direct. Correctif : migration `20261031000002` —
 * chaque politique devient `is_org_member AND has_permission(...)`, avec une
 * permission CANON (aucune nouvelle).
 *
 * Sûreté : aucune écriture REST de ces tables n'existe côté client (tout passe
 * par PowerSync, BYPASSRLS) → ces politiques ne peuvent pas casser un flux.
 *
 * Même patron que `r141-write-permission-guard.test.ts` : lecture des
 * migrations, sans base.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");
const GUARD_MIGRATION = "20261031000002_rls_write_permission_r141bc.sql";

/** Table → permission canon attendue + commandes gardées. */
const R141BC_TABLES: Record<string, { perm: string; cmds: string[] }> = {
  documents: { perm: "admin:settings", cmds: ["insert", "update"] },
  event_tasks: { perm: "event:update", cmds: ["insert", "update", "delete"] },
  report_definitions: { perm: "report:export", cmds: ["insert", "update", "delete"] },
  custom_field_definitions: { perm: "admin:settings", cmds: ["insert", "update", "delete"] },
  custom_field_values: { perm: "admin:settings", cmds: ["insert", "update", "delete"] },
  form_definitions: { perm: "admin:settings", cmds: ["insert", "update", "delete"] },
  form_submissions: { perm: "admin:settings", cmds: ["insert", "update", "delete"] },
  categories: { perm: "admin:settings", cmds: ["insert", "update", "delete"] },
};

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
}
function readMigration(name: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, name), "utf8");
}

describe("R141.b/c — écriture gardée sur les tables non financières", () => {
  it("la migration de garde câble les 8 tables sur la permission attendue", () => {
    const sql = readMigration(GUARD_MIGRATION);
    for (const [t, { perm, cmds }] of Object.entries(R141BC_TABLES)) {
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

  it("`documents` ne se voit PAS ouvrir de DELETE (deny-all préservé)", () => {
    // La table n'avait aucune politique DELETE avant : la migration ne doit pas
    // en créer (ce serait une nouvelle capacité, hors d'un durcissement).
    const sql = readMigration(GUARD_MIGRATION);
    expect(/CREATE POLICY documents_delete/i.test(sql)).toBe(false);
  });

  it("aucune migration tardive ne réécrit une politique R141.b/c sans has_permission", () => {
    const files = migrationFiles();
    const idx = files.indexOf(GUARD_MIGRATION);
    expect(idx).toBeGreaterThan(-1);
    for (const f of files.slice(idx + 1)) {
      const sql = readMigration(f);
      for (const [t, { cmds }] of Object.entries(R141BC_TABLES)) {
        for (const cmd of cmds) {
          const re = new RegExp(`CREATE POLICY ${t}_${cmd} ON public\\.${t}([\\s\\S]*?);`, "i");
          const m = sql.match(re);
          if (m) {
            expect(
              /has_permission/i.test(m[1]),
              `${f} réécrit ${t}_${cmd} sans has_permission`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it("la migration de garde est réversible (rollback présent, sans rouvrir documents DELETE)", () => {
    const rb = readFileSync(
      resolve(MIGRATIONS_DIR, "rollback/20261031000002_rollback.sql"),
      "utf8",
    );
    for (const t of Object.keys(R141BC_TABLES)) {
      expect(rb).toMatch(new RegExp(`CREATE POLICY ${t}_insert ON public\\.${t}`));
    }
    expect(/CREATE POLICY documents_delete/i.test(rb)).toBe(false);
  });
});

describe("R141.b/c — cohérence TS ↔ permissions utilisées", () => {
  it("les permissions câblées existent dans la matrice TS canon", async () => {
    const { PERMISSION_MATRIX } = await import("@/lib/rbac");
    const all = new Set(Object.values(PERMISSION_MATRIX).flat());
    for (const { perm } of Object.values(R141BC_TABLES)) {
      expect(all.has(perm as never), `permission absente du canon TS : ${perm}`).toBe(true);
    }
  });
});
