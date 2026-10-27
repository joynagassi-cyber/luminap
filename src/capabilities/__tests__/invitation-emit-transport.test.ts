/**
 * Tâche 3 — transports d'invitation : émission du code + payload QR.
 *
 * Verrouille la chaîne d'ÉMISSION (jusqu'ici non couverte) :
 *   - `generateCode()` produit `LUM-XXXXXX` (alphabet sans ambiguïté) ;
 *   - `buildQRPayload()` construit un payload **v2** complet (scope granulaire,
 *     grants, tags) ;
 *   - `buildQRPayload` → JSON → `parseQRPayload` fait un **round-trip fidèle**
 *     (c'est le canal réel : l'émetteur sérialise, le réclamant parse) ;
 *   - les 4 transports (code, QR, collage, fichier) partagent le même moteur.
 */

import { describe, it, expect } from "vitest";
import {
  generateCode,
  buildQRPayload,
  parseQRPayload,
  importInvitationFromFile,
  type ClaimPayload,
} from "../invitation";

describe("Tâche 3 — émission : generateCode", () => {
  it("respecte le format LUM-XXXXXX (6 caractères, alphabet sans ambiguïté)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code).toMatch(/^LUM-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      // Pas de caractères ambigus (I, O, 0, 1)
      expect(code.slice(4)).not.toMatch(/[IO01]/);
    }
  });
});

describe("Tâche 3 — émission : buildQRPayload (v2)", () => {
  const baseInput = {
    orgId: "org-1",
    targetRole: "ANCIEN",
    targetScopeType: "ORG" as const,
  };

  it("produit un payload v2 avec code, scope.type et dates", () => {
    const payload = buildQRPayload(baseInput as any, "LUM-ABC234");
    expect(payload.v).toBe(2);
    expect(payload.code).toBe("LUM-ABC234");
    expect(payload.orgId).toBe("org-1");
    expect(payload.role).toBe("ANCIEN");
    expect(payload.scope.type).toBe("ORG");
    expect(payload.issuedAt).toBeTruthy();
    expect(payload.expiresAt).toBeTruthy();
    // invitationId est vide à la construction (rempli après écriture PS)
    expect(payload.invitationId).toBe("");
  });

  it("transporte le scope granulaire libre (resource/id) — invariant 8", () => {
    const payload = buildQRPayload(
      {
        ...baseInput,
        targetScopeResource: "event",
        targetScopeId: "evt-42",
      } as any,
      "LUM-ABC234",
    );
    expect(payload.scope.resource).toBe("event");
    expect(payload.scope.id).toBe("evt-42");
  });

  it("transporte grants et tags (v2) — sinon tableau vide", () => {
    const withScope = buildQRPayload(
      {
        ...baseInput,
        grantsPayload: [{ resource: "event", action: "read" }] as any,
        tagsPayload: ["tag-1"],
      } as any,
      "LUM-ABC234",
    );
    expect(withScope.grants).toEqual([{ resource: "event", action: "read" }]);
    expect(withScope.tags).toEqual(["tag-1"]);

    const withoutScope = buildQRPayload(baseInput as any, "LUM-ABC234");
    expect(withoutScope.grants).toEqual([]);
    expect(withoutScope.tags).toEqual([]);
  });

  it("n'ajoute groupId que pour un scope GROUP", () => {
    const org = buildQRPayload(
      { ...baseInput, targetScopeType: "ORG" } as any,
      "LUM-ABC234",
    );
    expect(org.scope.groupId).toBeUndefined();

    const group = buildQRPayload(
      {
        ...baseInput,
        targetScopeType: "GROUP",
        targetGroupId: "grp-9",
      } as any,
      "LUM-ABC234",
    );
    expect(group.scope.groupId).toBe("grp-9");
  });

  it("round-trip fidèle buildQRPayload → JSON → parseQRPayload (canal émetteur→réclamant)", () => {
    const input = {
      ...baseInput,
      targetScopeResource: "report",
      targetScopeId: "rep-7",
      grantsPayload: [{ resource: "report", action: "read" }] as any,
      tagsPayload: ["t1", "t2"],
    };
    // L'émetteur complète invitationId après l'écriture PS (cf. createInvitation).
    const payload = { ...buildQRPayload(input as any, "LUM-XY2345"), invitationId: "inv-9" };
    // Ce que la caméra/le fichier reçoit réellement : la sérialisation JSON.
    const scanned = parseQRPayload(JSON.stringify(payload));
    expect(scanned).not.toBeNull();
    const s = scanned as ClaimPayload;
    expect(s.v).toBe(2);
    expect(s.code).toBe("LUM-XY2345");
    expect(s.role).toBe("ANCIEN");
    expect(s.scope.resource).toBe("report");
    expect(s.scope.id).toBe("rep-7");
    expect(s.grants).toEqual([{ resource: "report", action: "read" }]);
    expect(s.tags).toEqual(["t1", "t2"]);
  });

  it("un payload NON persisté (invitationId vide) est refusé au parse — partage après écriture PS", () => {
    // Comportement réel : `parseQRPayload` exige un invitationId non vide.
    // L'émetteur doit donc compléter le payload AVANT de le partager.
    const draft = buildQRPayload(baseInput as any, "LUM-ABC234");
    expect(draft.invitationId).toBe("");
    expect(parseQRPayload(JSON.stringify(draft))).toBeNull();
  });

  it("le transport FICHIER parse le même payload que le QR (moteur commun)", () => {
    const payload = { ...buildQRPayload(baseInput as any, "LUM-FL2345"), invitationId: "inv-fl" };
    const fromFile = importInvitationFromFile(JSON.stringify(payload));
    expect(fromFile).not.toBeNull();
    expect(fromFile!.code).toBe("LUM-FL2345");
    expect(fromFile!.orgId).toBe("org-1");
  });

  it("rejette un payload v2 incomplet (scope.type manquant)", () => {
    const broken = JSON.stringify({
      v: 2,
      orgId: "org-1",
      invitationId: "inv-1",
      code: "LUM-ABC234",
      role: "ANCIEN",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(parseQRPayload(broken)).toBeNull();
  });

  it("accepte encore un payload v1 (rétrocompatibilité du canal)", () => {
    const v1 = JSON.stringify({
      v: 1,
      orgId: "org-1",
      invitationId: "inv-1",
      code: "LUM-ABC234",
      role: "MEMBRE",
      scope: { type: "ORG" },
      memberId: null,
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    const parsed = parseQRPayload(v1);
    expect(parsed).not.toBeNull();
    expect(parsed!.v).toBe(1);
  });
});
