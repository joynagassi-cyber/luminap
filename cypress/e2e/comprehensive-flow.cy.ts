/**
 * Cypress E2E — Comprehensive navigation & finance flow
 *
 * Migrated from: e2e-tests/comprehensive-flow.spec.ts (Playwright).
 *
 * No cloud intercept: real Supabase session via cy.loginOrgAccount()
 * (le compte d'organisation UNIQUE du run — créé par le spec d'auth,
 * partagé sur tous les specs, login direct → /dashboard).
 */

describe('Lumina — comprehensive navigation & finance flow', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('navigates Settings, Balance, History, Events, and Transaction edit', function () {
    this.timeout(180_000);

    // ── Open More menu → Settings ──────────────────────────────────────
    cy.get('button[aria-label="Plus d\'options"]').click();
    cy.contains('button', 'Paramètres').click();
    cy.get('h1, h2, h3').contains('Paramètres').should('exist');

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
    cy.get('button[aria-label="Plus d\'options"]').click();
    cy.contains('button', 'Historique').click();
    cy.get('h1, h2, h3').contains('Historique').should('be.visible');

    cy.contains('button', 'Ce mois').click();
    cy.contains('button', 'Cette année').click();
    cy.contains('button', 'Tout').click();

    cy.contains('button', 'Retour').click();

    // ── Events ─────────────────────────────────────────────────────────
    cy.get('button[aria-label="Plus d\'options"]').click();
    cy.contains('button', 'Événements').click();
    cy.get('h1, h2, h3').contains('Événements').should('be.visible');

    cy.get('[data-testid="sync-indicator"]').click();

    // ── Direct balance navigation ──────────────────────────────────────
    cy.ensureAuth();
    cy.visit('/balance');
    cy.get('[data-testid="sync-indicator"]').should('be.visible');

    // ── Transaction edit : on crée d'abord une transaction réelle via
    //    /transaction/new, puis on ouvre son edit par son vrai id. L'ancienne
    //    version hardcodait /transaction/1/edit sur un seed qui n'existe pas
    //    (l'org est vrac au boot), et le edit ne montrait qu'un écran vide.
    cy.ensureAuth();
    cy.visit('/transaction/new');
    cy.get('input[aria-label="Montant en francs CFA"]').type('7500');
    cy.get('input[aria-label="Description"]').type('E2E Comprehensive Tx');
    // Catégorie : le shell seed 9 catégories ; on choisit la 1re (pré-remplie
    // par défaut dans l'UI, ici on redéclare explicitement via aria-label).
    cy.get('select[aria-label="Catégorie"]').select(1);
    cy.contains('button', 'Enregistrer la transaction', { timeout: 30_000 }).click();
    cy.location('pathname', { timeout: 30_000 }).should('include', '/transaction/');
    cy.location('pathname').should('not.include', '/new');

    // ── Transaction edit (id réel de la transaction créée) ────────────
    // La detail page est /transaction/:id (non /edit) ; on en dérive l'id
    // pour naviguer vers /transaction/:id/edit.
    cy.url({ timeout: 30_000 }).then((url) => {
      const id = url.split('/transaction/')[1]?.split('/')[0];
      expect(id, 'id transaction dans l\'URL').to.be.a('string');
      cy.ensureAuth();
      cy.visit(`/transaction/${id}/edit`);
      cy.get('h1, h2, h3').contains('Modifier').should('be.visible');
      cy.contains('button', 'Sauvegarder').click();
      cy.location('pathname', { timeout: 30_000 }).should('eq', `/transaction/${id}`);
    });

    cy.contains('button', 'Sortie').click();
    cy.contains('button', 'Entrée').click();
    cy.contains('button', 'Sortie').click();

    // ── Back to Finance ────────────────────────────────────────────────
    cy.get('nav').contains('button', 'Finances').click();
    cy.get('h1, h2, h3').contains('Grand livre').should('be.visible');
  });
});
