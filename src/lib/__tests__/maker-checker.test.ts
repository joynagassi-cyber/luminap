/**
 * PR8 — Approbation en deux étapes (maker-checker) : tests du NOYAU PUR.
 *
 * NON-VACUITÉ (preuve) : la règle centrale vit dans `canApprove`. En la
 * remplaçant temporairement par un `return { allowed: true }` (ou en retirant
 * la branche `enabled && createdById === actorId`), les cas « auto-approbation
 * refusée » ci-dessous ÉCHOUENT ; restaurer la branche les fait repasser. Le
 * même aller-retour a été fait sur `buildApproveTransaction` (test dédié
 * `maker-checker-approve-path.test.ts`).
 *
 * Ces tests n'exigent NI PowerSync NI React : `makerChecker.ts` reçoit la
 * valeur `enabled` et les permissions en entrée (déterminisme).
 */
import { describe, it, expect } from "vitest";
import {
  canApprove,
  resolveMakerCheckerEnabled,
  assertApprovable,
  toMakerCheckerError,
  MakerCheckerError,
  MAKER_CHECKER_SELF_APPROVAL,
  MAKER_CHECKER_MISSING_PERMISSION,
  MAKER_CHECKER_MESSAGES,
} from "@/lib/makerChecker";

const CREATOR = "user-creator";
const OTHER = "user-other";
const PERMITTED = ["transaction:approve"] as const;
const NOT_PERMITTED = ["transaction:read"] as const;

describe("canApprove — maker-checker ACTIVÉ", () => {
  it("refuse l'auto-approbation avec la raison « self-approval »", () => {
    const res = canApprove({
      transaction: { createdById: CREATOR },
      actorId: CREATOR,
      actorPermissions: PERMITTED,
      enabled: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("self-approval");
  });

  it("autorise un autre acteur disposant de la permission", () => {
    const res = canApprove({
      transaction: { createdById: CREATOR },
      actorId: OTHER,
      actorPermissions: PERMITTED,
      enabled: true,
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBeUndefined();
  });

  it("refuse un acteur sans permission, MÊME s'il n'est pas l'auteur", () => {
    const res = canApprove({
      transaction: { createdById: CREATOR },
      actorId: OTHER,
      actorPermissions: NOT_PERMITTED,
      enabled: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("missing-permission");
  });

  it("la permission manquante prime sur l'auto-approbation (auteur sans droit)", () => {
    // L'ordre des règles : refus par permission AVANT refus par auto-approbation.
    const res = canApprove({
      transaction: { createdById: CREATOR },
      actorId: CREATOR,
      actorPermissions: NOT_PERMITTED,
      enabled: true,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("missing-permission");
  });
});

describe("canApprove — maker-checker DÉSACTIVÉ (comportement historique)", () => {
  it("autorise l'auteur à approuver s'il possède la permission", () => {
    const res = canApprove({
      transaction: { createdById: CREATOR },
      actorId: CREATOR,
      actorPermissions: PERMITTED,
      enabled: false,
    });
    expect(res.allowed).toBe(true);
  });

  it("refuse toujours un acteur sans permission (le réglage ne change rien)", () => {
    const res = canApprove({
      transaction: { createdById: CREATOR },
      actorId: CREATOR,
      actorPermissions: NOT_PERMITTED,
      enabled: false,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("missing-permission");
  });
});

describe("canApprove — robustesse des valeurs d'auteur", () => {
  it("un auteur absent (null) n'est jamais égal à l'acteur", () => {
    const res = canApprove({
      transaction: { createdById: null },
      actorId: OTHER,
      actorPermissions: PERMITTED,
      enabled: true,
    });
    expect(res.allowed).toBe(true);
  });

  it("un auteur indéfini n'empêche pas un acteur autorisé d'approuver", () => {
    const res = canApprove({
      transaction: { createdById: undefined },
      actorId: OTHER,
      actorPermissions: PERMITTED,
      enabled: true,
    });
    expect(res.allowed).toBe(true);
  });
});

describe("resolveMakerCheckerEnabled — combinaison réglage + kill-switch", () => {
  it("n'est actif que si réglage ET drapeau sont vrais", () => {
    expect(resolveMakerCheckerEnabled(true, true)).toBe(true);
    expect(resolveMakerCheckerEnabled(true, false)).toBe(false);
    expect(resolveMakerCheckerEnabled(false, true)).toBe(false);
    expect(resolveMakerCheckerEnabled(false, false)).toBe(false);
  });
});

describe("assertApprovable — garde synchrone du chemin d'écriture", () => {
  it("lève une MakerCheckerError typée sur auto-approbation", () => {
    expect(() =>
      assertApprovable({ createdById: CREATOR }, CREATOR, { enabled: true }),
    ).toThrow(MakerCheckerError);
    try {
      assertApprovable({ createdById: CREATOR }, CREATOR, { enabled: true });
    } catch (err) {
      expect((err as MakerCheckerError).code).toBe(MAKER_CHECKER_SELF_APPROVAL);
    }
  });

  it("ne lève rien quand maker-checker est désactivé", () => {
    expect(() =>
      assertApprovable({ createdById: CREATOR }, CREATOR, { enabled: false }),
    ).not.toThrow();
  });

  it("lève un refus « permission manquante » quand les permissions sont fournies", () => {
    try {
      assertApprovable({ createdById: CREATOR }, OTHER, {
        enabled: false,
        actorPermissions: NOT_PERMITTED,
      });
      throw new Error("aurait dû lever");
    } catch (err) {
      expect((err as MakerCheckerError).code).toBe(
        MAKER_CHECKER_MISSING_PERMISSION,
      );
    }
  });
});

describe("messages FR et erreur typée", () => {
  it("les messages sont en français et non vides", () => {
    expect(MAKER_CHECKER_MESSAGES[MAKER_CHECKER_SELF_APPROVAL]).toMatch(
      /auteur.*approuver/i,
    );
    expect(MAKER_CHECKER_MESSAGES[MAKER_CHECKER_MISSING_PERMISSION]).toMatch(
      /permission/i,
    );
  });

  it("toMakerCheckerError renvoie null quand autorisé", () => {
    expect(toMakerCheckerError({ allowed: true })).toBeNull();
  });

  it("toMakerCheckerError mappe les raisons vers les codes typés", () => {
    expect(toMakerCheckerError({ allowed: false, reason: "self-approval" })?.code).toBe(
      MAKER_CHECKER_SELF_APPROVAL,
    );
    expect(
      toMakerCheckerError({ allowed: false, reason: "missing-permission" })?.code,
    ).toBe(MAKER_CHECKER_MISSING_PERMISSION);
  });
});
