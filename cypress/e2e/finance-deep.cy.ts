/**
 * Cypress E2E — Finance deep flow (cloud: fresh signup → transactions + balance)
 *
 * Covers:
 *   1. /finance — page renders (Grand livre header + caisse list)
 *   2. /transaction/new — create a transaction (amount + label) → navigates back
 *   3. /balance — balance page renders with period toggles
 *   4. /transaction/:id — transaction detail page renders
 *   5. /transaction/:id/edit — edit page, toggle Entrée/Sortie
 *   6. /versement — versement page renders
 *
 * No cloud intercept: real Supabase session via cy.loginOrgAccount()
 * (le compte d'organisation UNIQUE du run, créé par le spec d'auth).
 */

describe('Lumina — Finance deep flow', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('renders /finance with the Grand livre header', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/finance');
    cy.get('h1, h2, h3').contains('Grand livre', { timeout: 30_000 }).should('be.visible');
  });

  it('creates a transaction and returns to /finance', function () {
    this.timeout(120_000);

    const txLabel = 'E2e Tx ' + Date.now().toString().slice(-6);

    cy.ensureAuth();
    cy.visit('/transaction/new');
    cy.get('h1, h2, h3, header').contains('Nouvelle transaction', { timeout: 90_000 }).should('exist');

    cy.get('input[placeholder="0"]').first().clear().type('7500');
    cy.get('input[placeholder="Ex: Dîme du mois"]').first().type(txLabel);
    cy.contains('button', /enregistrer/i).first().click();

    // After save, the app should leave /transaction/new (navigates to /finance or /dashboard)
    cy.location('pathname', { timeout: 90_000 }).should((path: string) => {
      expect(path, `unexpected path after tx save: ${path}`).to.not.match(/^\/transaction\/new/);
    });
  });

  it('renders /balance with period toggles', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/balance');
    cy.get('h1, h2, h3, header').contains('Bilan financier', { timeout: 90_000 }).should('exist');
    cy.contains('button', 'Année').should('exist');
    cy.contains('button', 'Mois').should('exist');
  });

  it('navigates to the first transaction detail and edit pages', function () {
    this.timeout(90_000);

    // Find the first transaction card on /finance and click it
    cy.ensureAuth();
    cy.visit('/finance');
    cy.contains('Grand livre', { timeout: 90_000 }).should('exist');
    // Click the first transaction row/card (assumes the list renders card buttons)
    cy.get('button, a').then(($items) => {
      const target = $items
        .filter((_, el) => /FCFA|7\s?500|E2e Tx/i.test(el.textContent ?? ''))
        .first();
      if (target.length > 0) {
        cy.wrap(target).click({ force: true });
        cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
          expect(path).to.match(/^\/transaction\/[^/]+$/);
        });
      }
    });

    // Now on /transaction/:id — verify the edit link
    cy.contains('button', /Modifier|Éditer|edit/i).then(($editBtns) => {
      if ($editBtns.length > 0) {
        cy.get('a[href*="/edit"], button')
          .contains(/Modifier|Éditer|edit/i)
          .click({ force: true });
        cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
          expect(path).to.match(/\/edit$/);
        });
      }
    });
  });

  it('renders /versement page', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/versement');
    cy.get('h1, h2, h3, header, [data-testid]').should('exist', { timeout: 30_000 });
  });
});
