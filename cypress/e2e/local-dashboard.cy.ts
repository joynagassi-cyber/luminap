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
 * NOTE: BottomNav uses ion-tab-bar + ion-tab-button (Ionic 9 custom
 * elements). The `ion-tab-button` elements render their own light-DOM
 * `<a>` with `role="tab"` and `aria-label`, but the inner `<span>`
 * (text "Plus", "Finances", etc.) is slotted. `cy.contains()` on the
 * outer element (ion-tab-button) works via the light-DOM span.
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

    // The BottomNav "Plus" button (ion-button in light DOM, text span).
    cy.contains('ion-button', 'Plus', { timeout: 15_000 }).should('exist');

    // The empty "Derniers mouvements" state proves transactions=[] rendered,
    // NOT a loading block.
    cy.contains('Derniers mouvements', { timeout: 15_000 }).should('exist');
  });

  it('navigates to /finance via the bottom nav and renders the caisse', function () {
    this.timeout(90_000);

    cy.visit('/dashboard');
    cy.contains('Caisse principale', { timeout: 40_000 }).should('be.visible');

    // "Finances" tab: ion-tab-button with aria-label="Finances".
    cy.get('ion-tab-button[aria-label="Finances"]', { timeout: 15_000 }).click();
    cy.location('pathname', { timeout: 15_000 }).should('include', 'finance');

    // The Finance page reads useAccounts() + useTransactions(); with the
    // seed it should list the "Caisse principale" account.
    cy.contains('Caisse principale', { timeout: 20_000 }).should('exist');
  });
});
