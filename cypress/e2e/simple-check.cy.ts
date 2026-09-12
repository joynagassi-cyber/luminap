/**
 * Cypress E2E — login → dashboard → finance navigation
 *
 * Migrated from: e2e-tests/simple-check.spec.ts (Playwright).
 *
 * NOTE ON AUTH: `authService.signInWithEmail` performs a real Supabase
 * network call. Set CYPRESS_TEST_EMAIL / CYPRESS_TEST_PASSWORD env vars to
 * a seeded test account. Without them the test skips the submission step
 * and asserts only that the form is rendered.
 */

describe('Lumina — login → finance bottom nav', () => {
  it('renders the AuthPage form (and submits it when test credentials are provided)', function () {
    this.timeout(180_000);

    const email = (Cypress.expose('TEST_EMAIL') as string) || '';
    const password = (Cypress.expose('TEST_PASSWORD') as string) || '';
    const hasCreds = Boolean(email && password);

    cy.visit('/auth');
    cy.get('h1').contains('Bon retour').should('be.visible');
    cy.get('input[type="email"]').first().should('be.visible');
    cy.get('input[type="password"]').first().should('be.visible');

    if (hasCreds) {
      cy.get('input[type="email"]').first().type(email);
      cy.get('input[type="password"]').first().type(password);
      cy.contains('button[type="submit"]', 'Se connecter').click();

      // After a fresh login the app goes through onboarding before
      // reaching the dashboard — cy.login + cy.skipOnboarding cover both.
      cy.skipOnboarding();

      // Bottom nav: Finance tab.
      cy.get('nav [aria-label="Finances"]').click();
      cy.location('pathname').should('include', 'finance');
    }

    cy.then(() => {
      console.log(
        hasCreds
          ? '✅ CYPRESS PASSÉ — login → onboarding → finance nav opérationnelle'
          : '✅ CYPRESS PASSÉ (form rendu vérifié — pas de credentials pour soumission)',
      );
    });
  });
});
