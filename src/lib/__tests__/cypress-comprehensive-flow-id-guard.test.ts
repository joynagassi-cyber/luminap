// @vitest-environment node
/**
 * Garde anti-récurrence R135 (ex-R133) — dérivation de l'id de transaction
 * dans `comprehensive-flow.cy.ts`.
 *
 * Défaut d'origine (R133) : après « Enregistrer la transaction », la spec
 * dérivait l'id par `url.split('/transaction/')[1]`. Or `/transaction/new`
 * SATISFAIT `should('include', '/transaction/')` → l'id valait `"new"` → la
 * spec visitait `/transaction/new/edit` → « Transaction introuvable ».
 *
 * Correctif (`d38ee9d`) : assertion `should('not.include', '/new')` placée
 * AVANT la dérivation de l'id. Cette garde statique verrouille l'ordre des
 * trois étapes pour que la fragilité ne revienne pas silencieusement.
 *
 * Statique (lecture du source) : aucune dépendance Cypress/etemaged network,
 * donc vérifiable en CI unitaire sans navigateur.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SPEC = join(
  process.cwd(),
  "cypress",
  "e2e",
  "comprehensive-flow.cy.ts",
);

describe("R135 — comprehensive-flow dérive un id de transaction réel (pas \"new\")", () => {
  it("la spec exclut explicitement '/new' AVANT de dériver l'id", () => {
    const src = readFileSync(SPEC, "utf8");

    const includeIdx = src.indexOf("should('include', '/transaction/')");
    const notNewIdx = src.indexOf("should('not.include', '/new')");
    const splitIdx = src.indexOf("split('/transaction/')");

    // Non-vacuité : les trois marqueurs doivent exister (sinon la spec a été
    // restructurée et cette garde ne garde plus rien → échec explicite).
    expect(includeIdx, "marqueur \"include '/transaction/'\" introuvable").toBeGreaterThan(-1);
    expect(notNewIdx, "marqueur \"not.include '/new'\" introuvable (régression R133 ?)").toBeGreaterThan(-1);
    expect(splitIdx, "dérivation de l'id (split('/transaction/')) introuvable").toBeGreaterThan(-1);

    // L'ordre est la garde : on exclut '/new' avant de lire l'id.
    expect(
      notNewIdx,
      "l'assertion not.include('/new') doit précéder la dérivation de l'id",
    ).toBeLessThan(splitIdx);
    expect(
      includeIdx,
      "l'assertion include('/transaction/') doit précéder not.include('/new')",
    ).toBeLessThan(notNewIdx);
  });
});
