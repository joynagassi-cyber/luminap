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

/**
 * Page Ionic ACTIVE uniquement.
 *
 * `ion-router-outlet` garde toutes les pages visitees montees et les masque
 * (`ion-page-hidden`). Un selecteur global (`cy.contains('button', 'Retour')`,
 * `cy.get('h1, h2, h3')`) fouille donc AUSSI les pages masquees — et
 * notamment la barre laterale `FeatureSidebar`, qui reste montee avec
 * `visibility: hidden` : Cypress echouait sur « element is not visible »
 * pour des boutons que l'utilisateur ne voit pas. Tous les selecteurs de ce
 * spec sont donc scopes a la page active.
 *
 * `div.ion-page:not(.ion-page-hidden)` est sur : `ion-app` porte la classe
 * `ion-page` mais n'est pas un `div` (voir cypress/support/view.ts).
 */
const PAGE = 'div.ion-page:not(.ion-page-hidden)';

describe('Lumina — Groups & Events', () => {
  // P39 — artefacts créés par CE run (noms uniques au run : `Date.now()`).
  // Le repli par préfixe n'archive que ces noms-là, jamais les résidus des
  // runs précédents.
  const createdGroupNames = new Set<string>();
  const createdEventNames = new Set<string>();
  // Borne temporelle stricte : n'archive QUE les entités créées après ce
  // instant (le suffixe `Date.now()` sur 6 chiffres se répète toutes les
  // ~16,7 min — la borne garantit « run courant uniquement »).
  const runStartedAt = new Date().toISOString();

  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    // Post-condition : on est bien sur /dashboard et on a les droits.
    cy.ensureAuth();
  });

  after(() => {
    // Nettoyage NON FATAL (voir cypress/support/e2eCleanup.ts) : archive les
    // groupes (`ARCHIVED`) et annule les événements (`CANCELLED`) créés par ce
    // run. Sans lui, chaque exécution laissait un groupe « Jeunesse … », un
    // « Culte de Noël … » et une « Conférence … » ACTIVE en base.
    cy.cleanupTestArtifacts({
      groupNamePrefix: [...createdGroupNames],
      eventNamePrefix: [...createdEventNames],
      sinceIso: runStartedAt,
    });
  });

  it('creates a group, opens it, and navigates back to the list', function () {
    this.timeout(180_000);
    const groupName = 'Jeunesse ' + Date.now().toString().slice(-6);
    createdGroupNames.add(groupName);

    cy.ensureAuth();
    cy.visit('/groups');
    cy.get(`${PAGE} h1, ${PAGE} h2, ${PAGE} h3`)
      .contains('Groupes', { timeout: 60_000 })
      .should('be.visible');

    // Le FAB est un <CircleAction> : un <button> natif portant
    // aria-label="Créer un groupe" et SANS texte « Créer ». On le cible
    // par son aria-label (le `cy.contains(..., 'Créer')` ne le matchait
    // pas — défaut de spec, pas d'app).
    cy.get(`${PAGE} button[aria-label="Créer un groupe"]`, { timeout: 30_000 })
      .should('exist')
      .click({ force: true });
    cy.get('input[placeholder="Nom du groupe"]').type(groupName);
    cy.get('textarea[placeholder="Description (optionnel)"]')
      .type('Groupe de la jeunesse')
      .should('have.value', 'Groupe de la jeunesse');

    // Le CTA du formulaire « Créer le groupe » (le submit fait 4
    // executeWrite PowerSync : org_units + groups + accounts + caisses) —
    // peut prendre quelques secondes.
    cy.get(PAGE)
      .contains('button, ion-button', 'Créer le groupe', { timeout: 60_000 })
      .click();

    // Le groupe apparaît dans la liste, avec le sous-titre de type.
    cy.get(PAGE).contains(groupName, { timeout: 60_000 }).should('be.visible');

    // On ouvre le détail et on revient.
    cy.get(PAGE).contains(groupName).first().click({ force: true });
    cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
      expect(path, `pathname after group open: ${path}`).to.match(/^\/groups\//);
    });
    // NON-REGRESSION R59 : le detail groupe doit etre VISIBLE. Avant le
    // correctif de `PageSkeleton` (src/ionic/routes/lazy-route.tsx), la page
    // entrante restait `ion-page-invisible` (opacity: 0) -> ecran noir et
    // cette assertion echouait. Le titre du detail est un <ion-title>.
    cy.get(`${PAGE} ion-title`)
      .contains(groupName, { timeout: 30_000 })
      .should('be.visible');
    // R61 : la page expose un titre de niveau 1 (IonTitle n'a pas de role
    // heading). Sans ce <h1>, aucun titre n'est annonce aux lecteurs d'ecran.
    cy.get(`${PAGE} h1`).should('contain.text', groupName);

    // Retour à la liste : le bouton retour reel est un <ion-back-button>
    // (la spec cherchait un bouton « Retour », inexistant ici, et matchait
    // donc celui de la barre laterale masquee).
    cy.get(`${PAGE} ion-back-button`).first().click({ force: true });
    cy.get(`${PAGE} h1, ${PAGE} h2, ${PAGE} h3`)
      .contains('Groupes', { timeout: 30_000 })
      .should('be.visible');
  });

  it('creates an event, shows its detail tabs and the Planifié badge', function () {
    this.timeout(180_000);
    const eventName = 'Culte de Noël ' + Date.now().toString().slice(-6);
    createdEventNames.add(eventName);

    cy.ensureAuth();
    // Le LazyRoute (src/ionic/routes/events.tsx) charge le chunk
    // EventNew via React.lazy() — sur un froid cache, ça prend
    // quelques secondes de plus que les autres routes.
    cy.visit('/event/new');
    // Le type par défaut est « Événement » (pas « Culte dominical ») —
    // pas de champ de cotisation obligatoire. Attendre l'hydratation
    // complète de la page avant d'asserter.
    cy.contains('button, ion-button', 'Événement', { timeout: 60_000 }).should('be.visible');

    // Le premier ion-input du form est le nom (aria-label « Nom de l'événement »).
    // Cypress 16 + Ionic : cibler l'input interne via l'aria-label hérité.
    cy.get('input[aria-label="Nom de l\'événement"]').type(eventName, {
      force: true,
    });

    cy.contains('button, ion-button', "Créer l'événement", { timeout: 30_000 }).click();

    // addEventPS → PowerSync executeWrite.
    //
    // L'app ouvre désormais le DÉTAIL de l'événement créé (et non la liste) :
    // la liste est triée par date décroissante et tronquée, donc un événement
    // à date ancienne n'y apparaissait pas → création perçue comme perdue.
    cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
      expect(path, `pathname after event create: ${path}`).to.match(/^\/event\//);
    });

    cy.get(`${PAGE} h1, ${PAGE} h2, ${PAGE} h3, ${PAGE} [role="heading"]`)
      .contains(eventName, { timeout: 60_000 })
      .should('be.visible');
    cy.get(`${PAGE} button[aria-label="Onglet Aperçu"]`).should('be.visible');
    cy.get(`${PAGE} button[aria-label="Onglet Budget"]`).should('be.visible');
    cy.get(`${PAGE} button[aria-label="Onglet Transactions"]`).should('be.visible');
    // Badge de statut (libelle « Planifié »), scope a la page active.
    cy.get(PAGE).contains('Planifié', { timeout: 30_000 }).should('be.visible');
  });

  it('shows empty budget and transaction tabs on a new event', function () {
    this.timeout(180_000);
    const eventName = 'Conférence ' + Date.now().toString().slice(-6);
    createdEventNames.add(eventName);

    cy.ensureAuth();
    cy.visit('/event/new');
    cy.contains('button, ion-button', 'Événement', { timeout: 60_000 }).should('be.visible');
    cy.get('input[aria-label="Nom de l\'événement"]').type(eventName, {
      force: true,
    });
    cy.contains('button, ion-button', "Créer l'événement", { timeout: 30_000 }).click();

    // addEventPS → PowerSync executeWrite.
    //
    // L'app ouvre désormais le DÉTAIL de l'événement créé (et non la liste) :
    // la liste est triée par date décroissante et tronquée, donc un événement
    // à date ancienne n'y apparaissait pas → création perçue comme perdue.
    cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
      expect(path, `pathname after event create: ${path}`).to.match(/^\/event\//);
    });

    cy.get(`${PAGE} h1, ${PAGE} h2, ${PAGE} h3, ${PAGE} [role="heading"]`)
      .contains(eventName, { timeout: 60_000 })
      .should('be.visible');

    cy.get(`${PAGE} button[aria-label="Onglet Budget"]`).click();
    cy.get(PAGE).contains('Aucun poste budgétaire', { timeout: 30_000 }).should('exist');

    cy.get(`${PAGE} button[aria-label="Onglet Transactions"]`).click();
    cy.get(PAGE).contains('Aucune transaction liée', { timeout: 30_000 }).should('exist');

    cy.get(PAGE).contains('button', 'Ajouter une transaction').click();
    cy.get(`${PAGE} h1, ${PAGE} h2, ${PAGE} h3`)
      .contains(/nouvelle transaction/i, { timeout: 30_000 })
      .should('be.visible');

    // Le bouton « Retour » de TransactionNew (bouton natif, pas un
    // ion-back-button) ramene a l'evenement.
    cy.get(`${PAGE} button`).contains('Retour').click();
    // TransactionNew revient par `navigate(-1)` : on retombe sur le DETAIL de
    // l'evenement, pas sur la liste. (L'assertion precedente attendait
    // « Evenements » : c'etait la spec qui etait fausse, pas l'app.)
    cy.location('pathname', { timeout: 30_000 }).should('match', /^\/event\//);
    cy.get(`${PAGE} ion-title, ${PAGE} h1, ${PAGE} h2, ${PAGE} h3`)
      .contains(eventName, { timeout: 30_000 })
      .should('be.visible');
  });
});
