/**
 * Cypress E2E — Comprehensive navigation & finance flow
 *
 * Migrated from: e2e-tests/comprehensive-flow.spec.ts (Playwright).
 *
 * Credentials are read from cypress.config.ts `expose`. Skips when
 * credentials are absent.
 */

describe('Lumina — comprehensive navigation & finance flow', () => {
  before(function () {
    cy.requireCredentials();
    const email = Cypress.expose('TEST_EMAIL') as string;
    const password = Cypress.expose('TEST_PASSWORD') as string;
    cy.prepareSession(email, password);
  });

  it('navigates Settings, Balance, History, Events, and Transaction edit', function () {
    this.timeout(180_000);

    // ── Open More menu → Settings ──────────────────────────────────────
    cy.contains('button', 'Plus').click();
    cy.contains('button', 'Paramètres').click();
    cy.get('h1, h2, h3').contains('Paramètres').should('be.visible');

    // Refresh data
    cy.contains('button', 'Actualiser les données').click();

    // ── Financial report → Balance ─────────────────────────────────────
    cy.contains('button', 'Bilan financier').click();
    cy.get('h1, h2, h3').contains('Bilan financier').should('be.visible');
    cy.location('pathname').should('include', 'balance');

    // Toggle period
    cy.contains('button', 'Année').click();
    cy.contains('button', 'Mois').click();
    cy.contains('button', 'Mois').should('be.visible');

    // Summary stat cards
    cy.contains('Entrées').first().click();
    cy.contains('Sorties').first().click();

    // Export PDF
    cy.contains('button', 'Exporter le rapport').click();
    cy.contains('button', 'PDF').first().click();

    // ── History ────────────────────────────────────────────────────────
    cy.contains('button', 'Plus').click();
    cy.contains('button', 'Historique').click();
    cy.get('h1, h2, h3').contains('Historique').should('be.visible');

    cy.contains('button', 'Ce mois').click();
    cy.contains('button', 'Cette année').click();
    cy.contains('button', 'Tout').click();

    cy.contains('button', 'Retour').click();

    // ── Events ─────────────────────────────────────────────────────────
    cy.contains('button', 'Plus').click();
    cy.contains('button', 'Événements').click();
    cy.get('h1, h2, h3').contains('Événements').should('be.visible');

    cy.get('[data-testid="sync-indicator"]').click();

    // ── Direct balance navigation ──────────────────────────────────────
    cy.visit('/balance');
    cy.get('[data-testid="sync-indicator"]').should('be.visible');

    // ── Transaction edit (uses the first transaction of the org) ──────
    cy.visit('/transaction/1/edit');
    cy.contains('button', 'Enregistrer').click();
    cy.get('h1, h2, h3').contains('Modifier').should('be.visible');

    cy.contains('button', 'Sortie').click();
    cy.contains('button', 'Entrée').click();
    cy.contains('button', 'Sortie').click();

    // ── Back to Finance ────────────────────────────────────────────────
    cy.get('nav').contains('button', 'Finances').click();
    cy.get('h1, h2, h3').contains('Grand livre').should('be.visible');
  });
});
