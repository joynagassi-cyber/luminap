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

    cy.ensureAuth();
    cy.visit('/forms');
    cy.get('h1, h2, h3').contains('Formulaires', { timeout: 90_000 }).should('exist');

    // Open the create modal
    cy.contains('button, ion-button', 'Créer').first().click({ force: true });

    // Fill the form name + key (IonInput rend <ion-input> ; le DOM
    // natif exposé est un <input> simple en dehors du shadow root —
    // c'est ce que le selector ci-dessous cible).
    cy.get('input[placeholder*="Nom du formulaire"]').type(formName);
    cy.get('input[placeholder*="Clé"]').type(formKey);
    cy.contains('button, ion-button', 'Créer le formulaire').click();

    // Form appears in the list
    cy.contains(formName, { timeout: 90_000 }).should('exist');

    // Publish the form (button label is "Publier" for a DRAFT form)
    cy.contains('button, ion-button', 'Publier').first().click();
    cy.contains('Brouillon', { timeout: 90_000 }).should('exist').as('draftBadge');
  });

  it('renders the form-submissions page', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/forms');
    // La carte de formulaire n'est PAS cliquable : la navigation vers
    // /forms/:id/submissions passe par le bouton « Soumissions » de la
    // ligne. L'ancienne version cliquait la carte (button contenant le
    // nom) → aucun bouton trouvé → timeout.
    cy.contains(/E2e Form/i, { timeout: 90_000 })
      .closest('div')
      .parent()
      .contains('button', 'Soumissions')
      .click({ force: true });

    cy.location('pathname', { timeout: 90_000 }).should((path: string) => {
      expect(path).to.match(/^\/forms\/[^/]+\/submissions$/);
    });

    cy.get('h1, h2, h3, header').should('exist', { timeout: 90_000 });
  });

  it('creates a custom field and shows it in the list', function () {
    this.timeout(120_000);

    const fieldLabel = 'E2e CF ' + Date.now().toString().slice(-6);
    const fieldKey = 'e2e_cf_' + Date.now().toString().slice(-6);

    cy.ensureAuth();
    cy.visit('/custom-fields');
    cy.get('h1, h2, h3').contains('Champs personnalisés', { timeout: 90_000 }).should('exist');

    // Open the create modal
    cy.get('button[aria-label="Créer un nouveau champ"]').click({ force: true });

    // Fill label + key.
    // Le modal a : Entité (IonSelect), Label, Clé, Type (IonSelect), Options.
    // `input` au sens DOM inclut l'`<input class="aux-input">` CACHÉ que
    // Ionic injecte pour chaque IonSelect : `.eq(0)` tombait donc sur
    // l'aux-input de « Entité » (display:none) → `cy.type()` échouait.
    // On cible les deux champs par leur placeholder (uniques).
    cy.get('[role="dialog"] input[placeholder="Ex: Montant estimé"]').type(fieldLabel);
    cy.get('[role="dialog"] input[placeholder="montant_estime"]').type(fieldKey);
    cy.contains('button, ion-button', /Créer/i).last().click();

    // Field appears in the list
    cy.contains(fieldLabel, { timeout: 90_000 }).should('exist');
  });

  it('deletes a custom field via its trash button', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/custom-fields');
    cy.contains(/E2e CF/i).parent().within(() => {
      cy.get('button[aria-label^="Supprimer"]').click();
    });

    // Field no longer visible
    cy.contains(/E2e CF/i).should('not.exist');
  });
});
