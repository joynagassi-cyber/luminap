/**
 * Cypress E2E — Offline smoke: dashboard shell, bottom nav, 404.
 *
 * NO cloud required. A synthetic Supabase session is seeded into localStorage
 * (cy.seedLocalSession) so the RouteGuard passes offline, and Supabase/PowerSync
 * REST is intercepted to prove zero network dependency.
 */

describe('Lumina — offline smoke (no cloud)', () => {
  before(function () {
    cy.interceptCloud(); // abort all Supabase + PowerSync REST
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession();
  });

  it('renders the dashboard shell with the bottom nav', function () {
    this.timeout(60_000);

    cy.visit('/dashboard');
    // Dashboard shows the org greeting + caisse cards + bottom nav.
    cy.contains('Caisse principale', { timeout: 20_000 }).should('be.visible');
    // Bottom nav: IonTabBar renders div[role=tablist]; no <nav> tag exists.
    cy.get('[role="tablist"]').should('be.visible');
    // The "Plus" More button is present in the bottom bar.
    cy.contains('button', 'Plus').should('be.visible');
  });

  it('switches tabs via the aria-labelled bottom nav', function () {
    this.timeout(60_000);

    cy.visit('/dashboard');
    cy.get('[role="tablist"]').should('be.visible');

    // Groupes tab.
    cy.get('[role="tablist"] [aria-label="Groupes"]').click();
    cy.location('pathname').should('include', 'groups');

    // Finances tab.
    cy.get('[role="tablist"] [aria-label="Finances"]').click();
    cy.location('pathname').should('include', 'finance');
  });

  it('falls back to the 404 catch-all for unknown routes', function () {
    this.timeout(60_000);

    cy.visit('/nonexistent-route');
    cy.contains('Page introuvable', { timeout: 20_000 }).should('be.visible');
  });
});
