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
    cy.get('ion-input[aria-label="Nom de l\'événement"], input[aria-label="Nom de l\'événement"]')
      .first()
      .type(eventName, { force: true });
    cy.contains('button', "Créer l'événement", { timeout: 30_000 }).click();
    cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
      expect(path, `event detail path: ${path}`).to.match(/^\/events\//);
    });

    // ── 2. Open the Tasks tab ────────────────────────────────────────
    cy.contains('button[role="tab"]', 'Tâches', { timeout: 30_000 })
      .click();
    cy.contains('button[role="tab"][aria-selected="true"]', 'Tâches', {
      timeout: 10_000,
    }).should('be.visible');

    // ── 3. Add a parent task ─────────────────────────────────────────
    cy.contains('button', 'Ajouter une tâche', { timeout: 30_000 }).click();
    cy.get('input[placeholder="Ex: Préparer la salle"]').type(parentTitle);
    cy.contains('button', 'Enregistrer').click();

    // Task appears in list with title
    cy.contains(parentTitle, { timeout: 20_000 }).should('be.visible');

    // Progress counter shows "0/N tâche..."
    cy.contains('span', /0\/\d+ tâche/, { timeout: 10_000 }).should('exist');

    // ── 4. Add a sub-task linked to the parent ───────────────────────
    cy.contains('button', 'Ajouter une tâche').click();
    cy.get('input[placeholder="Ex: Préparer la salle"]').type(subTitle);
    // Check "Sous-tâche"
    cy.get('label').contains('Sous-tâche').click();
    // The parent select should now appear
    cy.get('ion-select', { timeout: 10_000 })
      .first()
      .then(($sel) => {
        const val = $sel.attr('value');
        if (val && val !== 'Sélectionner une tâche...') return;
        // Not yet visible, wait for it
      });
    // Click the parent select to open its options
    cy.get('ion-select')
      .contains('Sélectionner une tâche...')
      .first()
      .click();
    // Wait for popover and pick the parent
    cy.contains('ion-item', parentTitle, { timeout: 10_000 }).first().click();
    cy.contains('button', 'Enregistrer').click();

    // Subtask appears (indented)
    cy.contains(subTitle, { timeout: 20_000 }).should('exist');

    // ── 5. Mark the parent task as IN_PROGRESS ────────────────────────
    cy.contains(parentTitle)
      .parents('.rounded-xl')
      .first()
      .contains('button', 'En cours')
      .click({ force: true });

    // ── 6. Mark parent task as DONE ───────────────────────────────────
    cy.contains(parentTitle)
      .parents('.rounded-xl')
      .first()
      .contains('button', 'Terminer')
      .click({ force: true });

    // Progress counter updates after marking DONE
    cy.contains('span', /1\/\d+ tâche/, { timeout: 10_000 }).should('exist');

    // ── 7. Reload — tasks survive ────────────────────────────────────
    cy.reload();
    cy.location('pathname', { timeout: 30_000 }).should((path: string) => {
      expect(path).to.match(/^\/events\//);
    });
    cy.contains('button[role="tab"]', 'Tâches', { timeout: 30_000 })
      .click();

    // Both tasks are still present
    cy.contains(parentTitle, { timeout: 20_000 }).should('exist');
    cy.contains(subTitle, { timeout: 20_000 }).should('exist');

    console.log('✅ TASKS CRUD — parent + subtask + status + progress + F5');
  });
});
