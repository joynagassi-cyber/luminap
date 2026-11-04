/**
 * Cypress E2E — PR3 « Corbeille / restauration (soft-delete) » — volet PURGE.
 *
 * Le cycle soft-delete → restauration est couvert par `archives-restore.cy.ts`
 * et le contrat de l'écran (visibilité par rôle, confirmation obligatoire) par
 * l'unitaire `src/pages/__tests__/Archives-purge.test.tsx`. Ce spec ajoute la
 * couverture E2E DÉDIÉE de la suppression DÉFINITIVE, en conditions réelles
 * offline-first (réplique locale seedée, aucun appel cloud).
 *
 * Ce que le spec prouve, bout en bout :
 *   (a) un élément archivé expose une action « Supprimer définitivement » ;
 *   (b) ANNULER la confirmation ne supprime RIEN (la ligne survit) ;
 *   (c) CONFIRMER supprime RÉELLEMENT la ligne de la réplique PowerSync
 *       (`groups` + lignes filles `org_units`/`accounts`) — une simple mutation
 *       d'état React ne toucherait pas la base ;
 *   (d) la purge est TRACÉE : une entrée d'audit `DELETE` (comment « purge
 *       définitive ») est écrite pour l'entité ;
 *   (e) « Vider la corbeille » purge en lot TOUS les éléments archivés de l'org.
 *
 * NON-VACUITÉ (à vérifier localement, mutation NON conservée) : vider le corps
 * de `purgeEntity` (`src/lib/trash.ts`) — ou retirer le garde `canPurge &&`
 * autour du bouton de ligne — fait ÉCHOUER (c)/(d) resp. (a).
 *
 * NB : pas d'`import { cy }` — `cy` est global dans le runner (voir le piège de
 * bundling documenté dans local-dashboard.cy.ts).
 */

/**
 * NB : `export {}` force le fichier à être un MODULE — sans lui, ce spec est un
 * « script » global et ses déclarations de premier niveau (`PsDb`, `dbOf`)
 * entreraient en collision avec celles d'`archives-restore.cy.ts`
 * (TS2451/TS2300/TS2393). `cy` reste global via les types Cypress.
 */
export {};

type PsDb = {
  execute: (sql: string, p?: unknown[]) => Promise<unknown>;
  getAll: (
    sql: string,
    p?: unknown[],
  ) => Promise<Array<Record<string, unknown>>>;
};

function dbOf(win: unknown): PsDb {
  const db = (win as { __psDb?: PsDb }).__psDb;
  if (!db) throw new Error('window.__psDb indisponible (PowerSync non démarré)');
  return db;
}

/**
 * Interroge une table jusqu'à ce que `id` disparaisse. Les suppressions sont
 * `async` fire-and-forget côté UI : on relit jusqu'à convergence, avec échec
 * explicite (jamais de faux positif).
 */
async function waitForGone(
  db: PsDb,
  table: string,
  id: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = 1;
  while (Date.now() < deadline) {
    const rows = await db.getAll(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    last = rows.length;
    if (last === 0) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${table} contient encore id=${id} après ${timeoutMs} ms`);
}

describe('Lumina — PR3 corbeille : purge définitive', () => {
  before(function () {
    this.timeout(90_000);
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession({ role: 'PASTEUR_PRINCIPAL' });
    // Boot de l'app (expose window.__psDb) puis seed de la réplique locale.
    cy.visit('/sessions');
    cy.seedOrgReplica();
  });

  /** Insère un groupe ARCHIVÉ (org_units + groups + accounts partagent l'id). */
  function seedArchivedGroup(
    win: Window,
    groupId: string,
    groupName: string,
    orgId: string,
  ): Cypress.Chainable<unknown> {
    const db = dbOf(win);
    const now = new Date().toISOString();
    return cy.wrap(
      (async () => {
        await db.execute(
          `INSERT INTO org_units (id, name, type, org_id, description, is_active, created_at)
           VALUES (?, ?, 'groupe', ?, 'Groupe E2E purge', 1, ?)`,
          [groupId, groupName, orgId, now],
        );
        await db.execute(
          `INSERT INTO groups (id, org_id, name, parent_group_id, responsable_member_id, status, archived_at, archived_by, archive_reason, created_at, updated_at)
           VALUES (?, ?, ?, null, null, 'ARCHIVED', ?, null, 'Test purge E2E', ?, ?)`,
          [groupId, orgId, groupName, now, now, now],
        );
        await db.execute(
          `INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, archived_at, archived_by, archive_reason, created_at, updated_at)
           VALUES (?, ?, 'GROUP', ?, ?, 'XOF', 'ARCHIVED', ?, null, 'Test purge E2E', ?, ?)`,
          [groupId, orgId, groupId, groupName, now, now, now],
        );
      })(),
      { timeout: 30_000 },
    );
  }

  it('annuler la confirmation ne supprime rien, confirmer purge réellement (+ audit)', function () {
    this.timeout(180_000);

    const orgId = 'default-org';
    const suffix = Date.now().toString().slice(-6);
    const groupId = `grp-e2e-purge-${suffix}`;
    const groupName = `Chorale Purge E2E ${suffix}`;

    cy.window({ timeout: 60_000 }).should((win) => {
      expect(
        (win as unknown as { __psDb?: unknown }).__psDb,
        'window.__psDb (handle PowerSync DEV) doit être exposé',
      ).to.exist;
    });

    cy.window({ timeout: 30_000 }).then({ timeout: 30_000 }, (win) => {
      return seedArchivedGroup(win, groupId, groupName, orgId);
    });

    // ── (a) L'élément archivé expose l'action de purge ──────────────────────
    cy.visit('/archives');
    cy.contains(groupName, { timeout: 60_000 }).should('be.visible');
    cy.get(`button[aria-label="Supprimer définitivement ${groupName}"]`, {
      timeout: 30_000,
    }).should('exist');

    // ── (b) ANNULER ne supprime RIEN ────────────────────────────────────────
    cy.get(`button[aria-label="Supprimer définitivement ${groupName}"]`).click({
      force: true,
    });
    // Le dialogue de confirmation s'ouvre (titre explicite). A6 : c'est
    // un `IonAlert` — titre et actions vivent dans son SHADOW DOM, que
    // les requêtes racine de Cypress ne traversent pas ; on pilote donc
    // depuis l'hôte visible (même idiome que invitations.cy.ts).
    cy.get('ion-alert', { timeout: 20_000 })
      .filter(':visible')
      .contains('Supprimer définitivement ?')
      .should('exist');
    cy.get('ion-alert')
      .filter(':visible')
      .find('button')
      .contains('Annuler')
      .click({ force: true });
    // La ligne survit (aucune purge tant que non confirmé).
    cy.window({ timeout: 30_000 }).then({ timeout: 30_000 }, async (win) => {
      const rows = await dbOf(win).getAll(
        'SELECT id FROM groups WHERE id = ?',
        [groupId],
      );
      expect(rows.length, 'annulation ⇒ la ligne est conservée').to.eq(1);
    });

    // ── (c) CONFIRMER supprime RÉELLEMENT (groupes + lignes filles) ─────────
    cy.get(`button[aria-label="Supprimer définitivement ${groupName}"]`).click({
      force: true,
    });
    cy.get('ion-alert', { timeout: 20_000 })
      .filter(':visible')
      .find('button')
      .contains('Supprimer définitivement')
      .click({ force: true });

    cy.window({ timeout: 40_000 }).then({ timeout: 40_000 }, async (win) => {
      const db = dbOf(win);
      await waitForGone(db, 'groups', groupId);
      await waitForGone(db, 'org_units', groupId);
      await waitForGone(db, 'accounts', groupId);

      // ── (d) La purge est TRACÉE : entrée d'audit DELETE ────────────────────
      const audits = await db.getAll(
        `SELECT action, comment FROM audit_entries WHERE entity_type = 'Group' AND entity_id = ?`,
        [groupId],
      );
      expect(
        audits.map((a) => a.action),
        "une entrée d'audit DELETE trace la purge réelle",
      ).to.include('DELETE');
    });

    // La ligne a DISPARU de la corbeille.
    cy.visit('/archives');
    cy.contains('Archives', { timeout: 60_000 }).should('exist');
    cy.contains(groupName, { timeout: 15_000 }).should('not.exist');
  });

  it('« Vider la corbeille » purge en lot tous les éléments archivés', function () {
    this.timeout(180_000);

    const orgId = 'default-org';
    const suffix = Date.now().toString().slice(-6);
    const groupId = `grp-e2e-empty-${suffix}`;
    const groupName = `Groupe Vidage E2E ${suffix}`;

    cy.window({ timeout: 60_000 }).should((win) => {
      expect((win as unknown as { __psDb?: unknown }).__psDb).to.exist;
    });

    cy.window({ timeout: 30_000 }).then({ timeout: 30_000 }, (win) => {
      return seedArchivedGroup(win, groupId, groupName, orgId);
    });

    cy.visit('/archives');
    cy.contains(groupName, { timeout: 60_000 }).should('be.visible');

    // Le déclencheur est un <button> natif de la page ; la confirmation
    // est un `IonAlert` (ConfirmModal adossé, A6) — on pilote depuis
    // l'hôte visible pour traverser son shadow DOM.
    cy.get('button[aria-label="Vider la corbeille"]', { timeout: 30_000 }).click({
      force: true,
    });
    // Confirmation explicite (titre distinct).
    cy.get('ion-alert', { timeout: 20_000 })
      .filter(':visible')
      .contains('Vider la corbeille ?')
      .should('exist');
    cy.get('ion-alert')
      .filter(':visible')
      .find('button')
      .contains('Vider la corbeille')
      .click({ force: true });

    cy.window({ timeout: 40_000 }).then({ timeout: 40_000 }, async (win) => {
      await waitForGone(dbOf(win), 'groups', groupId);
    });
  });
});
