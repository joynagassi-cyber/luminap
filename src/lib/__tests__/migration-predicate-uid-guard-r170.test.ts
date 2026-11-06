// @vitest-environment node
/**
 * Garde R170 — fermeture de l'oracle d'appartenance/rôle des prédicats RLS.
 *
 * DÉFAUT : `is_org_member(uid, org_id)`, `is_org_admin(p_uid, p_org_id)`,
 * `has_permission(p_uid, …)`, `can_manage_invitations(p_uid, …)` et
 * `org_descendants(p_uid)` sont SECURITY DEFINER et exécutables par
 * `authenticated` ; ils acceptaient un `uid` ARBITRAIRE → un membre pouvait
 * sonder l'appartenance / le rôle / une permission / la hiérarchie d'un tiers.
 *
 * Cette garde verrouille :
 *   1. la présence des 5 fonctions gardées dans la migration R170 ;
 *   2. le garde `p_uid/uid IS DISTINCT FROM public.initplan_uid()` ;
 *   3. l'exemption `pg_trigger_depth() = 0` sur `can_manage_invitations`
 *      (appelée par `settle_invitation_claim` avec l'uid de l'ÉMETTEUR) ;
 *   4. le code d'erreur `42501` ;
 *   5. la réversibilité (rollback qui restaure les corps SQL d'origine).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");
const R170_FILE = "20261104000010_predicate_uid_guard.sql";
const r170 = readFileSync(resolve(migrationsDir, R170_FILE), "utf8");

describe("R170 — garde d'identité des prédicats RLS (oracle fermé)", () => {
  it("les 5 prédicats sont redéfinis", () => {
    for (const fn of [
      "is_org_member",
      "is_org_admin",
      "has_permission",
      "can_manage_invitations",
      "org_descendants",
    ]) {
      expect(r170, `fonction ${fn} absente de la migration R170`).toMatch(
        new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\b`),
      );
    }
  });

  it("chaque prédicat compare l'uid reçu à initplan_uid() (= auth.uid())", () => {
    const guard = /IS DISTINCT FROM public\.initplan_uid\(\)/g;
    const matches = r170.match(guard) ?? [];
    // 5 prédicats (can_manage_invitations et org_descendants inclus).
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("can_manage_invitations exempte les appels de déclencheur (pg_trigger_depth)", () => {
    // L'appel interne de settle_invitation_claim porte l'uid de l'ÉMETTEUR :
    // sans cette exemption, l'acceptation d'invitation casserait.
    expect(r170).toMatch(/pg_trigger_depth\(\)\s*=\s*0/);
  });

  it("utilise le code d'erreur 42501 (insufficient_privilege)", () => {
    expect(r170).toMatch(/ERRCODE = '42501'/);
  });

  it("reste réversible (rollback restauré)", () => {
    const rollback = readFileSync(
      resolve(migrationsDir, "rollback/20261104000010_rollback.sql"),
      "utf8",
    );
    for (const fn of ["is_org_member", "is_org_admin", "has_permission", "can_manage_invitations", "org_descendants"]) {
      expect(rollback, `rollback sans ${fn}`).toMatch(
        new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\b`),
      );
    }
  });
});
