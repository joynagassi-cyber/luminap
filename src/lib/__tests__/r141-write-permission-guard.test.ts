// @vitest-environment node
/**
 * R141 — l'autorisation d'ÉCRITURE est appliquée aux tables financières
 * (suite de R137, qui n'avait couvert que 15 politiques).
 *
 * Défaut mesuré (2026-10-30) : 14 tables (dont FINANCIÈRES : `accounts`,
 * `caisses`, `org_budgets`, `tax_receipts`, `pledges`, `giving_*`) avaient
 * leurs politiques d'écriture fondées sur `is_org_member` SEUL → tout MEMBRE
 * pouvait écrire (REST direct). Preuve : `INSERT INTO accounts` accepté.
 *
 * Correctif : migration `20261031000001` — chaque politique devient
 * `is_org_member AND has_permission(...)`. Nouvelle permission `finance:manage`
 * (ADMIN, PASTEUR_PRINCIPAL, TREASURIER, TREASURIER_ADJOINT).
 *
 * Même patron que `audit-append-only-guard.test.ts` : lecture des migrations,
 * sans base.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");
const GUARD_MIGRATION = "20261031000001_rls_write_permission_r141.sql";

/** Tables câblées par R141 (Lot 1 permissions existantes + Lot 2 finance). */
const R141_TABLES = [
  "accounts",
  "caisses",
  "org_budgets",
  "org_budget_lines",
  "pledges",
  "giving_campaigns",
  "giving_donors",
  "transaction_giving",
  "tax_receipts",
  "budget_lines",
  "event_budgets",
  "cotisations",
  "group_memberships",
  "org_units",
];

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function readMigration(name: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, name), "utf8");
}

describe("R141 — écriture gardée sur les tables financières", () => {
  it("la migration de garde câble les 14 tables sur has_permission", () => {
    const sql = readMigration(GUARD_MIGRATION);
    for (const t of R141_TABLES) {
      for (const cmd of ["insert", "update", "delete"]) {
        const re = new RegExp(
          `CREATE POLICY ${t}_${cmd} ON public\\.${t}[\\s\\S]*?has_permission`,
          "i",
        );
        expect(re.test(sql), `${t}_${cmd} non gardée par has_permission`).toBe(
          true,
        );
      }
    }
  });

  it("aucune migration tardive ne réécrit une politique R141 sans has_permission", () => {
    const files = migrationFiles();
    const idx = files.indexOf(GUARD_MIGRATION);
    expect(idx).toBeGreaterThan(-1);
    for (const f of files.slice(idx + 1)) {
      const sql = readMigration(f);
      for (const t of R141_TABLES) {
        for (const cmd of ["insert", "update", "delete"]) {
          const re = new RegExp(
            `CREATE POLICY ${t}_${cmd} ON public\\.${t}([\\s\\S]*?);`,
            "i",
          );
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

  it("la permission finance:manage est accordée aux rôles financiers", () => {
    const sql = readMigration(GUARD_MIGRATION);
    for (const role of [
      "ADMIN",
      "PASTEUR_PRINCIPAL",
      "TREASURIER",
      "TREASURIER_ADJOINT",
    ]) {
      expect(
        new RegExp(`\\('${role}', 'finance:manage'\\)`).test(sql),
        `${role} sans finance:manage`,
      ).toBe(true);
    }
  });

  it("la migration de garde est réversible (rollback présent)", () => {
    const rb = readFileSync(
      resolve(MIGRATIONS_DIR, "rollback/20261031000001_rollback.sql"),
      "utf8",
    );
    expect(rb).toMatch(/DELETE FROM public\.role_permissions WHERE permission = 'finance:manage'/);
    for (const t of R141_TABLES) {
      expect(rb).toMatch(
        new RegExp(`CREATE POLICY ${t}_insert ON public\\.${t}`),
      );
    }
  });
});

describe("R141 — cohérence TS ↔ miroir SQL (finance:manage)", () => {
  it("PERMISSION_MATRIX, le miroir SQL et role-model.json portent finance:manage", () => {
    const mirror = readMigration("20261026000002_rbac_has_permission.sql");
    const roleModel = JSON.parse(
      readFileSync(
        resolve(__dirname, "../../../docs/agent/role-model.json"),
        "utf8",
      ),
    ) as { role_permissions: Record<string, string[]> };
    for (const role of [
      "ADMIN",
      "PASTEUR_PRINCIPAL",
      "TREASURIER",
      "TREASURIER_ADJOINT",
    ]) {
      expect(
        new RegExp(`\\('${role}', 'finance:manage'\\)`).test(mirror),
        `miroir SQL : ${role}`,
      ).toBe(true);
      expect(
        roleModel.role_permissions[role].includes("finance:manage"),
        `role-model.json : ${role}`,
      ).toBe(true);
    }
  });
});
