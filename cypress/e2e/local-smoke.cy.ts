/**
 * Cypress E2E — Offline smoke (no cloud): 404 + navigation guard + auth form.
 *
 * These tests verify the router, the RouteGuard, and the 404 catch-all
 * without any cloud dependency. They work regardless of PowerSync state.
 */

describe('Lumina — offline smoke (no cloud)', () => {
  before(function () {
    cy.interceptCloud();
  });

  // ── 404 catch-all ───────────────────────────────────────────────────────
  it('falls back to the 404 catch-all for unknown routes', function () {
    this.timeout(60_000);
    cy.clearLocalStorage();
    cy.seedLocalSession();
    cy.visit('/nonexistent-route');
    cy.contains('Page introuvable', { timeout: 30_000 }).should('be.visible');
  });

  // ── Navigation guard: no session → /auth ───────────────────────────────
  it('redirects unauthenticated users to /auth', function () {
    this.timeout(60_000);
    cy.clearLocalStorage();
    // No seeded session → RouteGuard should bounce to /auth.
    cy.visit('/dashboard');
    cy.location("pathname", { timeout: 30_000 }).should("include", "auth");
  });

  // ── Auth page renders ──────────────────────────────────────────────────
  it('renders the /auth login form', function () {
    this.timeout(60_000);
    cy.clearLocalStorage();
    cy.visit('/auth');
    cy.get('input[type="email"]').should('be.visible');
    cy.contains('button', 'Se connecter').should('be.visible');
  });
});
