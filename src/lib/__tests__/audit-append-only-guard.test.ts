// @vitest-environment node
/**
 * R140 — `audit_entries` est un journal en AJOUT SEUL (append-only).
 *
 * Défaut mesuré (2026-10-30) : les politiques `audit_entries_delete` et
 * `audit_entries_update` autorisaient tout membre (`is_org_member`) à modifier
 * ou effacer une entrée d'audit → un `MEMBRE` pouvait effacer la trace de ses
 * propres actions. Aucun chemin applicatif ne fait UPDATE/DELETE sur cette
 * table (seuls des INSERT/SELECT côté client ; les triggers de traçabilité sont
 * SECURITY DEFINER).
 *
 * Le correctif vit en base (migration `20261030000001`). Ce test verrouille
 * l'invariant contre une dérive de migration, sans dépendre d'une base — même
 * patron que `member-deletion-guard.test.ts`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");
const GUARD_MIGRATION = "20261030000001_audit_entries_append_only.sql";

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

describe("R140 — journal d'audit en ajout seul", () => {
  it("la migration de garde retire les politiques DELETE et UPDATE", () => {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, GUARD_MIGRATION), "utf8");
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS audit_entries_delete ON public\.audit_entries/,
    );
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS audit_entries_update ON public\.audit_entries/,
    );
  });

  it("AUCUNE migration postérieure ne recrée une politique DELETE/UPDATE sur audit_entries", () => {
    const files = migrationFiles();
    const idx = files.indexOf(GUARD_MIGRATION);
    expect(idx).toBeGreaterThan(-1);
    const later = files.slice(idx + 1);
    for (const f of later) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, f), "utf8");
      const recreates =
        /CREATE POLICY[^;]*ON public\.audit_entries[^;]*FOR (DELETE|UPDATE)/is.test(
          sql,
        );
      expect(recreates, `${f} recrée une politique DELETE/UPDATE d'audit`).toBe(
        false,
      );
    }
  });

  it("la migration de garde est réversible (les 2 politiques sont restaurables)", () => {
    const rb = readFileSync(
      resolve(MIGRATIONS_DIR, "rollback/20261030000001_rollback.sql"),
      "utf8",
    );
    expect(rb).toMatch(/CREATE POLICY audit_entries_delete ON public\.audit_entries/);
    expect(rb).toMatch(/CREATE POLICY audit_entries_update ON public\.audit_entries/);
  });
});
