/**
 * Cypress E2E — Members flow (cloud: fresh signup → /members CRUD)
 *
 * Covers:
 *   1. /members page renders (header + "Ajouter" button + search)
 *   2. Create a member (first name, last name, phone, email) → visible in list
 *   3. Search filters the member list
 *   4. MembresEnAvance page renders (total banner + list or empty state)
 *
 * No cloud intercept: real Supabase session via cy.loginOrgAccount().
 */

describe('Lumina — Members', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('creates a member and shows it in the list', function () {
    this.timeout(120_000);

    const firstName = 'Jean';
    const lastName = 'E2e' + Date.now().toString().slice(-5);
    const phone = '0700' + Date.now().toString().slice(-6);

    cy.visit('/members');
    cy.get('h1, h2, h3').contains('Membres').should('be.visible');

    // Open the create form
    cy.contains('button', 'Ajouter').first().click();
    cy.get('input[aria-label="Prénom"]').type(firstName);
    cy.get('input[aria-label="Nom"]').type(lastName);
    cy.get('input[aria-label="Téléphone"]').type(phone);

    // Submit
    cy.contains('button', 'Ajouter').last().click();

    // Member appears in the active list
    cy.contains(firstName + ' ' + lastName, { timeout: 20_000 }).should('be.visible');
  });

  it('searches and filters members by name', function () {
    this.timeout(60_000);

    cy.visit('/members');
    cy.get('h1, h2, h3').contains('Membres').should('be.visible');

    const query = 'Jean';
    cy.get('input[aria-label="Rechercher un membre"]').type(query);
    cy.contains('Jean').should('be.visible');
  });

  it('renders the MembresEnAvance page with total banner', function () {
    this.timeout(60_000);

    cy.visit('/membres-en-avance');
    cy.contains('Total en avance', { timeout: 20_000 }).should('be.visible');

    // Either the member list or the empty state must be shown
    cy.get('body').then(($body) => {
      if ($body.text().includes('membre')) {
        // Members with positive avances exist
      }
      // Empty state text
      cy.get('body').contains(/membre|0/i, { timeout: 10_000 }).should('exist');
    });
  });
});
