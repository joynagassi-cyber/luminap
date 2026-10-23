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
    // La page utilise <IonTitle> (Ionic) et non un <h1>/<h2>/<h3> : le
    // sélecteur de titres HTML ne trouvait rien. On assert le titre RÉEL
    // de la page (« Créer une invitation », InvitationEmit.tsx §IonTitle).
    cy.contains('Créer une invitation', { timeout: 60_000 }).should('be.visible');

    // Rôle cible par défaut : MEMBRE. Portée ORG par défaut.
    // Le IonSelect (light DOM, interface=popover) expose le placeholder
    // « Sélectionner un rôle » : on le cible par son aria-label, puis on
    // ouvre le popover pour choisir le rôle SECRETAIRE.
    // Le `aria-label` d'un <ion-select> n'est PAS posé sur l'hôte (Ionic
    // le rend dans le shadow DOM) : `ion-select[aria-label=...]` ne matche
    // rien. Le 1er <ion-select> de la page est « Rôle cible »
    // (InvitationEmit.tsx:231) — on le cible par index.
    cy.get('ion-select').should('have.length', 2);
    cy.get('ion-select').eq(0).click({ force: true });
    // Les options vivent dans un `ion-popover` monté sur <body> ; tant que
    // le popover n'est pas ouvert elles sont `display:none`, et un
    // `.contains()` sur `ion-select-option` les viserait sans jamais les
    // rendre cliquables. On attend le popover puis on clique l'`ion-item`
    // VISIBLE (motif validé par events-tasks.cy.ts:118-124). Sans cela, le
    // popover restait ouvert et son `ion-backdrop` couvrait le bouton
    // « Générer l'invitation » (cy.click() → « covered by another element »).
    cy.get('ion-popover', { timeout: 10_000 })
      .find('ion-item')
      .filter(':visible')
      .contains('Secrétaire')
      .click();

    cy.contains('button, ion-button', "Générer l'invitation", { timeout: 30_000 }).click();

    // État « qr » : le QR est rendu + l'alerte de succès + le code.
    cy.get('svg', { timeout: 30_000 }).should('exist'); // qrcode.react rend un <svg>
    cy.contains('Invitation créée', { timeout: 30_000 }).should('be.visible');
    cy.contains('Scannez ce QR code', { timeout: 15_000 }).should('be.visible');

    // Code de substitution (mono, tracking-widest).
    // `should('have.text')` SANS argument assert que le texte vaut
    // `undefined` — l'assertion était malformée (elle échouait toujours).
    // On veut : le code de substitution fait au moins 4 caractères.
    cy.get('code').first().should('exist').invoke('text').should('have.length.gte', 4);

    // L'alerte de succès (ion-alert) reste ouverte et son `ion-backdrop`
    // couvre la barre d'outils : sans la fermer, le clic « Gérer » échoue
    // avec « covered by another element ». On valide l'alerte d'abord.
    cy.get('ion-alert', { timeout: 10_000 })
      .find('button')
      .contains('OK')
      .click({ force: true });
    // Ionic garde l'overlay ferme dans le DOM (classe `overlay-hidden`) :
    // on assert qu'il n'est plus VISIBLE, pas qu'il a disparu.
    cy.get('ion-alert').should('not.be.visible');

    // « Gérer » ouvre la page de gestion des invitations.
    cy.contains('button, ion-button', 'Gérer').click();
    cy.location('pathname', { timeout: 30_000 }).should('eq', '/invitation/manage');
    cy.contains('Gestion des invitations', { timeout: 30_000 }).should('exist');
  });
});
