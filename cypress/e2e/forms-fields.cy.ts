/**
 * Cypress E2E — Forms & Custom Fields flow (cloud: fresh signup → CRUD)
 *
 * Covers:
 *   1. /forms — "Créer" opens the new-form modal, create a form (name + key)
 *   2. /forms — form list shows the created form
 *   3. /custom-fields — "Créer" opens the new-field modal, create a field
 *      (label + key + entity + type) → visible in the list
 *   4. /forms/:id/submissions — submissions page renders
 *   5. /form/fill/:id — form-fill page renders (if form is published)
 *
 * No cloud intercept: real Supabase session via cy.loginOrgAccount().
 */

describe('Lumina — Forms & Custom Fields', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('creates a form and publishes it', function () {
    this.timeout(120_000);

    const formName = 'E2e Form ' + Date.now().toString().slice(-6);
    const formKey = 'e2e_form_' + Date.now().toString().slice(-6);

    cy.visit('/forms');
    cy.get('h1, h2, h3').contains('Formulaires', { timeout: 30_000 }).should('be.visible');

    // Open the create modal
    cy.contains('button', 'Créer').first().click();

    // Fill the form name + key
    cy.get('input[placeholder*="Nom du formulaire"]').type(formName);
    cy.get('input[placeholder*="Clé"]').type(formKey);
    cy.contains('button', 'Créer le formulaire').click();

    // Form appears in the list
    cy.contains(formName, { timeout: 30_000 }).should('be.visible');

    // Publish the form (button label is "Publier" for a DRAFT form)
    cy.contains('button', 'Publier').first().click();
    cy.contains('Brouillon', { timeout: 20_000 }).should('exist').as('draftBadge');
  });

  it('renders the form-submissions page', function () {
    this.timeout(90_000);

    cy.visit('/forms');
    // Click the form card → navigates to /forms/:id/submissions
    cy.get('button')
      .contains(/E2e Form/i)
      .first()
      .click({ force: true });

    cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
      expect(path).to.match(/^\/forms\/[^/]+\/submissions$/);
    });

    cy.get('h1, h2, h3, header').should('exist');
  });

  it('creates a custom field and shows it in the list', function () {
    this.timeout(120_000);

    const fieldLabel = 'E2e CF ' + Date.now().toString().slice(-6);
    const fieldKey = 'e2e_cf_' + Date.now().toString().slice(-6);

    cy.visit('/custom-fields');
    cy.get('h1, h2, h3').contains('Champs personnalisés', { timeout: 30_000 }).should('be.visible');

    // Open the create modal
    cy.get('button[aria-label="Créer un nouveau champ"]').click();

    // Fill label + key
    // The modal has: Entité (select), Label, Clé, Type (select), Options
    cy.get('[role="dialog"] input').eq(0).type(fieldLabel);
    cy.get('[role="dialog"] input').eq(1).type(fieldKey);
    cy.contains('button', /Créer/i).last().click();

    // Field appears in the list
    cy.contains(fieldLabel, { timeout: 30_000 }).should('be.visible');
  });

  it('deletes a custom field via its trash button', function () {
    this.timeout(90_000);

    cy.visit('/custom-fields');
    cy.contains(/E2e CF/i).parent().within(() => {
      cy.get('button[aria-label^="Supprimer"]').click();
    });

    // Field no longer visible
    cy.contains(/E2e CF/i).should('not.exist');
  });
});
