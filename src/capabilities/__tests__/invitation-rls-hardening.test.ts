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

// ───────────────────────────────────────────────────────────────────────────
// R91.b — régression du claim : le `EXISTS (SELECT ... FROM invitations)`
// s'exécute sous la RLS de l'appelant ; depuis que `invitations_select` est
// restreint aux gestionnaires, un invité non gestionnaire ne « voit » pas la
// ligne → son claim était refusé (42501). Le contrôle est redondant avec la
// clé étrangère `invitation_claims_invitation_id_fkey`.
// ───────────────────────────────────────────────────────────────────────────
const regressionFixPath = resolve(
  __dirname,
  "../../../supabase/migrations/20261024000003_fix_claims_insert_regression.sql",
);
const regressionRollbackPath = resolve(
  __dirname,
  "../../../supabase/migrations/rollback/20261024000003_rollback.sql",
);

describe("R91.b — la politique de claim ne re-vérifie plus l'invitation sous RLS", () => {
  it("la migration corrective existe", () => {
    expect(existsSync(regressionFixPath), `migration absente: ${regressionFixPath}`).toBe(true);
  });

  it("invitation_claims_insert n'exige plus de lire la table invitations", () => {
    const sql = read(regressionFixPath);
    expect(sql).toContain("CREATE POLICY invitation_claims_insert");
    const idx = sql.indexOf("CREATE POLICY invitation_claims_insert");
    const body = sql.slice(idx, sql.indexOf(";", idx));
    // Le sous-SELECT soumis à RLS est la cause de la régression : interdit.
    // (La sous-requête `can_manage_invitations(...)` reste, mais elle n'est
    // atteinte que par un gestionnaire, qui voit la ligne.)
    expect(body).not.toContain("EXISTS (SELECT 1 FROM public.invitations");
    // La branche « gestionnaire » (sans danger : lui voit la ligne) reste.
    expect(body).toContain("can_manage_invitations");
  });

  it("un rollback documenté est fourni", () => {
    expect(existsSync(regressionRollbackPath)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// R91.c — défense en profondeur dans le trigger SECURITY DEFINER : refuser
// d'élever un profil DÉJÀ ACTIF, sauf si un gestionnaire d'invitations est
// l'auteur de l'invitation. C'est le seul endroit où la lecture des profils
// est fiable (le DEFINER ignore la RLS).
// ───────────────────────────────────────────────────────────────────────────
const hardenSettlePath = resolve(
  __dirname,
  "../../../supabase/migrations/20261024000004_harden_settle_claim.sql",
);
const hardenSettleRollbackPath = resolve(
  __dirname,
  "../../../supabase/migrations/rollback/20261024000004_rollback.sql",
);

describe("R91.c — garde anti-escalade dans settle_invitation_claim", () => {
  it("la migration de durcissement existe", () => {
    expect(existsSync(hardenSettlePath), `migration absente: ${hardenSettlePath}`).toBe(true);
  });

  it("le trigger refuse d'activer un profil déjà ACTIF non autorisé", () => {
    const sql = read(hardenSettlePath);
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.settle_invitation_claim");
    expect(sql).toContain("SECURITY DEFINER");
    // La garde doit tester le statut du profil cible et bloquer l'escalade.
    expect(sql).toContain("target_status = 'ACTIVE'");
    expect(sql).toContain("ROLE_ESCALATION_BLOCKED");
    expect(sql).toContain("can_manage_invitations(issued_by_uuid, inv.org_id)");
  });

  it("le rollback restaure le corps précédent (sans la garde)", () => {
    expect(existsSync(hardenSettleRollbackPath)).toBe(true);
    const rb = read(hardenSettleRollbackPath);
    expect(rb).toContain("CREATE OR REPLACE FUNCTION public.settle_invitation_claim");
    expect(rb).not.toContain("ROLE_ESCALATION_BLOCKED");
  });
});
