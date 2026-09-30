/**
 * Cypress E2E — Groups & Events (spec cloud, org de référence)
 *
 * Auth :
 *   - cy.loginOrgAccount() — le même compte d'organisation UNIQUE que
 *     tous les autres specs cloud du run. Il a été créé par
 *     cy.signupOrgAccount() dans le spec d'auth, qui a passé le
 *     wizard COMPLET (8 écrans + branch + /org-setup) et a posé les
 *     credentials dans Cypress.env.orgCreds.
 *
 *   - Ici on se CONNECTE (pas de re-signup, pas de raccourci
 *     localStorage) et on atterrit DIRECTEMENT sur /dashboard :
 *     l'org existe déjà, onboarding déjà complété.
 *
 * Rôle PASTEUR_PRINCIPAL (le 1er de la template Église) : permissions
 * group:create / event:create / transaction:create / form:create /
 * invitation:create.
 *
 * Chaque spec utilise des noms uniques (Date.now) pour rester verte
 * au re-run.
 */

describe('Lumina — Groups & Events', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    // Post-condition : on est bien sur /dashboard et on a les droits.
    cy.ensureAuth();
  });

  it('creates a group, opens it, and navigates back to the list', function () {
    this.timeout(180_000);
    const groupName = 'Jeunesse ' + Date.now().toString().slice(-6);

    cy.ensureAuth();
    cy.visit('/groups');
    cy.get('h1, h2, h3').contains('Groupes', { timeout: 60_000 }).should('be.visible');

    // Le bouton « + Créer » ouvre le formulaire de création de groupe.
    // Le CTA du formulaire s'appelle « Créer le groupe » (le 2e « Créer »
    // dans le DOM : le 1er est le CTA header déjà cliqué).
    cy.contains('button', 'Créer', { timeout: 30_000 }).first().click();
    cy.get('input[placeholder="Nom du groupe"]').type(groupName);
    cy.get('textarea[placeholder="Description (optionnel)"]')
      .type('Groupe de la jeunesse')
      .should('have.value', 'Groupe de la jeunesse');

    // Le CTA du formulaire « Créer le groupe » (le submit fait 4
    // executeWrite PowerSync : org_units + groups + accounts + caisses) —
    // peut prendre quelques secondes.
    cy.contains('button', 'Créer le groupe', { timeout: 60_000 }).click();

    // Le groupe apparaît dans la liste, avec le sous-titre de type.
    cy.contains(groupName, { timeout: 60_000 }).should('be.visible');

    // On ouvre le détail et on revient.
    cy.contains(groupName).first().click({ force: true });
    cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
      expect(path, `pathname after group open: ${path}`).to.match(/^\/groups\//);
    });
    cy.get('h1, h2, h3, [role="heading"]')
      .contains(groupName, { timeout: 30_000 })
      .should('be.visible');

    // Retour à la liste.
    cy.get('button[aria-label="Retour"], ion-back-button, button')
      .contains('Retour')
      .click();
    cy.get('h1, h2, h3')
      .contains('Groupes', { timeout: 30_000 })
      .should('be.visible');
  });

  it('creates an event, shows its detail tabs and the Planifié badge', function () {
    this.timeout(180_000);
    const eventName = 'Culte de Noël ' + Date.now().toString().slice(-6);

    cy.ensureAuth();
    // Le LazyRoute (src/ionic/routes/events.tsx) charge le chunk
    // EventNew via React.lazy() — sur un froid cache, ça prend
    // quelques secondes de plus que les autres routes.
    cy.visit('/event/new');
    // Le type par défaut est « Événement » (pas « Culte dominical ») —
    // pas de champ de cotisation obligatoire. Attendre l'hydratation
    // complète de la page avant d'asserter.
    cy.contains('button', 'Événement', { timeout: 60_000 }).should('be.visible');

    // Le premier ion-input du form est le nom (aria-label « Nom de l'événement »).
    // Cypress 16 + Ionic : cibler l'input interne via l'aria-label hérité.
    cy.get('ion-input[aria-label="Nom de l\'événement"]').type(eventName, {
      force: true,
    });

    cy.contains('button', "Créer l'événement", { timeout: 30_000 }).click();

    // addEventPS → PowerSync executeWrite.
    cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
      expect(path, `pathname after event create: ${path}`).to.match(/^\/events/);
    });

    cy.get('h1, h2, h3, [role="heading"]')
      .contains(eventName, { timeout: 60_000 })
      .should('be.visible');
    cy.contains('button', 'Aperçu').should('be.visible');
    cy.contains('button', 'Budget').should('be.visible');
    cy.contains('button', 'Transactions').should('be.visible');
    cy.contains('Planifié').should('be.visible');
  });

  it('shows empty budget and transaction tabs on a new event', function () {
    this.timeout(180_000);
    const eventName = 'Conférence ' + Date.now().toString().slice(-6);

    cy.ensureAuth();
    cy.visit('/event/new');
    cy.contains('button', 'Événement', { timeout: 60_000 }).should('be.visible');
    cy.get('ion-input[aria-label="Nom de l\'événement"]').type(eventName, {
      force: true,
    });
    cy.contains('button', "Créer l'événement", { timeout: 30_000 }).click();

    cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
      expect(path, `pathname after event create: ${path}`).to.match(/^\/events/);
    });

    cy.get('h1, h2, h3, [role="heading"]')
      .contains(eventName, { timeout: 60_000 })
      .should('be.visible');

    cy.contains('button', 'Budget').click();
    cy.contains('Aucun poste budgétaire', { timeout: 30_000 }).should('exist');

    cy.contains('button', 'Retour').click();
    cy.contains('button', 'Transactions').click();
    cy.contains('Aucune transaction liée', { timeout: 30_000 }).should('exist');

    cy.contains('button', 'Ajouter une transaction').click();
    cy.get('h1, h2, h3').contains(/nouvelle transaction/i, {
      timeout: 30_000,
    }).should('be.visible');

    cy.contains('button', 'Retour').click();
    cy.get('h1, h2, h3')
      .contains('Événements', { timeout: 30_000 })
      .should('be.visible');
  });
});
