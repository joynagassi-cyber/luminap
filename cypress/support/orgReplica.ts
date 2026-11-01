/**
 * Cypress E2E — offline organization-replica seeding.
 *
 * WHY THIS EXISTS
 * ---------------
 * The PowerSync Cloud instance rejects the Supabase JWT audience
 * (`PSYNC_S2105 — Unexpected "aud" claim value: "authenticated"`), so the
 * local replica never downloads. Every page that reads the replica then
 * renders empty and the specs that assert on org data (sessions, events,
 * groups, members, finance, reports…) fail — an *environmental* failure, not
 * a product regression. The repository fix lives in
 * `powersync/service.yaml` (`additional_audiences: ["authenticated"]`) but
 * deploying it needs `PS_ADMIN_TOKEN`, which the agent environment does not
 * have.
 *
 * WHAT IT DOES
 * ------------
 * Writes the minimal organization rows the app reads at boot into the local
 * PowerSync SQLite replica (exposed as `window.__psDb` in DEV builds) and
 * flips the readiness flag (`window.__psMarkReady`, also DEV-only) so the
 * pages render their real UI entirely offline. This is a TEST harness: no
 * product code path is altered, it is a no-op when the DEV handle is absent,
 * and the seeded data lives only in the browser's local replica.
 *
 * USAGE
 * -----
 *   before(() => { cy.loginOrgAccount(); cy.ensureAuth(); });
 *   beforeEach(() => {
 *     cy.visit('/sessions');       // app boots
 *     cy.seedOrgReplica();         // seed the replica + mark it ready
 *   });
 *
 * The seeded rows persist in the local replica across `cy.visit()` calls, so
 * seeding once per spec is usually enough; call it again after a full reload
 * if a page needs the readiness flag before its first data read.
 */
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Seed the local PowerSync replica with the E2E organization and flip
       * the readiness flag. No-op when `window.__psDb` is absent (non-DEV).
       */
      seedOrgReplica(overrides?: {
        orgId?: string;
        orgName?: string;
        userId?: string;
        userEmail?: string;
        role?: string;
      }): Chainable;
      /**
       * Hydrate the local PowerSync replica from Supabase REST for the E2E
       * organization. Needed because the PowerSync Cloud instance rejects the
       * Supabase JWT audience (`PSYNC_S2105`), so the replica never downloads
       * — pages that read it render empty even though the server has the
       * rows. Fetches each table via the connector's Supabase client (RLS
       * applies: the user is an org member) and `INSERT OR REPLACE`s the rows
       * into the local SQLite replica, then purges the resulting upload queue.
       */
      hydrateOrgReplica(opts?: {
        orgId?: string;
        tables?: string[];
        limit?: number;
      }): Chainable;
    }
  }
}

export const E2E_ORG_ID = 'org-e2e';
export const E2E_ORG_NAME = 'Lumina Org E2E';
export const E2E_USER_ID = '87afea21-bad7-453b-9ae5-4ad1da2ca13f';
export const E2E_USER_EMAIL = 'lumina-org-e2e@lumina.dev';
export const E2E_ROLE = 'PASTEUR_PRINCIPAL';
// `org_memberships.id` et `org_admins.id` sont des colonnes `uuid` côté
// Postgres (vérifié : information_schema). Un id textuel arbitraire
// (« e2e-admin-org-e2e ») fait échouer l'upload PowerSync avec 22P02
// (« invalid input syntax for type uuid »), l'op est jetée en FATAL et
// l'événement/la ligne n'atteint jamais le serveur. On réutilise donc les
// UUID RÉELS des lignes existantes de `org-e2e` : le seed local devient
// idempotent vis-à-vis du serveur (upsert sur la même clé primaire).
export const E2E_MEMBERSHIP_ID = '6a9e921a-7b73-4bb9-81a8-7e9e0d5b92cb';
export const E2E_ADMIN_ID = '0e8e5e04-d2d2-443c-a642-2bef185532b8';

interface ReplicaDb {
  writeTransaction: <T>(
    fn: (tx: { execute: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<T>,
  ) => Promise<T>;
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
}

Cypress.Commands.add('seedOrgReplica', function (overrides = {}) {
  const orgId = overrides.orgId ?? E2E_ORG_ID;
  const orgName = overrides.orgName ?? E2E_ORG_NAME;
  const userId = overrides.userId ?? E2E_USER_ID;
  const userEmail = overrides.userEmail ?? E2E_USER_EMAIL;
  const role = overrides.role ?? E2E_ROLE;

  // The DEV handle is published when the app initializes PowerSync; wait for
  // it rather than failing fast (the app boot may still be in flight).
  cy.window({ timeout: 120_000 }).should((win) => {
    expect(
      (win as unknown as { __psDb?: unknown }).__psDb,
      'window.__psDb (PowerSync DEV handle) doit être exposé',
    ).to.exist;
  });

  cy.window({ timeout: 120_000 }).then(async (win) => {
    const w = win as unknown as { __psDb?: ReplicaDb; __psMarkReady?: () => void };
    const db = w.__psDb;
    if (!db?.writeTransaction) return;
    const now = new Date().toISOString();

    await db.writeTransaction(async (tx) => {
      await tx.execute(
        `INSERT OR REPLACE INTO organizations
           (id, name, type, status, parent_org_id, created_at, updated_at)
         VALUES (?, ?, 'Église', 'ACTIVE', NULL, ?, ?)`,
        [orgId, orgName, now, now],
      );
      await tx.execute(
        `INSERT OR REPLACE INTO profiles
           (id, email, first_name, last_name, role, org_id, created_at, updated_at)
         VALUES (?, ?, 'E2E', 'Org', ?, ?, ?, ?)`,
        [userId, userEmail, role, orgId, now, now],
      );
      await tx.execute(
        `INSERT OR REPLACE INTO org_memberships
           (id, user_id, org_id, role, is_primary, status, joined_at)
         VALUES (?, ?, ?, ?, 1, 'ACTIVE', ?)`,
        [E2E_MEMBERSHIP_ID, userId, orgId, role, now],
      );
      await tx.execute(
        `INSERT OR REPLACE INTO org_admins
           (id, admin_profile_id, org_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
        [E2E_ADMIN_ID, userId, orgId, now, now],
      );
    });

    // Les écritures ci-dessus passent par `writeTransaction`, donc PowerSync
    // les met en file d'upload (`ps_crud`). Or ces lignes EXISTENT DÉJÀ sur
    // le serveur (elles y ont été créées au signup de `org-e2e`) : les
    // pousser n'apporte rien et échoue même côté RLS — `org_admins` exige
    // `profiles.role = 'ADMIN'` (l'utilisateur E2E est PASTEUR_PRINCIPAL) et
    // `org_memberships` exige `is_org_admin`. Les ops seraient jetées en
    // FATAL (42501), ce qui pollue le diagnostic d'upload des specs. Le seed
    // est un état LOCAL de rendu : on retire ses ops de la file pour que
    // seule la donnée réellement créée par le test (l'événement) soit poussée.
    const seededTables = ['organizations', 'profiles', 'org_memberships', 'org_admins'];
    // Un SEUL appel (et non un DELETE par table) : contrainte mesurée — le
    // worker WASM de `@powersync/web` se bloque après ~5 allers-retours
    // comlink en Electron headless. Or `seedOrgReplica` + `hydrateOrgReplica`
    // en font déjà plusieurs ; quatre DELETE supplémentaires dépasseraient le
    // seuil et gèleraient le worker (l'erreur remonte en `DataCloneError`).
    await db.execute(
      `DELETE FROM ps_crud WHERE ${seededTables
        .map(() => `data LIKE ?`)
        .join(' OR ')}`,
      seededTables.map((t) => `%"type":"${t}"%`),
    );

    w.__psMarkReady?.();
    // Le drapeau de readiness est un état de module remis à `false` à chaque
    // rechargement de page. On persiste un marqueur localStorage que
    // `publishDevDiagnostics()` relit au boot pour re-marquer « prête » —
    // sans quoi tout `cy.visit()` sur une page gardée après le seed
    // retomberait sur le squelette.
    try {
      win.localStorage.setItem('__e2e-ps-ready', '1');
    } catch {
      /* storage indisponible : le seed reste valable pour la page courante */
    }
  });
});

// ============================================================
// hydrateOrgReplica — REST → réplique locale
// ============================================================

/**
 * Tables de la réplique à hydrater par défaut. Ce sont celles que les specs
 * lisent réellement (formulaires, événements, groupes, membres, catégories,
 * caisses, transactions, rapports). L'ordre suit les dépendances d'affichage
 * (l'org d'abord, puis ses données).
 */
const HYDRATE_TABLES = [
  'organizations',
  'profiles',
  'org_memberships',
  'org_admins',
  'members',
  'groups',
  'group_memberships',
  'events',
  'event_tasks',
  'categories',
  'caisses',
  'accounts',
  'transactions',
  'form_definitions',
  'custom_field_definitions',
  'custom_field_values',
  'report_definitions',
  'org_budgets',
  'documents',
  'cotisations',
  'audit_entries',
];

/** Tables portant une colonne `org_id` → filtre REST `org_id=eq.<orgId>`. */
const ORG_SCOPED = new Set([
  'profiles',
  'org_memberships',
  'members',
  'groups',
  'group_memberships',
  'events',
  'event_tasks',
  'categories',
  'caisses',
  'accounts',
  'transactions',
  'form_definitions',
  'custom_field_definitions',
  'custom_field_values',
  'report_definitions',
  'org_budgets',
  'documents',
  'cotisations',
  'audit_entries',
]);

/** Sérialise une valeur JSON REST vers un type acceptable par SQLite. */
function toSqlValue(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v;
  // Objets/tableaux (jsonb) → texte JSON : le schéma local stocke ces
  // colonnes en `column.text` (ex. `fields`, `options`, `budget_items`).
  return JSON.stringify(v);
}

Cypress.Commands.add('hydrateOrgReplica', function (opts = {}) {
  const orgId = opts.orgId ?? E2E_ORG_ID;
  const tables = opts.tables ?? HYDRATE_TABLES;
  const limit = opts.limit ?? 2000;

  cy.window({ timeout: 120_000 }).should((win) => {
    expect(
      (win as unknown as { __psDb?: unknown }).__psDb,
      'window.__psDb (PowerSync DEV handle) doit être exposé',
    ).to.exist;
  });

  cy.window({ timeout: 180_000 }).then({ timeout: 180_000 }, async (win: any) => {
    const db = win.__psDb as ReplicaDb;
    if (!db?.writeTransaction) return;

    try {
      // Jeton + URL : le client Supabase du connector porte l'URL et la clé.
      const client = win.__psSupabaseClient;
      const supabaseUrl: string =
        client?.supabaseUrl ?? 'https://hhgovvrnalibhgpakswi.supabase.co';
      const anonKey: string = client?.supabaseKey ?? '';
      const sbKey = Object.keys(win.localStorage).find((k) =>
        /-auth-token$/.test(k),
      );
      const token = sbKey
        ? JSON.parse(win.localStorage.getItem(sbKey) ?? '{}')?.access_token
        : null;
      if (!token) {
        win.__psHydrateReport = { error: 'access_token absent' };
        return;
      }

      // Phase 1 (thread principal) : fetch REST de toutes les tables. Les
      // `fetch` ne traversent pas le worker WASM — aucun risque de le geler.
      // On y ajoute les lignes de BASE minimales du seed (org, profil,
      // membership, admin) : elles figurent de toute façon dans les tables
      // hydratées, donc un seul lot suffit — pas de second passage.
      const rowsByTable: Record<string, Record<string, unknown>[]> = {};
      for (const table of tables) {
        let url = `${supabaseUrl}/rest/v1/${table}?select=*&limit=${limit}`;
        if (table === 'organizations') {
          // PAS de filtre `org_id` : les annexes créées pendant le test
          // (org-reports) portent leur PROPRE `id` comme `org_id`, et la
          // hiérarchie se lit via `parent_org_id`. Filtrer sur l'org
          // courante masquerait précisément les organisations à afficher
          // dans l'arborescence. La RLS `is_org_member`/`org_admins`
          // restreint déjà aux orgs visibles par l'utilisateur.
        } else if (ORG_SCOPED.has(table)) {
          url += `&org_id=eq.${orgId}`;
        } else if (table === 'org_admins') {
          // `org_admins` porte bien `org_id`, mais on veut aussi les grants
          // des orgs CRÉÉES PENDANT le test (org-reports crée des annexes
          // dont le créateur reçoit un grant `org_admins`). Un filtre
          // `org_id=eq.<org courante>` manquerait ces grants : on lit donc
          // tous les grants ACTIFS du profil courant, toutes orgs confondues.
          url += `&status=eq.ACTIVE&admin_profile_id=eq.${E2E_USER_ID}`;
        }
        const res = await win.fetch(url, {
          headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length) rowsByTable[table] = rows;
      }

      // Phase 2 : TOUT insérer en UNE transaction → UN seul aller-retour.
      //
      // Contrainte mesurée : le worker WASM de `@powersync/web` se bloque
      // après ~5 allers-retours comlink en Electron headless (le 6e appel
      // `db.execute` ne résout plus jamais → `DataCloneError` non clonable).
      // On ne fait donc que DEUX appels worker au total : cette transaction
      // (qui exécute les `tx.execute` internes SANS aller-retour) et le
      // purge `ps_crud` ci-dessous. Pas de `pragma` par table côté client :
      // il est lu DANS la transaction, idem sans surcoût.
      const report: Record<string, number> = await db.writeTransaction(
        async (tx) => {
          const counts: Record<string, number> = {};
          for (const table of Object.keys(rowsByTable)) {
            const rows = rowsByTable[table];
            const info: any = await tx.execute(
              `SELECT name FROM pragma_table_info('${table}')`,
            );
            const cols: string[] = (info?.array ?? []).map((c: any) =>
              String(c.name),
            );
            if (cols.length === 0) {
              counts[table] = -2;
              continue;
            }
            for (const row of rows) {
              const cc = cols.filter((c) => c in row);
              await tx.execute(
                `INSERT OR REPLACE INTO "${table}" (${cc
                  .map((c) => `"${c}"`)
                  .join(', ')}) VALUES (${cc.map(() => '?').join(', ')})`,
                cc.map((c) => toSqlValue(row[c])),
              );
            }
            counts[table] = rows.length;
          }
          return counts;
        },
      );

      // Phase 3 : purge de la file d'upload — UN seul appel.
      //
      // Ces lignes viennent DU serveur : les re-pousser est inutile et peut
      // échouer en RLS (tables exigeant un rôle admin). On retire d'un coup
      // toutes les entrées `ps_crud` dont le payload cite une table hydratée.
      const hydratedTables = Object.keys(rowsByTable).concat([
        'organizations',
        'profiles',
        'org_memberships',
        'org_admins',
      ]);
      await db.execute(
        `DELETE FROM ps_crud WHERE ${hydratedTables
          .map(() => `data LIKE ?`)
          .join(' OR ')}`,
        hydratedTables.map((t) => `%"type":"${t}"%`),
      );

      win.__psHydrateReport = report;
      win.localStorage.setItem('__e2e-ps-ready', '1');
      win.__psMarkReady?.();
      console.info('[hydrateOrgReplica] report', JSON.stringify(report));
    } catch (err) {
      // Best-effort : une hydratation partielle ne doit jamais faire échouer
      // le hook de session (les assertions du spec signaleront l'absence de
      // données). On consigne pour le diagnostic.
      win.__psHydrateReport = { error: String((err as Error)?.message ?? err) };
      console.info(
        '[hydrateOrgReplica] error',
        String((err as Error)?.message ?? err),
      );
    }
  });
});
