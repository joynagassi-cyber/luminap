/**
 * R111 — Verrou anti-régression : « inscription obligatoire avant le claim ».
 *
 * DÉFAUT (prouvé sur l'instance dev, cf. RISQUES.md R111) :
 * `claimInvitation` générait un `crypto.randomUUID()` pour le profil PENDING.
 * Or deux FK NON deferrable interdisent cet id :
 *   - `profiles.id → auth.users(id)` ;
 *   - `org_memberships.user_id → auth.users(id)` (posée par le trigger).
 * De plus la RLS `profiles_insert_self` exige `initplan_uid() = id`.
 * Résultat mesuré : `23503` à l'upload ET au règlement, `42501` à l'insertion
 * locale → le parcours « un invité réclame une invitation » était inopérant.
 *
 * CORRECTIF : le claim exige une session Auth et lie le profil à
 * `auth.uid()`. Le profil local n'écrit QUE `status='PENDING'` (role/org_id
 * immuables côté client ; le trigger SECURITY DEFINER `settle_invitation_claim`
 * applique le rôle + l'organisation de l'invitation).
 *
 * Ce test inspecte le source (pas d'exécution PowerSync en unitaire) et échoue
 * si quelqu'un réintroduit l'UUID aléatoire ou retire la garde d'authentification.
 *
 * Run with: npx vitest run src/capabilities/__tests__/invitation-claim-auth-required.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const servicePath = resolve(__dirname, "../invitation/index.ts");
const claimPagePath = resolve(__dirname, "../../pages/InvitationClaim.tsx");

function read(p: string): string {
  return readFileSync(p, "utf-8");
}

/** Extract the body of `claimInvitation` (until the next `\n  }\n`). */
function claimInvitationBody(): string {
  const src = read(servicePath);
  const start = src.indexOf("async claimInvitation(");
  expect(start, "claimInvitation introuvable").toBeGreaterThan(-1);
  const end = src.indexOf("\n  }\n", src.indexOf("{", start));
  return src.slice(start, end);
}

describe("R111 — inscription obligatoire avant le claim", () => {
  it("claimInvitation exige une session Auth (AUTH_REQUIRED)", () => {
    const body = claimInvitationBody();
    expect(body).toContain("authService.getSession()");
    expect(body).toContain("AUTH_REQUIRED");
  });

  it("claimInvitation n'invente PLUS d'id utilisateur (crypto.randomUUID banni)", () => {
    const body = claimInvitationBody();
    // L'id du profil DOIT venir de la session, jamais d'un UUID aléatoire.
    expect(body).not.toContain("crypto.randomUUID()");
    expect(body).toContain("session?.user?.id");
  });

  it("le profil local ne réécrit PAS role/org_id (gardes ROLE/ORG_IMMUTABLE)", () => {
    const body = claimInvitationBody();
    // L'UPSERT ne doit poser que status='PENDING' en conflit.
    expect(body).toMatch(/ON CONFLICT \(id\) DO UPDATE SET status = 'PENDING'/);
    // Le rôle/org de l'invitation ne doit PAS être écrit par le client.
    expect(body).not.toContain("payload.role,");
    expect(body).not.toContain("payload.orgId,\n        now");
  });

  it("la page de claim guide vers l'inscription sans session", () => {
    const src = read(claimPagePath);
    expect(src).toContain('navigate("/auth")');
    expect(src).toContain("Créez d'abord votre compte");
  });
});
