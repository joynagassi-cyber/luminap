// @vitest-environment node
/**
 * Garde R167 — journal d'audit (`audit_entries`) réellement en AJOUT SEUL.
 *
 * R140 (migration 20261030000001) a retiré les politiques RLS UPDATE/DELETE —
 * mais la RLS n'est pas la dernière barrière : PowerSync écrit en service_role
 * (BYPASSRLS) et l'API REST/service_role ne l'applique pas. `audit_entries`
 * n'ayant aucun trigger, un client forgé pouvait UPDATE/DELETE une trace
 * (anti-traçabilité — exactement ce que R140 voulait interdire).
 *
 * Cette garde verrouille :
 *   1. la présence du trigger BEFORE UPDATE OR DELETE + de sa fonction ;
 *   2. le blocage INCONDITIONNEL (le journal ne se modifie/supprime jamais) ;
 *   3. le code d'erreur `23514` (classe 23) que le connecteur PowerSync jette ;
 *      un `P0001` tomberait en retry infini.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

const R167_FILE = "20261104000009_guard_audit_entries_append_only.sql";

function migrationsInOrder(): { name: string; sql: string }[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(resolve(migrationsDir, name), "utf8") }));
}

/** État final d'un trigger (true = présent) sur `audit_entries`. */
function triggerPresent(name: string): boolean {
  let present = false;
  for (const { sql } of migrationsInOrder()) {
    if (new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${name}\\b`, "i").test(sql)) present = false;
    if (new RegExp(`CREATE\\s+TRIGGER\\s+${name}\\b`, "i").test(sql)) present = true;
  }
  return present;
}

const r167 = readFileSync(resolve(migrationsDir, R167_FILE), "utf8");

describe("R167 — journal d'audit append-only au niveau trigger (base)", () => {
  it("le trigger BEFORE UPDATE OR DELETE existe (état final présent)", () => {
    expect(triggerPresent("guard_audit_entries_append_only")).toBe(true);
    expect(r167).toMatch(/CREATE TRIGGER guard_audit_entries_append_only\b/);
    expect(r167).toMatch(/BEFORE UPDATE OR DELETE ON public\.audit_entries/);
  });

  it("bloque inconditionnellement (ni modification ni suppression)", () => {
    expect(r167).toMatch(/AUDIT_ENTRIES_APPEND_ONLY/);
    expect(r167).not.toMatch(/WHEN\s*\(/i); // pas de clause WHEN : blocage total
  });

  it("utilise un code d'erreur de classe 23 (23514) que PowerSync jette (pas P0001)", () => {
    expect(r167).toMatch(/ERRCODE = '23514'/);
    expect(r167).not.toMatch(/ERRCODE = 'P0001'/);
  });

  it("reste réversible (fichier de rollback présent)", () => {
    const rollback = resolve(migrationsDir, "rollback/20261104000009_rollback.sql");
    const sql = readFileSync(rollback, "utf8");
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS guard_audit_entries_append_only/);
  });
});
