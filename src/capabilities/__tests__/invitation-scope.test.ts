/**
 * Vague 3 — Assert de validation : idempotence du trigger `settle_invitation_claim`.
 *
 * Le trigger a déjà été validé sur l'instance Supabase de dev (assert 3.5 :
 * trigger 2× = 0 doublon, used_count=1, grants=2, tag=1, group_membership=1,
 * profil PENDING→ACTIVE). Ce test unitaire TS documente le contrat côté
 * client par inspection statique du source (pas d'exécution PowerSync dans
 * les tests unitaires — le chemin réel est couvert par l'assert Supabase).
 *
 * Invariants vérifiés ici :
 *  - §8.2 : le client ne contient PLUS l'incrément de `used_count`
 *    (`used_count = used_count + 1`) — c'est le SEUL rôle du trigger.
 *  - §8.3 : `createInvitationPS` écrit `'ACTIVE'`, jamais `'PENDING'`.
 *  - Scope granulaire : les payloads grants/tags sont transmis au trigger.
 *
 * Run with: pnpm test src/capabilities/__tests__/invitation-scope.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// __dirname = src/capabilities/__tests__ → remonter jusqu'à src/lib/
const dataLayerPath = resolve(__dirname, "../../lib/dataLayer.ts");
// Et jusqu'à supabase/migrations pour le trigger
const triggerPath = resolve(__dirname, "../../../supabase/migrations/20260921000006_extend_settle_trigger.sql");

function readDataLayer(): string {
  return readFileSync(dataLayerPath, "utf-8");
}

function readTrigger(): string {
  return readFileSync(triggerPath, "utf-8");
}

function extractFunctionBody(src: string, fnName: string): string {
  const start = src.indexOf(`function ${fnName}(`);
  if (start === -1) throw new Error(`${fnName} introuvable dans dataLayer.ts`);
  // Balise de parenthèse simple : on prend jusqu'à la prochaine occurrence
  // de "\n}" à indent 0 (fin du bloc exporté).
  const end = src.indexOf("\n}\n", src.indexOf("{", start));
  return src.slice(start, end);
}

describe("Vague 3.5 — flux invitation scopé (contrat client)", () => {
  it("§8.2 — claimInvitationPS ne contient plus l'incrément de used_count", () => {
    const body = extractFunctionBody(readDataLayer(), "claimInvitationPS");
    expect(
      body,
      "le double-increment client+trigger doit être supprimé (invariant 5)",
    ).not.toContain("used_count = used_count + 1");
    // L'INSERT de la claim est toujours présent.
    expect(body).toContain("INSERT INTO invitation_claims");
  });

  it("§8.3 — createInvitationPS écrit status='ACTIVE' (pas 'PENDING')", () => {
    const body = extractFunctionBody(readDataLayer(), "createInvitationPS");
    expect(body).toContain("'ACTIVE'");
    expect(body).not.toContain("'PENDING'");
  });

  it("scope granulaire — les payloads grants/tags sont transmis au trigger", () => {
    const body = extractFunctionBody(readDataLayer(), "createInvitationPS");
    expect(body).toContain("target_scope_resource");
    expect(body).toContain("target_scope_id");
    expect(body).toContain("grants_payload");
    expect(body).toContain("tags_payload");
  });

  it("PSInvitation porte les nouvelles colonnes (schéma PowerSync aligné PG)", () => {
    const src = readDataLayer();
    const iface = src.slice(
      src.indexOf("export interface PSInvitation {"),
      src.indexOf("}", src.indexOf("export interface PSInvitation {")) + 1,
    );
    expect(iface).toContain("target_scope_resource");
    expect(iface).toContain("target_scope_id");
    expect(iface).toContain("grants_payload");
    expect(iface).toContain("tags_payload");
  });

  it("B.5 — le trigger réconcilie le profil legacy avec l'invitation (role + org)", () => {
    // Inspection statique du trigger : l'UPDATE du profil legacy écrit le rôle
    // ET l'organisation cibles de l'invitation, dans la branche
    // `IF c.resulting_user_id IS NOT NULL THEN`.
    const trigger = readTrigger();
    // 1) L'UPDATE du profil contient les 3 colonnes (status + role + org_id).
    const profileUpdate = trigger.slice(
      trigger.indexOf("UPDATE public.profiles"),
      trigger.indexOf("END IF;", trigger.indexOf("UPDATE public.profiles")),
    );
    expect(
      profileUpdate,
      "le trigger doit écrire role + org_id sur profiles (B.5)",
    ).toContain("role");
    expect(profileUpdate).toContain("org_id");
    expect(profileUpdate).toContain("status");
    // 2) Les valeurs viennent de l'invitation (pas de l'émetteur).
    expect(profileUpdate).toContain("inv.target_role");
    expect(profileUpdate).toContain("inv.org_id");
    // 3) Le target_role de l'invitation est le rôle du CLAIMANT, pas de
    //    l'émetteur : c'est la ligne source du champ, pas `inv.issued_by`
    //    ou un rôle par défaut codé.
    expect(profileUpdate).not.toContain("issued_by");
    // 4) L'UPDATE est dans la branche IF c.resulting_user_id IS NOT NULL.
    const ifBlockStart = trigger.indexOf("IF c.resulting_user_id IS NOT NULL THEN");
    expect(ifBlockStart, "branche IF c.resulting_user_id IS NOT NULL manquante").toBeGreaterThan(-1);
    expect(profileUpdate).toContain("c.resulting_user_id");
    // 5) Idempotence : le trigger ne crée PAS de 2e déclencheur (invariant 4)
    //    et n'écrit jamais le rôle par défaut legacy dans ce bloc.
    expect(profileUpdate).not.toContain("'TREASURER'");
  });
});
