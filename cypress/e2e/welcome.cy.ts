/**
 * Cypress E2E — Écran d'accueil mobile `/welcome` (onboarding avant /auth).
 *
 * Contrat : un visiteur SANS session qui ouvre l'app doit d'abord voir un
 * écran d'accueil chaleureux (illustration + message inspirant + bouton), et
 * non un formulaire froid. Cet écran est un écran natif Ionic plein écran
 * (PAS une landing page web) : pas de sections marketing, juste l'accueil et
 * le passage vers /auth.
 *
 * Le spec est OFFLINE (`cy.interceptCloud`) : il ne dépend ni de PowerSync ni
 * du réseau, comme `zero-black-screen.cy.ts`.
 */
describe("Lumina — écran d'accueil /welcome", () => {
  before(function () {
    this.timeout(120_000);
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
  });

  it("rend l'écran d'accueil avec son message inspirant", function () {
    this.timeout(60_000);
    cy.visit("/welcome");
    // Titre évocateur + accroche (le message inspirant de la demi-page).
    cy.contains("Votre organisation", { timeout: 30_000 }).should("be.visible");
    cy.get('[data-screen-state="ready"]').should("exist");
    // L'illustration SVG est présente (pas d'image externe → jamais cassée).
    cy.get("svg[role='img']").should("exist");
  });

  it("mène à la connexion / inscription via « Commencer »", function () {
    this.timeout(60_000);
    cy.visit("/welcome");
    cy.contains("button", "Commencer", { timeout: 30_000 }).click();
    cy.location("pathname", { timeout: 30_000 }).should("eq", "/auth");
    cy.get('input[type="email"]', { timeout: 30_000 }).should("be.visible");
  });

  it("mène à la connexion via « J'ai déjà un compte »", function () {
    this.timeout(60_000);
    cy.visit("/welcome");
    cy.contains("button", "J'ai déjà un compte", { timeout: 30_000 }).click();
    cy.location("pathname", { timeout: 30_000 }).should("eq", "/auth");
  });

  it("sans session, `/` aboutit à l'accueil (ou /splash) puis jamais un écran noir", function () {
    this.timeout(90_000);
    cy.visit("/");
    cy.location("pathname", { timeout: 60_000 }).should((p) => {
      expect(p, "sans session, l'entrée doit mener à /welcome ou /splash").to.be.oneOf([
        "/welcome",
        "/splash",
      ]);
    });
    cy.get("div.ion-page:not(.ion-page-hidden)", { timeout: 60_000 })
      .should("have.length.gte", 1)
      .then(($pages) => {
        expect($pages[$pages.length - 1].children.length).to.be.greaterThan(0);
      });
  });
});
