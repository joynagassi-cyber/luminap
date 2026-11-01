/**
 * Cypress E2E — PR2 « Export/sauvegarde » — volet IMPORT / RESTAURATION.
 *
 * L'export (JSON/CSV) est couvert par `robustness-features.cy.ts` (bouton
 * activé + téléchargement) et le plan de restauration par l'unitaire
 * `src/pages/__tests__/SettingsGestion-import.test.tsx` (résumé, confirmation
 * obligatoire, bornage org). Ce spec ajoute la couverture E2E DÉDIÉE : le
 * cycle COMPLET, en conditions réelles offline-first (réplique locale seedée,
 * aucun appel cloud).
 *
 * Ce que le spec prouve, bout en bout :
 *   (a) un fichier INVALIDE est REFUSÉ explicitement (jamais de restauration
 *       silencieuse) — bandeau « Fichier refusé » ;
 *   (b) un fichier VALIDE affiche un PLAN (résumé créations/mises à jour) SANS
 *       écrire quoi que ce soit avant confirmation ;
 *   (c) CONFIRMER écrit RÉELLEMENT la ligne dans la réplique PowerSync
 *       (`members`) — une simple mutation d'état React ne toucherait pas la base ;
 *   (d) la restauration est TRACÉE : une entrée d'audit `RESTORE` est écrite.
 *
 * NON-VACUITÉ (à vérifier localement, mutation NON conservée) : vider le corps
 * de `restoreBackupRows` (`src/lib/backupRestore.ts`) fait ÉCHOUER (c).
 *
 * NB : pas d'`import { cy }` — `cy` est global dans le runner.
 */

/**
 * NB : `export {}` force le fichier à être un MODULE — sans lui, ce spec est un
 * « script » global et ses déclarations de premier niveau (`PsDb`, `dbOf`, …)
 * entreraient en collision avec celles d'autres specs (TS2451/TS2300/TS2393).
 * `cy` reste global via les types Cypress.
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

/** Interroge la réplique jusqu'à ce que `predicate(rows)` soit vrai. */
async function waitForRows(
  db: PsDb,
  sql: string,
  params: unknown[],
  predicate: (rows: Array<Record<string, unknown>>) => boolean,
  timeoutMs = 15_000,
): Promise<Array<Record<string, unknown>>> {
  const deadline = Date.now() + timeoutMs;
  let last: Array<Record<string, unknown>> = [];
  while (Date.now() < deadline) {
    last = await db.getAll(sql, params);
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`condition non satisfaite après ${timeoutMs} ms: ${JSON.stringify(last)}`);
}

/** Enveloppe de sauvegarde minimale et valide pour l'organisation active. */
function backupBundle(orgId: string, data: Record<string, unknown[]>): string {
  return JSON.stringify({
    format: 'lumina-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    orgId,
    counts: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v.length]),
    ),
    data,
  });
}

describe('Lumina — PR2 import / restauration de sauvegarde', () => {
  before(function () {
    this.timeout(90_000);
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession({ role: 'PASTEUR_PRINCIPAL' });
    cy.visit('/sessions');
    cy.seedOrgReplica();
  });

  it('refuse un fichier invalide, puis restaure un fichier valide (écriture réelle + audit)', function () {
    this.timeout(180_000);

    const orgId = 'default-org';
    const suffix = Date.now().toString().slice(-6);
    const memberId = `mem-e2e-import-${suffix}`;
    const now = new Date().toISOString();

    cy.window({ timeout: 60_000 }).should((win) => {
      expect(
        (win as unknown as { __psDb?: unknown }).__psDb,
        'window.__psDb (handle PowerSync DEV) doit être exposé',
      ).to.exist;
    });

    // ── L'UI d'import est rendue (réplique prête) ───────────────────────────
    cy.visit('/settings/gestion');
    cy.get('[data-testid="backup-import"]', { timeout: 60_000 }).should('exist');
    cy.get('[data-testid="backup-import-input"]', { timeout: 40_000 }).should(
      'exist',
    );

    // ── (a) Fichier INVALIDE → refus explicite, aucune écriture ─────────────
    cy.get('[data-testid="backup-import-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('{ ceci n\'est pas du JSON'),
        fileName: 'corrompu.json',
        mimeType: 'application/json',
      },
      { force: true },
    );
    cy.get('[data-testid="backup-import-rejected"]', { timeout: 20_000 }).should(
      'exist',
    );
    cy.get('[data-testid="backup-import-plan"]').should('not.exist');

    // ── (b) Fichier VALIDE → plan affiché, AUCUNE écriture avant confirmation
    cy.get('[data-testid="backup-import-input"]').selectFile(
      {
        contents: Cypress.Buffer.from(
          backupBundle(orgId, {
          members: [
            {
              id: memberId,
              org_id: orgId,
              first_name: 'E2E',
              last_name: `Import ${suffix}`,
              status: 'ACTIVE',
              joined_at: now,
              created_at: now,
              updated_at: now,
            },
          ],
          }),
        ),
        fileName: 'sauvegarde.json',
        mimeType: 'application/json',
      },
      { force: true },
    );
    cy.get('[data-testid="backup-import-plan"]', { timeout: 20_000 }).should(
      'exist',
    );
    cy.get('[data-testid="backup-import-plan"]').should('contain.text', '1 création(s)');

    // La ligne n'existe PAS encore (le plan est une prévisualisation).
    cy.window({ timeout: 30_000 }).then({ timeout: 30_000 }, async (win) => {
      const rows = await dbOf(win).getAll(
        'SELECT id FROM members WHERE id = ?',
        [memberId],
      );
      expect(rows.length, 'aucune écriture avant confirmation').to.eq(0);
    });

    // ── (c) CONFIRMER → écriture RÉELLE dans la réplique ────────────────────
    cy.get('[data-testid="backup-import-confirm"]', { timeout: 20_000 }).click({
      force: true,
    });
    cy.window({ timeout: 40_000 }).then({ timeout: 40_000 }, async (win) => {
      const db = dbOf(win);
      const rows = await waitForRows(
        db,
        'SELECT id, first_name, org_id FROM members WHERE id = ?',
        [memberId],
        (r) => r.length === 1,
      );
      expect(rows[0].first_name).to.eq('E2E');
      expect(rows[0].org_id, "org_id forcé sur l'organisation du bundle").to.eq(
        orgId,
      );

      // ── (d) La restauration est TRACÉE : entrée d'audit RESTORE ────────────
      const audits = await db.getAll(
        `SELECT action FROM audit_entries WHERE entity_type = 'Backup' AND entity_id = ?`,
        ['sauvegarde.json'],
      );
      expect(
        audits.map((a) => a.action),
        "une entrée d'audit RESTORE trace la restauration réelle",
      ).to.include('RESTORE');
    });
  });
});
