/**
 * Cypress E2E — Offline dashboard shell (no cloud).
 *
 * Verifies that the real bug is fixed: after `cy.seedLocalSession()` +
 * `cy.interceptCloud()`, visiting /dashboard must render the shell
 * (caisse hero + BottomNav) instead of staying on the PageSkeleton.
 *
 * Pre-fix: `useTransactions` returned `isLoading: store.isLoading` (true
 * during the loadInitialData PowerSync getAll), so the dashboard showed
 * the skeleton forever. Post-fix: the fallback branch returns
 * `isLoading: false` and the seeded store (accounts + groups + caisses)
 * is available, so the shell renders.
 *
 * NOTE: BottomNav has been plain HTML buttons (no Ionic custom elements)
 * since commit 1b8b085 — the bar exposes `<nav data-testid="bottom-nav">`
 * with native `<button role="tab">` items and a "Plus" button.
 */

describe('Lumina — offline dashboard shell (no cloud)', () => {
  before(function () {
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession();
  });

  it('renders the dashboard shell with caisse + bottom nav (not the skeleton)', function () {
    this.timeout(90_000);

    cy.visit('/dashboard');

    // The "Caisse principale" hero card is the anchor: it is rendered by
    // the main (non-skeleton) dashboard branch, gated on
    // useTransactions().isLoading === false.
    cy.contains('Caisse principale', { timeout: 40_000 }).should('be.visible');

    // The BottomNav "Plus" button (native <button> with aria-label="Plus d'options").
    cy.get('button[aria-label="Plus d\'options"]', { timeout: 15_000 }).should('exist');

    // The empty "Derniers mouvements" state proves transactions=[] rendered,
    // NOT a loading block.
    cy.contains('Derniers mouvements', { timeout: 15_000 }).should('exist');
  });

  it('navigates to /finance via the bottom nav and renders the caisse', function () {
    this.timeout(90_000);

    cy.visit('/dashboard');
    cy.contains('Caisse principale', { timeout: 40_000 }).should('be.visible');

    // "Finances" tab: native <button role="tab" aria-label="Finances">.
    cy.get('button[role="tab"][aria-label="Finances"]', { timeout: 15_000 }).click();
    cy.location('pathname', { timeout: 15_000 }).should('include', 'finance');

    // The Finance page reads useAccounts() + useTransactions(); with the seed
    // it should list the "Caisse principale" account.
    cy.contains('Caisse principale', { timeout: 20_000 }).should('exist');
  });
});
