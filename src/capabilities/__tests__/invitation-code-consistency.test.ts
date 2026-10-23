/**
 * Invitation — cohérence du code entre persistance et affichage.
 *
 * RÉGRESSION PROUVÉE (corrigée ici) : `createInvitation` générait un code,
 * l'écrivait en base via `createInvitationPS`, puis renvoyait seulement l'`id`.
 * La page `/invitation/emit` appelait `generateCode()` UNE SECONDE FOIS pour
 * l'affichage du QR et le bouton « copier ». Le code montré à l'invité était
 * donc un code aléatoire DIFFÉRENT de la ligne persistée → aucune invitation ne
 * pouvait être réclamée (le claim cherche `code` en base, sans résultat).
 *
 * Le contrat testé : le code retourné par `createInvitation` DOIT être celui
 * qui a été persisté. Toute divergence casse la promesse faite à l'utilisateur.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

let inserted: Record<string, unknown> | null = null;

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({ execute: async () => ({ array: [] }) }),
}));

vi.mock("@/lib/dataLayer", () => ({
  // Fidèle au vrai writer : il utilise l'id fourni et le renvoie.
  createInvitationPS: vi.fn(async (row: Record<string, unknown>) => {
    inserted = row;
    return (row.id as string) ?? "inv-1";
  }),
  revokeInvitationPS: vi.fn(async () => {}),
  claimInvitationPS: vi.fn(async () => "claim-1"),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-A",
  setOrganizationId: () => {},
}));

vi.mock("@/lib/audit", () => ({
  auditLogRepo: {
    write: vi.fn(async () => {}),
    list: async () => [],
    getByEntity: async () => [],
  },
  writeAudit: vi.fn(async () => {}),
}));

import { invitation } from "../invitation";

describe("invitation — le code affiché est le code persisté", () => {
  beforeEach(() => {
    inserted = null;
  });

  it("createInvitation renvoie { id, code } et le code est EXACTEMENT celui persisté", async () => {
    const created = (await invitation.createInvitation({
      orgId: "org-A",
      targetRole: "MEMBRE",
      targetScopeType: "ORG",
      issuedBy: "user-1",
    } as never)) as unknown as { id: string; code: string };

    expect(inserted, "createInvitationPS doit avoir été appelé").not.toBeNull();
    expect(inserted!.code, "un code doit être persisté").toBeTruthy();

    // Le code montré à l'invité (QR + copier) doit être le code persisté.
    expect(created.code).toBe(inserted!.code);

    // L'id affiché/exporté doit être l'id transmis au writer (donc persisté) :
    // sinon l'export fichier et le claim visent une ligne inexistante.
    expect(inserted!.id, "l'id persisté doit être transmis par le service").toBe(
      created.id,
    );
    expect(created.id).toBeTruthy();
  });
});
