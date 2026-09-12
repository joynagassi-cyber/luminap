/**
 * Cypress E2E — Groups & Events complete flow
 *
 * Migrated from: e2e-tests/groups-events.spec.ts (Playwright).
 *
 * Requires CYPRESS_TEST_EMAIL / CYPRESS_TEST_PASSWORD (Supabase test
 * account). Each spec creates uniquely-named entities so re-runs stay
 * green.
 */

describe('Lumina — Groups & Events', () => {
  before(function () {
    cy.requireCredentials();
    const email = Cypress.expose('TEST_EMAIL') as string;
    const password = Cypress.expose('TEST_PASSWORD') as string;
    cy.prepareSession(email, password);
  });

  it('creates a group, shows its detail tabs, and returns to list', function () {
    const groupName = 'Jeunesse ' + Date.now();

    cy.visit('/groups');
    cy.get('h1, h2, h3').contains('Groupes').should('be.visible');

    cy.contains('button', 'Créer').click();
    cy.get('input[placeholder*="groupe"], input[placeholder*="nom"]')
      .first()
      .type(groupName);
    cy.contains('button', 'groupe').click();
    cy.get('textarea').first().type('Groupe de la jeunesse');
    cy.contains('button', 'Créer le groupe').click();

    cy.contains(groupName).should('be.visible');
    cy.contains(groupName).first().click();
    cy.get('h1, h2, h3').contains(groupName).should('be.visible');

    cy.contains('button', 'Transactions').should('be.visible');
    cy.contains('button', 'Membres').should('be.visible');
    cy.contains('button', 'Historique').should('be.visible');
    cy.contains('button', 'Paramètres').should('be.visible');

    cy.contains('button', 'Retour').click();
    cy.get('h1, h2, h3').contains('Groupes').should('be.visible');
  });

  it('creates an event, shows its detail tabs and status badge', function () {
    const eventName = 'Culte de Noël ' + Date.now();

    cy.visit('/events');
    cy.get('h1, h2, h3').contains('Événements').should('be.visible');

    cy.contains('button', 'Créer').click();
    cy.get('input[placeholder*="nom"], input[placeholder*="ex:"]')
      .first()
      .type(eventName);
    cy.contains('button', /sélectionner/i).first().click();
    cy.get('[role="gridcell"]').contains('25').click();
    cy.contains('button', "Créer l'événement").click();

    cy.contains(eventName).should('be.visible');
    cy.contains(eventName).first().click();
    cy.get('h1, h2, h3').contains(eventName).should('be.visible');

    cy.contains('button', 'Aperçu').should('be.visible');
    cy.contains('button', 'Budget').should('be.visible');
    cy.contains('button', 'Transactions').should('be.visible');

    cy.contains('Planifié').should('be.visible');
    cy.contains('button', 'Démarrer').click();
    cy.contains('En cours').should('be.visible');

    cy.contains('button', 'Retour').click();
    cy.get('h1, h2, h3').contains('Événements').should('be.visible');
  });

  it('shows empty budget and transaction tabs on a new event', function () {
    const eventName = 'Conférence ' + Date.now();

    cy.visit('/events');
    cy.contains('button', 'Créer').click();
    cy.get('input[placeholder*="nom"], input[placeholder*="ex:"]')
      .first()
      .type(eventName);
    cy.contains('button', /sélectionner/i).first().click();
    cy.get('[role="gridcell"]').contains('15').click();
    cy.contains('button', "Créer l'événement").click();

    cy.contains(eventName).first().click();
    cy.get('h1, h2, h3').contains(eventName).should('be.visible');

    cy.contains('button', 'Budget').click();
    cy.contains('Aucun poste budgétaire').should('be.visible');

    cy.contains('button', 'Retour').click();
    cy.contains(eventName).first().click();
    cy.contains('button', 'Transactions').click();
    cy.contains('Aucune transaction liée').should('be.visible');

    cy.contains('button', 'Ajouter une transaction').click();
    cy.get('h1, h2, h3').contains(/nouvelle transaction/i).should('be.visible');

    cy.contains('button', 'Retour').click();
    cy.get('h1, h2, h3').contains('Événements').should('be.visible');
  });
});
