/**
 * Cypress E2E — PR3 « Corbeille / restauration (soft-delete) ».
 *
 * Contrat §6 / Phase 15 : la feature est implémentée (`src/pages/Archives.tsx`,
 * route `/archives`) et couverte en UNITAIRE (`src/pages/__tests__/
 * Archives-restore.test.tsx`, `src/lib/__tests__/org-lifecycle-restore.test.ts`).
 * Ce spec ajoute la couverture E2E DÉDIÉE : le cycle COMPLET, en conditions
 * réelles offline-first (aucune dépendance au cloud).
 *
 * Ce que le spec prouve, bout en bout :
 *   (a) un élément SUPPRIMÉ par le VRAI chemin produit (soft-delete via
 *       `lifecycle.archive`, déclenché depuis l'UI GroupDetail) quitte la liste
 *       active et APPARAÎT dans la corbeille `/archives` ;
 *   (b) « Restaurer » le rétablit : il DISPARAÎT de `/archives` ;
 *   (c) la restauration est RÉELLE : relecture de la ligne dans la réplique
 *       PowerSync (`groups.status = 'ACTIVE'`, métadonnées d'archivage
 *       effacées) ET écriture d'une entrée d'audit `RESTORE` — une simple
 *       mutation d'état React ne produirait ni l'une ni l'autre.
 *
 * NON-VACUITÉ (vérifié localement, mutation NON conservée dans le commit) :
 * neutraliser `handleRestore` (`src/pages/Archives.tsx`, ex. `return` avant
 * `lifecycle.restore`) — ou vider le corps de `LifecycleService.restore` —
 * fait ÉCHOUER (b) et (c).
 *
 * Offline-first : `cy.interceptCloud()` coupe Supabase/PowerSync ; la session
 * et la réplique locale sont seedées (`cy.seedLocalSession` + `cy.seedOrgReplica`)
 * et les lignes du test sont insérées directement dans `window.__psDb`
 * (exposé par PowerSync en mode DEV, cf. local-dashboard.cy.ts).
 *
 * NB : pas d'`import { cy }` — `cy` est global dans le runner (voir le piège
 * de bundling documenté dans local-dashboard.cy.ts).
 */

/** Page Ionic ACTIVE uniquement (les pages visitées restent montées, masquées). */
const PAGE = 'div.ion-page:not(.ion-page-hidden)';

/** Colonnes relues pour prouver l'état réel de la ligne. */
type GroupRow = {
  id: string;
  status: string;
  archived_at: string | null;
  archive_reason: string | null;
};

type PsDb = {
  execute: (sql: string, p?: unknown[]) => Promise<unknown>;
  getAll: (sql: string, p?: unknown[]) => Promise<Array<Record<string, unknown>>>;
};

function dbOf(win: unknown): PsDb {
  const db = (win as { __psDb?: PsDb }).__psDb;
  if (!db) throw new Error('window.__psDb indisponible (PowerSync non démarré)');
  return db;
}

/**
 * Interroge la réplique jusqu'à ce que `groups.status` atteigne `expected`.
 * Les handlers d'écriture sont `async` fire-and-forget côté UI : on relit la
 * donnée jusqu'à convergence, avec échec explicite (jamais de faux positif).
 */
async function waitForGroupStatus(
  db: PsDb,
  id: string,
  expected: string,
  timeoutMs = 15_000,
): Promise<GroupRow[]> {
  const deadline = Date.now() + timeoutMs;
  let last: GroupRow[] = [];
  while (Date.now() < deadline) {
    last = (await db.getAll(
      'SELECT id, status, archived_at, archive_reason FROM groups WHERE id = ?',
      [id],
    )) as GroupRow[];
    if (last[0]?.status === expected) return last;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `groups.status != ${expected} après ${timeoutMs} ms (id=${id}, rows=${JSON.stringify(last)})`,
  );
}

describe('Lumina — PR3 corbeille / restauration (soft-delete)', () => {
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

  it('cycle soft-delete → /archives → restauration réelle', function () {
    this.timeout(180_000);

    // L'organisation active est `default-org` (posée par seedLocalSession, relue
    // par orgContext au boot) : les lignes insérées doivent porter cet `org_id`
    // pour être visibles par `resource.listArchived`.
    const orgId = 'default-org';
    const suffix = Date.now().toString().slice(-6);
    const groupId = `grp-e2e-arch-${suffix}`;
    const groupName = `Chorale E2E ${suffix}`;
    const now = new Date().toISOString();

    cy.window({ timeout: 60_000 }).should((win) => {
      expect(
        (win as unknown as { __psDb?: unknown }).__psDb,
        'window.__psDb (handle PowerSync DEV) doit être exposé',
      ).to.exist;
    });

    // ── Seed d'un groupe ACTIF (org_units + groups + accounts partagent l'id) ─
    cy.window({ timeout: 30_000 }).then({ timeout: 30_000 }, async (win) => {
      const db = dbOf(win);
      await db.execute(
        `INSERT INTO org_units (id, name, type, org_id, description, is_active, created_at)
         VALUES (?, ?, 'groupe', ?, 'Groupe E2E PR3', 1, ?)`,
        [groupId, groupName, orgId, now],
      );
      await db.execute(
        `INSERT INTO groups (id, org_id, name, parent_group_id, responsable_member_id, status, archived_at, archived_by, archive_reason, created_at, updated_at)
         VALUES (?, ?, ?, null, null, 'ACTIVE', null, null, null, ?, ?)`,
        [groupId, orgId, groupName, now, now],
      );
      await db.execute(
        `INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, archived_at, archived_by, archive_reason, created_at, updated_at)
         VALUES (?, ?, 'GROUP', ?, ?, 'XOF', 'ACTIVE', null, null, null, ?, ?)`,
        [groupId, orgId, groupId, groupName, now, now],
      );
    });

    // ── (a) SOFT-DELETE via le VRAI chemin produit (UI GroupDetail) ──────────
    cy.visit('/groups/' + groupId);
    cy.get(PAGE, { timeout: 60_000 }).should('exist');
    cy.get(`${PAGE} h1, ${PAGE} h2, ${PAGE} h3, ${PAGE} ion-title`)
      .contains(groupName, { timeout: 60_000 })
      .should('exist');

    cy.get(`${PAGE} button`).contains('Paramètres', { timeout: 30_000 }).click({ force: true });
    cy.get(`${PAGE} button`)
      .contains('Archiver le groupe', { timeout: 30_000 })
      .click({ force: true });
    // Confirmation via ConfirmModal (aria-label du CTA = libellé).
    cy.get('ion-button[aria-label="Archiver"]', { timeout: 20_000 }).click({ force: true });

    // La bascule est PERSISTÉE : la ligne passe ARCHIVED (relecture réplique).
    cy.window({ timeout: 30_000 }).then({ timeout: 30_000 }, async (win) => {
      const rows = await waitForGroupStatus(dbOf(win), groupId, 'ARCHIVED');
      expect(rows[0].status, 'statut archivé dans la réplique').to.eq('ARCHIVED');
    });

    // ── (a bis) L'élément archivé APPARAÎT dans la corbeille ─────────────────
    cy.visit('/archives');
    cy.contains(groupName, { timeout: 60_000 }).should('be.visible');
    cy.get(`button[aria-label="Restaurer ${groupName}"]`, { timeout: 30_000 }).should(
      'exist',
    );

    // ── (b) RESTAURATION depuis la corbeille ────────────────────────────────
    cy.get(`button[aria-label="Restaurer ${groupName}"]`).click({ force: true });
    // `handleRestore` `await` la mutation AVANT `navigate(-1)` : quitter
    // /archives prouve que la transaction de restauration est terminée (elle
    // tient le verrou SQLite — une lecture immédiate bloquerait).
    cy.location('pathname', { timeout: 30_000 }).should('not.eq', '/archives');

    // ── (c) La restauration est RÉELLE : relecture de la donnée ─────────────
    cy.window({ timeout: 30_000 }).then({ timeout: 30_000 }, async (win) => {
      const db = dbOf(win);
      const rows = await waitForGroupStatus(db, groupId, 'ACTIVE');
      expect(rows[0].status, 'statut rétabli dans la réplique').to.eq('ACTIVE');
      expect(rows[0].archived_at, "métadonnées d'archivage effacées").to.be.oneOf([
        null,
        undefined,
      ]);
      expect(rows[0].archive_reason, "raison d'archivage effacée").to.be.oneOf([
        null,
        undefined,
      ]);

      // Preuve que le chemin `lifecycle.restore` a bien tourné : une mutation
      // d'état React locale n'écrirait AUCUNE entrée d'audit.
      const audits = await db.getAll(
        `SELECT action FROM audit_entries WHERE entity_type = 'Group' AND entity_id = ?`,
        [groupId],
      );
      expect(
        audits.map((a) => a.action),
        "une entrée d'audit RESTORE trace la restauration réelle",
      ).to.include('RESTORE');
    });

    // ── (b bis) L'élément a DISPARU de la corbeille ─────────────────────────
    cy.visit('/archives');
    cy.contains('Archives', { timeout: 60_000 }).should('exist');
    cy.contains(groupName, { timeout: 15_000 }).should('not.exist');
    cy.get(`button[aria-label="Restaurer ${groupName}"]`).should('not.exist');
  });

  it("la corbeille rend un état vide honnête quand rien n'est archivé", function () {
    this.timeout(120_000);
    cy.visit('/archives');
    // La page rend son contenu (pas de squelette perpétuel).
    cy.contains('Archives', { timeout: 60_000 }).should('exist');
    cy.get(PAGE).should('exist');
    cy.get('body').should(($body) => {
      const hasItems = $body.find('button[aria-label^="Restaurer "]').length > 0;
      const hasEmpty = $body.text().includes('Aucun élément archivé');
      expect(
        hasItems || hasEmpty,
        "la corbeille affiche soit des éléments, soit l'état vide explicite",
      ).to.be.true;
    });
  });
});
