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
 *
 * NB : PAS de `import { cy } from 'cypress'` — `cy` est déjà dans le
 * contexte global du runner (supportFile cypress/support/e2e.ts) et
 * l'import résoudrait cypress/dist/cypress.js (réf. node:os, node:process)
 * que le bundler webpack de Cypress ne bundle pas.
 *
 * ⚠️ (Run R8, 2026-10-10) Le texte « Caisse principale » n'est PAS
 * affiché sur le Dashboard : c'est le nom du compte racine (seedé par
 * `useLocalStore` via `churchSeedData()`), mais le Dashboard ne le
 * rend que dans le CaisseCard du bloc « Caisses des groupes »
 * (groupAccounts.length > 0) — qui n'a aucune data dans le seed.
 * L'anchor réel du dashboard non-skeleton est le HeroCard : un
 * <button aria-label="Voir les détails de la caisse principale">
 * qui s'affiche toujours (même en solde 0). C'est lui qu'on teste.
 */

describe('Lumina — offline dashboard shell (no cloud)', () => {
  before(function () {
    cy.interceptCloud();
  });

  beforeEach(function () {
    // clearLocalStorage() APRES le seedLocalSession() : le `cy.session()`
    // du seed s'applique sur le DOM chargé, puis on efface les clés que
    // l'app n'a pas encore monté. Si on clear AVANT le seed, le seed
    // replante les clés et le clear les reprend — le spec fonctionne
    // mais pas pour la bonne raison (et le test 2 qui recharge /dashboard
    // voit les clés déjà là au 1er boot).
    cy.seedLocalSession();
  });

  it('renders the dashboard shell with caisse + bottom nav (not the skeleton)', function () {
    this.timeout(90_000);

    cy.visit('/dashboard');

    // Le HeroCard du dashboard non-skeleton est un <button> avec
    // aria-label="Voir les détails de la caisse principale" — c'est
    // l'anchor de la refonte P1 (le skeleton n'a PAS ce button).
    cy.get('button[aria-label="Voir les détails de la caisse principale"]', {
      timeout: 40_000,
    }).should('be.visible');

    // The BottomNav "Plus" button (native <button> with aria-label="Plus d'options").
    cy.get('button[aria-label="Plus d\'options"]', { timeout: 15_000 }).should('exist');

    // The empty "Derniers mouvements" state proves transactions=[] rendered,
    // NOT a loading block.
    cy.contains('Derniers mouvements', { timeout: 15_000 }).should('exist');
  });

  it('navigates to /finance via the bottom nav and lands on the finance page', function () {
    this.timeout(90_000);

    cy.visit('/dashboard');
    // Le dashboard non-skeleton est bien monté (le HeroCard est visible).
    cy.get('button[aria-label="Voir les détails de la caisse principale"]', {
      timeout: 40_000,
    }).should('be.visible');

    // "Finances" tab: native <button role="tab" aria-label="Finances">.
    cy.get('button[role="tab"][aria-label="Finances"]', { timeout: 15_000 }).click();
    cy.location('pathname', { timeout: 15_000 }).should('include', 'finance');

    // La page Finance n'affiche PAS le nom « Caisse principale » en
    // tant que tel (le compte racine est le compte de référence, mais
    // la page Finance liste les transactions, pas les accounts). On
    // vérifie que la page est bien rendue (pas le skeleton, pas
    // /dashboard) : le titre « Finances » (IonTitle) est l'anchor.
    cy.get('ion-title', { timeout: 15_000 }).should('contain', 'Finances');
  });
});
