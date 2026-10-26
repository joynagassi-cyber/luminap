/**
 * R103 — garde anti-escalade de `settle_invitation_claim`.
 *
 * DÉFAUT (réel, prouvé sur l'instance dev) : `settle_invitation_claim(uuid)`
 * était SECURITY DEFINER ET EXECUTE-able par `authenticated` via
 * `POST /rest/v1/rpc/settle_invitation_claim`. La fonction agit sur
 * `resulting_user_id` (un tiers) sans vérifier l'appelant : n'importe quel
 * utilisateur authentifié pouvait élever un tiers (profil ACTIVE + rôle/org
 * réécrits + org_memberships + grants).
 *
 * Ce test verrouille les 3 volets du correctif :
 *   1. garde `pg_trigger_depth() = 0` → refus de tout appel direct ;
 *   2. `REVOKE EXECUTE` sur la fonction et sur les fonctions de trigger ;
 *   3. wrappers de trigger en SECURITY DEFINER (pour continuer à appeler la
 *      fonction après le revoke).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

function readAll(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(resolve(migrationsDir, f), "utf8"))
    .join("\n");
}

describe("R103 — settle_invitation_claim n'est pas exposée en RPC", () => {
  const all = readAll();

  it("refuse tout appel direct via une garde pg_trigger_depth()", () => {
    expect(all).toMatch(
      /settle_invitation_claim[\s\S]*?pg_trigger_depth\(\) = 0[\s\S]*?RAISE EXCEPTION/,
    );
  });

  it("révoque EXECUTE sur settle_invitation_claim (PUBLIC/anon/authenticated)", () => {
    expect(all).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.settle_invitation_claim\(uuid\) FROM PUBLIC/,
    );
    expect(all).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.settle_invitation_claim\(uuid\) FROM anon, authenticated/,
    );
  });

  it("révoque EXECUTE sur les fonctions de trigger", () => {
    expect(all).toMatch(/prorettype = 'trigger'::regtype/);
    expect(all).toMatch(/REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC/);
  });

  it("rétablit SECURITY DEFINER sur les wrappers de trigger", () => {
    for (const fn of [
      "tg_settle_claim",
      "tg_settle_claims_on_invitation",
      "settle_pending_claims_for_invitation",
    ]) {
      expect(all).toMatch(
        new RegExp(`ALTER FUNCTION public\\.${fn}\\(\\) SECURITY DEFINER`),
      );
    }
  });
});
