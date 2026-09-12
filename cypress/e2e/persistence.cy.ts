/**
 * Cypress E2E — F5 persistence (transaction, event, form)
 *
 * Migrated from: e2e-tests/persistence.spec.ts (Playwright).
 *
 * Credentials are exposed via cypress.config.ts `expose` and read in the
 * browser test context with `Cypress.expose('KEY')`.
 *
 * Flow:
 *   1. prepareSession() — login + onboarding → /dashboard
 *   2. Create a transaction, an event (with a budget line), a form (+publish
 *      +fill +submit)
 *   3. cy.reload() and assert each entity is still visible after the reload
 */

describe('Lumina — F5 persistence (transaction, event, form)', () => {
  before(function () {
    cy.requireCredentials();
    const email = Cypress.expose('TEST_EMAIL') as string;
    const password = Cypress.expose('TEST_PASSWORD') as string;
    cy.prepareSession(email, password);
  });

  it('transaction, event budget line, and form submission survive a reload', function () {
    this.timeout(180_000);

    // ── 1. Transaction ─────────────────────────────────────────────────
    cy.visit('/transaction/new');
    cy.get('h1, h2, h3').contains('Nouvelle transaction').should('be.visible');

    cy.get('input[placeholder="0"]').clear().type('10000');
    cy.get('input[placeholder="Ex: Dîme du mois"]').type('Persistante Tx F5');
    cy.contains('button', /enregistrer/i).click();
    // Wait for the save confirmation instead of an arbitrary pause.
    cy.location('pathname', { timeout: 20_000 }).then((loc) => {
      cy.log('DEBUG after transaction save: ' + loc);
    });

    // ── 2. Event with budget line ──────────────────────────────────────
    cy.visit('/event/new');
    cy.get('h1, h2, h3').contains('Nouvel événement').should('be.visible');

    cy.get('input[placeholder="Ex: Fête des tabernacles"]').type('Event Budget F5');
    cy.get('textarea[placeholder="Détails..."]').type('Budget test persistence');

    cy.contains('button', 'Gérer').click();
    cy.get('input[placeholder="Nom du poste"]').type('Cadeaux');
    cy.get('input[placeholder="Montant (FCFA)"]').type('5000');
    cy.contains('button', 'Ajouter au budget').click();

    cy.contains('button', "Créer l'événement").click();
    cy.location('pathname', { timeout: 20_000 }).then((loc) => {
      cy.log('DEBUG after event create: ' + loc);
    });

    // ── 3. Form → publish → fill → submit ─────────────────────────────
    cy.visit('/forms');
    cy.get('h1, h2, h3').contains('Formulaires').should('be.visible');
    cy.contains('button', 'Créer').click();

    const formName = 'Test Formulaire F5 ' + Date.now();
    cy.get('input[placeholder*="Nom du formulaire"]').type(formName);
    cy.get('input[placeholder*="Clé"]').type('test_f5_form_' + Date.now());
    cy.contains('button', 'Créer le formulaire').click();
    cy.contains('Publier', { timeout: 15_000 }).first().click();

    cy.contains('button', 'Remplir').first().click();

    cy.get('input[placeholder="Montant don"]').first()
      .should('be.visible')
      .type('2500');
    cy.contains('button', 'Soumettre').click();
    cy.contains('Soumis avec succès', { timeout: 15_000 }).should('be.visible');

    // ── 4. Reload and verify all three entities persist ───────────────
    cy.reload();
    cy.contains('button', 'Plus').should('be.visible', { timeout: 30_000 });

    cy.visit('/finance');
    cy.contains('Persistante Tx F5').should('be.visible', { timeout: 20_000 });

    cy.visit('/events');
    cy.contains('Event Budget F5').should('be.visible', { timeout: 20_000 });

    cy.visit('/forms');
    cy.contains('Test Formulaire F5').should('be.visible', { timeout: 20_000 });

    console.log('✅ F5 PERSISTANCE — transaction, event, form all survive reload');
  });
});
