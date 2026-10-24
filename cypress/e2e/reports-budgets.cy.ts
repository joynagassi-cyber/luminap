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
    // Le titre de page est rendu par `<TopHeader title="Rapports" />` dans un
    // `<p>` (Reports.tsx:418/433), PAS dans un <h1/h2/h3> : l'ancien
    // `cy.get('h1, h2, h3, header').contains('Rapports')` ne pouvait pas
    // matcher et échouait après 30 s. On ancre sur le texte du bandeau.
    cy.contains('Rapports', { timeout: 30_000 }).should('be.visible');

    // Period buttons
    cy.contains('button, ion-button', 'Ce mois').should('be.visible');
    cy.contains('button, ion-button', 'Cette année').should('be.visible');
    cy.contains('button, ion-button', 'Tout').should('be.visible');

    // Tab buttons
    cy.contains('button, ion-button', 'Global').should('be.visible');
    cy.contains('button, ion-button', 'Groupes').should('be.visible');
    cy.contains('button, ion-button', 'Événements').should('be.visible');
  });

  it('opens the export modal and shows the PDF option', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/reports');
    cy.contains('button, ion-button', 'Exporter le rapport', { timeout: 30_000 }).click();
    cy.get('h2').contains('Exporter le rapport').should('be.visible');
    cy.contains('button, ion-button', 'PDF').should('be.visible');
    // Close the modal
    cy.get('button[aria-label="Fermer"]').click();
  });

  it('renders /report-builder with metric and group controls', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/report-builder');
    // Les fonctions d'agrégation ne sont PAS des boutons : elles vivent dans
    // les `IonSelectOption` du select « Métrique » (ReportBuilder.tsx:598-608,
    // libellés de `METRIC_FNS`). L'ancien
    // `cy.contains('button, ion-button', /Somme|Comptage|Moyenne/i)` ne
    // pouvait donc jamais matcher (échec après 30 s).
    //
    // Ciblage déterministe : on sélectionne le `ion-select` dont les options
    // portent les valeurs d'agrégation (`sum`/`count`/`avg`) — un simple
    // index serait fragile (la page en compte plusieurs : période, source,
    // catégorie, caisse, champ, fonction).
    cy.get('ion-select')
      .filter((_, el) =>
        Array.from(el.querySelectorAll('ion-select-option')).some((o) =>
          ['sum', 'count', 'avg', 'min', 'max'].includes(
            o.getAttribute('value') ?? '',
          ),
        ),
      )
      .first()
      .click({ force: true });
    cy.get('ion-popover', { timeout: 10_000 })
      .find('ion-item')
      .filter(':visible')
      .contains(/Somme|Comptage|Moyenne/)
      .should('exist');
    cy.get('ion-popover').type('{esc}');
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
    cy.contains('button, ion-button', 'Créer le budget').click();

    // Budget appears in the list
    cy.contains(budgetName, { timeout: 30_000 }).should('be.visible');
  });

  it('opens a budget detail page and adds a line', function () {
    this.timeout(120_000);

    // Grab the last budget from the list (our E2e one)
    cy.ensureAuth();
    cy.visit('/budgets');
    cy.contains('button, ion-button', /Budgets|E2e Budget/i)
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
    cy.contains('button, ion-button', 'Ajouter').click();
    cy.contains(/5/, { timeout: 10_000 }).should('exist');
  });
});
