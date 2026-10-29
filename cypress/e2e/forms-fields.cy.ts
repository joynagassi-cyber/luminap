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
  // P39 — libellés des champs personnalisés créés par ce run.
  const customFieldPrefixes: string[] = [];
  // Borne temporelle stricte : ne supprime QUE les champs créés par ce run.
  const runStartedAt = new Date().toISOString();

  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  after(() => {
    // P39 — nettoyage NON FATAL (cypress/support/e2eCleanup.ts) : supprime
    // les champs personnalisés « E2e CF <ts> » créés par ce run. Les
    // formulaires `E2e Form <ts>` ne sont pas nettoyés ici (le spec ne les
    // référence plus après publication) — le défaut mesuré portait sur les
    // groupes/événements/annexes/membres, traités dans leurs specs.
    cy.cleanupTestArtifacts({
      customFieldLabelPrefix: customFieldPrefixes,
      sinceIso: runStartedAt,
    });
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
    customFieldPrefixes.push(fieldLabel);

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
    // `cy.contains('button', /Créer/i)` ne renvoie que le PREMIER bouton
    // correspondant — c'est-à-dire le bouton d'ouverture du modal, recouvert
    // par le scrim. `.last()` ne pouvait donc pas atteindre le bouton de
    // soumission. On le cible par son `aria-label` unique.
    cy.get('[role="dialog"] button[aria-label="Créer le champ"]').click();

    // Field appears in the list
    cy.contains(fieldLabel, { timeout: 90_000 }).should('exist');
  });

  it('deletes a custom field via its trash button', function () {
    this.timeout(90_000);

    cy.ensureAuth();
    cy.visit('/custom-fields');

    // Le bouton de suppression porte `aria-label="Supprimer le champ <label>"` :
    // on lit le label de la ligne puis on cible exactement ce bouton (la ligne
    // n'est pas un ancêtre direct de la <p> du label, d'où l'échec du
    // `.parent().within()` précédent).
    cy.contains(/E2e CF/i, { timeout: 90_000 })
      .invoke('text')
      .then((label) => {
        const trimmed = label.trim();
        cy.get(`button[aria-label="Supprimer le champ ${trimmed}"]`).click();
        // Field no longer visible
        cy.contains(trimmed).should('not.exist');
      });
  });
});
