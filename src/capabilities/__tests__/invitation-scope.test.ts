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

function readDataLayer(): string {
  return readFileSync(dataLayerPath, "utf-8");
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
});
