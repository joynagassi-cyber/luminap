/**
 * R91 — Verrou anti-régression sur le durcissement RLS des invitations.
 *
 * Contexte : `invitations_select` (is_org_member) exposait `code` et
 * `target_role` de toutes les invitations à n'importe quel membre, et
 * `invitation_claims_insert` autorisait un claim au nom d'un profil déjà
 * ACTIF — enchaînement permettant à un MEMBRE de s'auto-promouvoir ADMIN
 * (prouvé sur l'instance dev, transaction annulée, cf. RISQUES.md R91).
 *
 * Ce test inspecte la migration corrective (pas d'exécution PowerSync dans
 * les tests unitaires) et échoue si quelqu'un réintroduit la politique
 * permissive. Le chemin réel est couvert par le rollback vérifié sur
 * l'instance dev.
 *
 * Run with: npx vitest run src/capabilities/__tests__/invitation-rls-hardening.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const migrationPath = resolve(
  __dirname,
  "../../../supabase/migrations/20261024000002_fix_invitation_secret_leak.sql",
);
const rollbackPath = resolve(
  __dirname,
  "../../../supabase/migrations/rollback/20261024000002_rollback.sql",
);

function read(p: string): string {
  return readFileSync(p, "utf-8");
}

describe("R91 — durcissement RLS des invitations", () => {
  it("la migration corrective existe", () => {
    expect(existsSync(migrationPath), `migration absente: ${migrationPath}`).toBe(true);
  });

  it("invitations_select n'est plus accordé au seul critère « membre de l'org »", () => {
    const sql = read(migrationPath);
    // La nouvelle politique doit exiger la capacité de gestion.
    expect(sql).toContain("CREATE POLICY invitations_select");
    expect(sql).toContain("can_manage_invitations");
    // La politique vulnérable ne doit plus être (re)créée.
    const recreated = sql
      .split("\n")
      .filter((l) => l.includes("CREATE POLICY invitations_select"));
    expect(recreated.length).toBe(1);
    const idx = sql.indexOf("CREATE POLICY invitations_select");
    const body = sql.slice(idx, sql.indexOf(";", idx));
    expect(body, "invitations_select ne doit plus utiliser is_org_member").not.toContain(
      "is_org_member",
    );
  });

  it("invitation_claims_insert interdit un claim au nom d'un profil déjà ACTIF", () => {
    const sql = read(migrationPath);
    expect(sql).toContain("CREATE POLICY invitation_claims_insert");
    const idx = sql.indexOf("CREATE POLICY invitation_claims_insert");
    const body = sql.slice(idx, sql.indexOf(";", idx));
    expect(body).toContain("profiles");
    expect(body).toContain("ACTIVE");
    expect(body).toContain("resulting_user_id");
  });

  it("un rollback documenté est fourni", () => {
    expect(existsSync(rollbackPath), `rollback absent: ${rollbackPath}`).toBe(true);
    expect(read(rollbackPath)).toContain("DROP POLICY IF EXISTS invitations_select");
  });
});
