/**
 * Cypress E2E — Event tasks (CRUD, subtasks, status, progress, F5)
 *
 * B2 — Feature « Event Tasks ».
 *
 * Auth : login du compte d'organisation UNIQUE du run via
 * cy.loginOrgAccount() (créé par le spec d'auth, org existe déjà).
 *
 * Flow :
 *   1. Créer un événement, naviguer vers l'onglet « Tâches »
 *   2. Ajouter une tâche parente
 *   3. Vérifier le compteur de progression (0/1)
 *   4. Ajouter une sous-tâche liée à la tâche parente
 *   5. Faire basculer le statut OPEN → IN_PROGRESS → DONE
 *   6. Vérifier le compteur passe à 1/2
 *   7. F5 persist — les tâches subsistent
 */

import { activePage, activePageShouldContain } from '../support/view';

describe('Lumina — Event tasks CRUD + status + progress + F5', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  it('creates a task, promotes it to subtask, transitions statuses, and survives F5', function () {
    this.timeout(240_000);

    const ts = Date.now().toString().slice(-6);
    const eventName = `Event Tasks ${ts}`;
    const parentTitle = `Tâche parente ${ts}`;
    const subTitle = `Sous-tâche ${ts}`;

    // ── 1. Create event ───────────────────────────────────────────────
    cy.ensureAuth();
    cy.visit('/event/new');

    // Attendre l'HYDRATATION du formulaire avant de remplir : le champ
    // existe dans le DOM avant que React ne monte, et un remplissage trop
    // tot est ecrase par le premier render (valeur visible puis perdue,
    // d'ou « Le nom est requis »).
    cy.contains('button, ion-button', "Créer l'événement", {
      timeout: 60_000,
    }).should('be.visible');

    // Le IonInput du nom est un custom element Ionic : ecrire sur l'input
    // natif ne propage pas vers `onIonChange` (le state React reste vide,
    // d'ou « Le nom est requis » alors que la valeur est visible a l'ecran).
    // `typeIonicInput` ecrit la valeur ET emet `ionChange` — chemin fiable
    // (cf. cypress/support/ionic.ts).
    cy.typeIonicInput("Nom de l'événement", eventName);
    // Laisser React traiter l'evenement `ionChange` (le bouton peut rester
    // desactive pendant le render qui suit la mise a jour du state).
    cy.wait(500);

    // Le IonButton « Créer l'événement » rend un <ion-button> (custom
    // element, texte en light DOM — pas de <button> natif interne en
    // Ionic 7). On cible le ion-button par son texte.
    cy.contains('button, ion-button', "Créer l'événement", { timeout: 30_000 })
      .first()
      .click({ force: true });
    // `/event/new` matche aussi /^\/event\// : on exige un identifiant de
    // detail reel, sinon l'assertion passe alors que la creation a echoue et
    // que le formulaire est toujours affiche.
    cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
      expect(path, `event detail path: ${path}`).to.match(
        /^\/event\/(?!new$)[^/]+$/,
      );
    });

    // ── 2. Open the Tasks tab ────────────────────────────────────────
    // Scoper a la page ACTIVE : la page « Nouvel événement » reste montee
    // dans le DOM Ionic ; sans filtre, on vise l'onglet d'une page cachee.
    activePageShouldContain('button[role="tab"]', 'Tâches');
    activePage().contains('button[role="tab"]', 'Tâches').click();
    // Verification retryable : juste apres le clic, la page de detail est
    // encore en transition et un cliche `activePage()` peut tomber sur un
    // etat intermediaire (onglet present mais pas encore selectionne).
    activePageShouldContain('button[role="tab"][aria-selected="true"]', 'Tâches');

    // ── 3. Add a parent task ─────────────────────────────────────────
    // Toutes les commandes ciblent la page ACTIVE : les pages Ionic
    // precedemment visitees restent montees dans le DOM et un selecteur
    // global peut tomber sur un element cache (faux echec « not visible »).
    activePage()
      .contains('button, ion-button', 'Ajouter une tâche', { timeout: 30_000 })
      .click();
    activePage()
      .get('input[placeholder="Ex: Préparer la salle"]')
      .type(parentTitle);
    activePage().contains('button, ion-button', 'Enregistrer').click();

    // Task appears in list with title
    activePageShouldContain('p, span, div', parentTitle);

    // Progress counter shows "0/N tâche..."
    activePageShouldContain('span', /0\/\d+ tâche/);

    // ── 4. Add a sub-task linked to the parent ───────────────────────
    activePage().contains('button, ion-button', 'Ajouter une tâche').click();
    activePage()
      .get('input[placeholder="Ex: Préparer la salle"]')
      .type(subTitle);
    // Check "Sous-tâche". On cible le ion-checkbox lui-meme : son label
    // interne (shadow DOM) n'est pas fiable, et un `get('label')` global
    // tombe sur le wrapper du textarea de description (1er label du form).
    activePage().contains('ion-checkbox', 'Sous-tâche').click();
    // Ouvrir le select « Tâche parente » (le DERNIER du formulaire : le
    // premier est « Groupe assigné »). On clique l'HOTE `ion-select` : ses
    // `ion-select-option` sont dans le light DOM mais `display: none` tant
    // que le popover n'est pas ouvert, et un `.contains()` les viserait.
    //
    // NB : ne PAS scoper par le libellé « Tâche parente » — le titre de la
    // tâche parente commence par ces mots, donc un `contains('ion-item',
    // 'Tâche parente')` matche aussi la carte de la tâche dans la liste.
    activePage().get('ion-select').last().click();
    // Le popover Ionic est monte HORS de la page, attache a `body` (prouve
    // par sonde : `ion-popover.select-popover` visible, options rendues en
    // `ion-item`/`ion-radio`). On attend l'option VISIBLE du parent.
    cy.get('ion-popover', { timeout: 10_000 })
      .find('ion-item')
      .filter(':visible')
      .contains(parentTitle)
      .click();
    activePage().contains('button, ion-button', 'Enregistrer').click();

    // Subtask appears (indented)
    activePageShouldContain('p, span, div', subTitle);

    // ── 5. Mark the parent task as IN_PROGRESS ────────────────────────
    activePage()
      .contains(parentTitle)
      .parents('.rounded-xl')
      .first()
      .contains('button', 'En cours')
      .click({ force: true });

    // ── 6. Mark parent task as DONE ───────────────────────────────────
    activePage()
      .contains(parentTitle)
      .parents('.rounded-xl')
      .first()
      .contains('button', 'Terminer')
      .click({ force: true });

    // Progress counter updates after marking DONE
    activePageShouldContain('span', /1\/\d+ tâche/);

    // ── 7. Reload — tasks survive ────────────────────────────────────
    cy.reload();
    cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
      expect(path).to.match(/^\/event\/(?!new$)[^/]+$/);
    });
    activePageShouldContain('button[role="tab"]', 'Tâches');
    activePage().contains('button[role="tab"]', 'Tâches').click();
    activePageShouldContain('button[role="tab"][aria-selected="true"]', 'Tâches');

    // Both tasks are still present (page active uniquement)
    activePageShouldContain('p, span, div', parentTitle);
    activePageShouldContain('p, span, div', subTitle);

    console.log('✅ TASKS CRUD — parent + subtask + status + progress + F5');
  });
});
