// @vitest-environment node
/**
 * PM8 — suppression d'un membre → écritures orphelines.
 *
 * Défaut réel : `cotisations.membre_id ... ON DELETE CASCADE` (migration 0036).
 * Supprimer un membre détruisait silencieusement son historique financier.
 *
 * Le correctif vit en base (contrainte + trigger) ; ce test verrouille
 * l'invariant contre une dérive de migration, sans dépendre d'une base
 * (même patron que `permissions.test.ts` qui lit le SQL généré).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

const GUARD_MIGRATION = "20261026000008_guard_member_deletion.sql";

describe("PM8 — le lien financier membre→cotisations ne casque plus", () => {
  it("la migration de garde déclare ON DELETE RESTRICT", () => {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, GUARD_MIGRATION), "utf8");
    expect(sql).toMatch(/cotisations_membre_id_fkey[\s\S]*ON DELETE RESTRICT/);
  });

  it("AUCUNE migration postérieure ne réintroduit CASCADE sur ce lien", () => {
    const files = migrationFiles();
    const idx = files.indexOf(GUARD_MIGRATION);
    expect(idx).toBeGreaterThan(-1);
    const later = files.slice(idx + 1);
    for (const f of later) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, f), "utf8");
      const reAddsCascade =
        /cotisations_membre_id_fkey[\s\S]{0,200}ON DELETE CASCADE/.test(sql);
      expect(reAddsCascade, `${f} réintroduit CASCADE`).toBe(false);
    }
  });

  it("la migration de garde installe le trigger d'audit de suppression", () => {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, GUARD_MIGRATION), "utf8");
    expect(sql).toMatch(/CREATE TRIGGER trg_members_audit_delete/);
    expect(sql).toMatch(/AFTER DELETE ON public\.members/);
  });

  it("la migration de garde est réversible", () => {
    const rb = readFileSync(
      resolve(MIGRATIONS_DIR, "rollback/20261026000008_rollback.sql"),
      "utf8",
    );
    expect(rb).toMatch(/DROP TRIGGER IF EXISTS trg_members_audit_delete/);
    expect(rb).toMatch(/DROP FUNCTION IF EXISTS public\.members_audit_delete/);
  });
});
