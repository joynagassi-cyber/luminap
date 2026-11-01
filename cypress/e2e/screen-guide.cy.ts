/**
 * Cypress E2E — Guide visuel intégré au tutoriel (Phase 13).
 *
 * Vérifie que les captures ANNOTÉES produites par le harnais
 * (`cypress/e2e/screenshots.cy.ts` → `scripts/visual-docs/build.py`) sont
 * réellement INTÉGRÉES au tutoriel in-app :
 *   - la section « Transactions » affiche une capture annotée chargée
 *     (`naturalWidth > 0`, donc le WebP existe et est servi) ;
 *   - la légende numérotée accompagne l'image ;
 *   - une section sans capture n'affiche aucun cadre vide.
 *
 * Offline (`cy.interceptCloud` + réplique locale) : indépendant du cloud.
 */
describe("Lumina — guide visuel du tutoriel (captures annotées)", () => {
  before(function () {
    this.timeout(90_000);
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession({ role: "PASTEUR_PRINCIPAL" });
    cy.visit("/sessions");
    cy.seedOrgReplica();
  });

  it("la section « Transactions » montre une capture annotée réellement chargée", function () {
    this.timeout(120_000);
    cy.visit("/tutoriel");
    // La galerie de la section par défaut peut ne rien contenir : on ouvre
    // explicitement l'onglet « Transactions ».
    cy.contains('button[role="tab"]', "Transactions", { timeout: 40_000 }).click();

    cy.get('[data-testid="screen-guide-gallery"]', { timeout: 20_000 }).should(
      "exist",
    );
    cy.get('[data-testid="screen-guide-12-transaction-new"]').within(() => {
      cy.get("img")
        .should("be.visible")
        .and(($img) => {
          // Preuve que l'image est SERVIE (pas un 404) : dimensions natives.
          expect(
            ($img[0] as HTMLImageElement).naturalWidth,
            "la capture annotée doit être chargée depuis /tutorial/screens",
          ).to.be.greaterThan(0);
        });
      // La légende numérotée accompagne l'image.
      cy.get("figcaption ol li").should("have.length.gte", 1);
    });
  });

  it("une section sans capture ne rend pas de galerie vide", function () {
    this.timeout(120_000);
    cy.visit("/tutoriel");
    cy.contains('button[role="tab"]', "Signaler un problème", {
      timeout: 40_000,
    }).click();
    cy.get('[data-testid="screen-guide-gallery"]').should("not.exist");
  });
});
