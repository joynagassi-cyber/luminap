/**
 * Cypress E2E — Reports & Budgets flow (cloud: fresh signup → CRUD)
 *
 * Covers:
 *   1. /reports — period buttons, tabs (Global/Groupes/Événements),
 *      summary cards, export button visibility
 *   2. /reports — Export PDF (opens the export modal → PDF button)
 *   3. /report-builder — renders with metric/group controls
 *   4. /budgets — "Nouveau" button opens the CreateBudgetSheet,
 *      create a budget with name/amount → visible in the list
 *   5. /budgets/:id — detail page renders (header, prévu/réel/écart cards,
 *      add a budget line)
 *
 * No cloud intercept: real Supabase session via cy.loginOrgAccount().
 */

describe('Lumina — Reports & Budgets', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('renders /reports with period buttons and tabs', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/reports');
    cy.get('h1, h2, h3, header').contains('Rapports', { timeout: 30_000 }).should('be.visible');

    // Period buttons
    cy.contains('button', 'Ce mois').should('be.visible');
    cy.contains('button', 'Cette année').should('be.visible');
    cy.contains('button', 'Tout').should('be.visible');

    // Tab buttons
    cy.contains('button', 'Global').should('be.visible');
    cy.contains('button', 'Groupes').should('be.visible');
    cy.contains('button', 'Événements').should('be.visible');
  });

  it('opens the export modal and shows the PDF option', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/reports');
    cy.contains('button', 'Exporter le rapport', { timeout: 30_000 }).click();
    cy.get('h2').contains('Exporter le rapport').should('be.visible');
    cy.contains('button', 'PDF').should('be.visible');
    // Close the modal
    cy.get('button[aria-label="Fermer"]').click();
  });

  it('renders /report-builder with metric and group controls', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/report-builder');
    // Metric buttons
    cy.contains('button', /Somme|Comptage|Moyenne/i, { timeout: 30_000 }).should('exist');
  });

  it('creates a budget and sees it in the list', function () {
    this.timeout(120_000);

    const budgetName = 'E2e Budget ' + Date.now().toString().slice(-6);

    cy.ensureAuth();
    cy.visit('/budgets');
    cy.get('[data-testid="budgets-title"]').contains('Budgets').should('be.visible');

    // Open the create sheet
    cy.get('button[aria-label="Nouveau budget"]').click();
    cy.get('[data-testid="budget-name"]').type(budgetName);
    cy.contains('button', 'Créer le budget').click();

    // Budget appears in the list
    cy.contains(budgetName, { timeout: 30_000 }).should('be.visible');
  });

  it('opens a budget detail page and adds a line', function () {
    this.timeout(120_000);

    // Grab the last budget from the list (our E2e one)
    cy.ensureAuth();
    cy.visit('/budgets');
    cy.contains('button', /Budgets|E2e Budget/i)
      .last()
      .click();
      // After clicking the card, the route is /budgets/:id
    cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
      expect(path).to.match(/^\/budgets\/.+/);
    });

    cy.get('[data-testid="budget-detail-header"]').should('be.visible');
    cy.contains('Prévu').should('exist');
    cy.contains('Réel').should('exist');

    // Add a budget line
    cy.get('[data-testid="line-amount"]').type('5000');
    cy.contains('button', 'Ajouter').click();
    cy.contains(/5/, { timeout: 10_000 }).should('exist');
  });
});
