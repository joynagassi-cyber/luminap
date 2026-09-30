/**
 * Cypress E2E — Invitations (QR / code)
 *
 * Parcours complet authentifié :
 *   1. cy.loginOrgAccount() → /dashboard (l'org de référence du run,
 *      créée par le spec d'auth via le wizard complet ; rôle
 *      PASTEUR_PRINCIPAL avec invitation:create).
 *   2. /invitation/emit : configuration → génération du QR + code.
 *      On assert l'état « qr » : le QR est rendu, le code de
 *      substitution est visible, l'alerte « Invitation créée »
 *      s'affiche, et « Gérer » mène à /invitation/manage.
 *
 * NOTE — le CLAIM (rejoindre via code/QR) est par essence inter-
 * appareils : un 2e user doit scanner le payload de l'émetteur.
 * Cypress ne pilote pas deux sessions authentifiées distinctes sur
 * une même origine dans un seul run, donc le claim UI est volontaire-
 * ment hors périmètre ici ; le moteur de claim (InvitationClaim.tsx)
 * est couvert par les tests unitaires Jest (capabilities/invitation).
 */

describe('Lumina — Invitations (émettre un code / QR)', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('generates an invitation (QR + code) and manages it', function () {
    this.timeout(120_000);

    cy.ensureAuth();
    cy.visit('/invitation/emit');
    cy.get('h1, h2, h3, [role="heading"]').contains('invitation', {
      timeout: 60_000,
    }).should('be.visible');

    // Rôle cible par défaut : MEMBRE. Portée ORG par défaut.
    // Le IonSelect (light DOM, interface=popover) expose le placeholder
    // « Sélectionner un rôle » : on le cible par son aria-label, puis on
    // ouvre le popover pour choisir le rôle SECRETAIRE.
    cy.get('ion-select[aria-label="Sélectionner un rôle"]').should('exist');
    cy.get('ion-select[aria-label="Sélectionner un rôle"]').click({ force: true });
    cy.get('ion-select-option').contains('Secrétaire').click({ force: true });

    cy.contains('button', "Générer l'invitation", { timeout: 30_000 }).click();

    // État « qr » : le QR est rendu + l'alerte de succès + le code.
    cy.get('svg'), // qrcode.react rend un <svg>
    cy.contains('Invitation créée', { timeout: 30_000 }).should('be.visible');
    cy.contains('Scannez ce QR code', { timeout: 15_000 }).should('be.visible');

    // Code de substitution (mono, tracking-widest).
    cy.get('code').first().should('exist').and('have.text').and('length.gte', 4);

    // « Gérer » ouvre la page de gestion des invitations.
    cy.contains('button', 'Gérer').click();
    cy.location('pathname', { timeout: 30_000 }).should('eq', '/invitation/manage');
    cy.get('h1, h2, h3, [role="heading"]').should('exist');
  });
});
