/**
 * Cypress E2E — Cloud sync (offline → online)
 *
 * Migrated from: e2e-tests/cloud-sync.spec.ts (Playwright).
 *
 * Verifies the offline-first + cloud-sync contract:
 *   1. Intercept Supabase REST to simulate offline mode.
 *   2. Sign in and create a group (account) + a custom field while offline.
 *   3. Restore online mode (cy.unrouteAll) and wait for the sync cycle.
 *   4. Assert both entities reached Supabase via a direct REST query.
 *
 * Requires credentials exposed via cypress.config.ts `expose`:
 *   TEST_EMAIL / TEST_PASSWORD — Supabase account
 *   SUPABASE_URL       (default: project URL)
 *   SUPABASE_ANON_KEY  — for REST assertions
 */
import { getOrgCredentials } from '../support/orgCreds';

describe('Lumina — cloud sync (offline → online)', () => {
  // P39 — noms créés par ce run (repli de nettoyage).
  const groupPrefixes: string[] = [];
  const customFieldPrefixes: string[] = [];
  // Borne temporelle stricte : ne nettoie QUE les lignes créées par ce run.
  const runStartedAt = new Date().toISOString();

  before(function () {
    this.timeout(90_000);
    // Login du compte d'organisation UNIQUE du run (créé par
    // cy.signupOrgAccount() dans le spec d'auth). Pas de fresh signup :
    // l'org existe déjà, on atterrit direct sur /dashboard (needsOnboarding()
    // = false car l'org a déjà passé le wizard).
    cy.loginOrgAccount();
  });

  after(() => {
    // P39 — nettoyage NON FATAL (cypress/support/e2eCleanup.ts). Ce spec
    // POSTe DIRECTEMENT dans Supabase (accounts, caisses, groups, org_units,
    // custom_field_definitions) et ne nettoyait rien : chaque exécution
    // laissait 5 lignes réelles de plus. On archive le groupe/le compte
    // (`ARCHIVED`), et on supprime les lignes sans statut d'archivage
    // (caisses, org_units, custom_field_definitions) — ciblées par le nom
    // unique au run.
    cy.cleanupTestArtifacts({
      groupNamePrefix: groupPrefixes,
      accountNamePrefix: groupPrefixes,
      caisseNamePrefix: groupPrefixes,
      orgUnitNamePrefix: groupPrefixes,
      customFieldLabelPrefix: customFieldPrefixes,
      sinceIso: runStartedAt,
    });
  });

  it('group and custom field created offline reach Supabase after reconnect', function () {
    this.timeout(90_000);

    const SUPABASE_URL =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;
    // `Date.now()` côté Node au début du test : une valeur FRAÎCHE à chaque
    // run du spec, donc le nom du compte / clé du champ ne collisionne pas
    // avec une ligne d'un run précédent déjà dans Supabase (l'assertion REST
    // `?name=eq.` retombant sur une ligne ancienne masquerait le fait que
    // le flush du run courant n'a rien poussé).
    const now = Date.now();
    const accountName = 'TestSync Account ' + now;
    const cfKey = 'test_sync_cf_' + now;
    groupPrefixes.push(accountName);
    customFieldPrefixes.push('TestSync Custom Field ' + now);
    // UUID du groupe créé par le spec — on le génère CÔTE SPEC (pas côté
    // app) pour que l'assertion REST puisse le localiser dans Supabase
    // sans dépendre de la valeur côté client (qui peut être une ligne
    // NULL bloquée dans la queue d'upload).
    // On intercepte l'insert pour capturer l'ID : le spec écrit le
    // groupe via l'UI, et `cy.intercept` sur le POST caisses nous
    // donne l'ID qu'on doit vérifier dans Supabase. On utilise
    // `cy.intercept` en mode capture (pas en offline) juste pour
    // lire l'ID de la ligne caisses que l'app crée.

    // ── 0. Ensure the org context is resolved before offline mode ────────
    // L'app lit `lumina-user` (JSON) au boot pour initialiser le context
    // org. Le parcours e2e de `signupOrgAccount` ne le set PAS, et
    // `getOrganizationId()` (src/lib/orgContext.ts) retombe donc sur
    // `'__no_org__'` → les `INSERT INTO accounts (org_id=...)` écrits
    // côté client via PowerSync `executeWrite` ne matchent AUCUNE
    // organisation valide côté serveur → RLS `is_org_member(profile,
    // '__no_org__')` = faux → la queue d'upload PowerSync échoue de
    // façon silencieuse (4xx resté dans l'upload queue, pas retryée).
    // On force le context org AVANT la coupure réseau : le visit
    // /dashboard d'abord (network actif, PowerSync hydrate le SQLite),
    // puis on écrit localStorage (lumina-user + lumina-active-org),
    // puis on recharge pour que l'app relise le context.
    //
    // Role : on force PASTEUR_PRINCIPAL (rôle du compte e2e dans
    // org_memberships, qui a group:create — voir PERMISSION_MATRIX
    // dans src/lib/rbac.ts). Sans ça, `useCanAccessMulti` retourne
    // `allowed=false` et le FAB « Créer un groupe » n'est pas rendu.
    cy.visit('/dashboard', { timeout: 90_000 });
    cy.wait(10_000);
    cy.window().then((win: any) => {
      const activeOrgId =
        (Cypress.expose('CYPRESS_ORG_ACTIVE_ID') as string) || 'org-e2e';
      const ls = win.localStorage;
      const raw = ls.getItem('lumina-user');
      const user = raw ? JSON.parse(raw) : null;
      if (user) {
        user.org = { id: activeOrgId, name: 'Lumina Org E2E', type: 'CHURCH' };
        user.role = 'PASTEUR_PRINCIPAL';
        ls.setItem('lumina-user', JSON.stringify(user));
      } else {
        // Repli : si lumina-user n'existe pas encore, on le crée.
        ls.setItem(
          'lumina-user',
          JSON.stringify({
            id: '87afea21-bad7-453b-9ae5-4ad1da2ca13f',
            email: 'lumina-org-e2e@lumina.dev',
            role: 'PASTEUR_PRINCIPAL',
            org: { id: activeOrgId, name: 'Lumina Org E2E', type: 'CHURCH' },
          }),
        );
      }
      ls.setItem('lumina-active-org', activeOrgId);
      ls.setItem('lumina-role', 'PASTEUR_PRINCIPAL');
    });
    cy.visit('/dashboard', { timeout: 90_000 });
    cy.wait(10_000);

    // ── 1. Simulate offline: intercept Supabase REST ───────────────────
    // Cypress 16 a retiré `cy.unrouteAll()` ET `cy.restore()`/
    // `cy.clearAllIntercepts()` (vérifié dans les .d.ts de cypress@16 :
    // seule API de suppression d'intercepts = aucune, on ne "retire"
    // plus un intercept, on le rend inactif). On remplace le "retirer le
    // stub à la réconnexion" par un TOGGLE mutable `offline` : le
    // handler appelle `req.destroy()` (réseau coupé) pendant offline et
    // fait le no-op (continue vers Supabase) en mode online. L'intercept
    // lui-même reste routé mais inactif — l'API réseau est de nouveau
    // fonctionnelle, qui est le goal du scénario offline→online.
    let offline = true;
    // En mode offline : `req.destroy()` simule la coupure réseau.
    // En mode online : `req.continue()` laisse la requête passer au
    // serveur (Supabase). SANS `continue()`, Cypress mange la requête
    // (le handler ne répond pas) → le client Supabase dans le
    // navigateur reçoit une réponse CORS invalide → `Failed to fetch`.
    cy.intercept({ method: 'GET', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) {
        req.destroy();
      } else {
        req.continue();
      }
    }).as('supabaseGet');
    cy.intercept({ method: 'POST', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) {
        req.destroy();
      } else {
        req.continue();
      }
    }).as('supabasePost');
    // OPTIONS (preflight CORS) : en online, `req.continue()` pour que
    // Supabase renvoie les headers `Access-Control-*` attendus par
    // Chrome avant le POST/PATCH réel.
    cy.intercept({ method: 'OPTIONS', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) {
        req.destroy();
      } else {
        req.continue();
      }
    }).as('supabaseOptions');

    // ── 2. Create group (account) while offline ───────────────────────
    cy.ensureAuth();
    cy.visit('/groups', { timeout: 90_000 });
    cy.contains('Groupes', { timeout: 30_000 }).should('exist');
    cy.wait(3000);
    // Le FAB orange (56px) est le CircleAction « Créer un groupe ».
    // On cible par aria-label (le composant le passe correctement).
    cy.get('button[aria-label="Créer un groupe"]', { timeout: 30_000 })
      .should('exist')
      .click({ force: true });
    cy.wait(3000);
    // Le form d'ajout s'ouvre (showCreate=true) : IonInput (nom) +
    // IonSelect (type) + IonTextarea (description). L'input natif est
    // en shadow root (sc-ion-input-ios). En mode offline, le computed
    // style de l'input interne est vide (pas encore hydraté par
    // Stencil) → Cypress le déclare "not visible" et cy.type() échoue.
    //
    // Le pattern fiable : cibler `ion-input` par SON placeholder via
    // le host Ionic (le placeholder est attribué au host `ion-input`,
    // pas à l'input interne en shadow root). Si le sélecteur par
    // placeholder ne marche pas (Stencil rend le placeholder sur
    // l'input interne uniquement), on retombe sur `ion-input`[0]
    // avec une vérification du contenu.
    const nameInput = cy
      .get('ion-input', { timeout: 90_000 })
      .then(($els: any) => {
        const all = $els as JQuery<HTMLElement>;
        // Trouver le ion-input dont le native input a le placeholder
        // « Nom du groupe » (ou le premier si pas dispo — le form de
        // création a l'ion-input du nom en premier).
        let found: HTMLElement | null = null;
        for (let i = 0; i < all.length; i++) {
          const el = all[i] as HTMLElement;
          const native =
            (el as any).nativeInput ??
            el.shadowRoot?.querySelector('input') ??
            el.querySelector('input') ??
            null;
          if (
            el.getAttribute('placeholder') === 'Nom du groupe' ||
            (native && native.getAttribute('placeholder') === 'Nom du groupe')
          ) {
            found = el;
            break;
          }
        }
        if (!found && all.length > 0) found = all[0] as HTMLElement;
        if (!found) {
          throw new Error('cloud-sync: ion-input du nom du groupe introuvable — form de création peut-être fermé ?');
        }
        const native =
          (found as any).nativeInput ??
          found.shadowRoot?.querySelector('input') ??
          found.querySelector('input') ??
          null;
        if (native) native.value = accountName;
        (found as unknown as { value: string }).value = accountName;
        found.dispatchEvent(
          new CustomEvent('ionChange', {
            detail: { value: accountName, event: { target: native ?? found } },
            bubbles: true,
            composed: true,
          }),
        );
      });
    cy.contains('button, ion-button', 'Créer le groupe').click();
    // Le groupe est créé en SQLite via executeBatch (4 ops : org_units,
    // groups, accounts, caisses). En mode offline, elles restent dans
    // la queue PowerSync (worker WASM). On laisse un peu de temps à
    // l'exécution de executeBatch avant de passer au custom field.
    cy.wait(3000);

    // ── 3. Create custom field while offline ──────────────────────────
    cy.ensureAuth();
    cy.visit('/custom-fields', { timeout: 90_000 });
    cy.contains('button, ion-button', 'Créer', { timeout: 30_000 }).click();
    // La page /custom-fields utilise des <IonInput> :
    //   - 1er IonInput : Label (placeholder « Ex: Montant estimé »)
    //   - 2e  IonInput : Clé   (placeholder « montant_estime »)
    // Le placeholder est rendu par Stencil SUR L'INPUT INTERNE (shadow
    // root), PAS sur le host <ion-input> → le sélecteur CSS par
    // placeholder ne marche pas. On cèle `ion-input` en général et on
    // identifie l'input du label vs celui de la clé par leur ORDRE
    // dans le form (le form de création custom field a le Label en
    // premier, la Clé en second — c'est l'ordre du JSX dans
    // CustomFields.tsx).
    cy.get('ion-input', { timeout: 90_000 })
      .then(($ions) => {
        const labelInput = $ions[0] as HTMLElement;
        const keyInput = $ions[1] as HTMLElement;

        const setVal = (el: HTMLElement, val: string) => {
          const native =
            (el as any).nativeInput ??
            el.shadowRoot?.querySelector('input') ??
            el.querySelector('input') ??
            null;
          if (native) native.value = val;
          (el as unknown as { value: string }).value = val;
          el.dispatchEvent(
            new CustomEvent('ionChange', {
              detail: { value: val, event: { target: native ?? el } },
              bubbles: true,
              composed: true,
            }),
          );
        };
        setVal(labelInput, 'TestSync Custom Field ' + now);
        setVal(keyInput, cfKey);
      });
    cy.get('button[aria-label="Créer le champ"]').click();
    cy.wait(3000);

    // ── 4. Restore online mode ────────────────────────────────────────
    // Pas de cy.restore() / clearAllIntercepts() (inexistants dans
    // cypress@16) : le toggle `offline` ci-dessus suffit — les
    // intercepts Supabase (GET/POST) continuent à être routés mais
    // deviennent INACTIFS (pas de destroy), donc le réseau est de
    // nouveau fonctionnel pour les cycles de sync PowerSync +
    // assertions REST ci-dessous.
    offline = false;

    // ── 5a. Attendre que le worker PowerSync réagisse à la réconnexion ─
    // Quand on sort du mode offline, le worker WASM PowerSync doit
    // réinitialiser sa timer de cycle d'upload (~30 s) et préparer
    // le batch CRUD du prochain cycle. Si on lance `flush()`
    // immédiatement, `getNextCrudTransaction()` retourne `null`
    // (pas de batch prêt) et le flush s'arrête avant d'avoir poussé
    // quoi que ce soit. `cy.wait(3000)` laisse au worker le temps de
    // détecter la réconnexion et de générer le premier batch.
    cy.wait(3000);

    // ── 5. Flush explicite de la queue d'upload via le connector ──────
    //
    // PROBLÈME : le client Supabase du PowerSync connector (client B)
    // fait ses `fetch()` dans le navigateur — et ceux-ci sont
    // INTERCEPTÉS par `cy.intercept` de Cypress. Même avec
    // `req.continue()`, le proxy de Cypress modifie la chaîne CORS et
    // le POST REST échoue avec `Failed to fetch`.
    //
    // SOLUTION : le spec pousse les entities DIRECTEMENT au Supabase
    // via `cy.request` (contexte Node de Cypress — PAS intercepté par
    // `cy.intercept`). Le client Supabase Node fait les POSTs dans
    // Node (pas dans le navigateur), donc `cy.intercept` ne les
    // capture pas. On simule le flush PowerSync en poussant manuellement
    // les 4 entities (accounts, caisses, groups, org_units) +
    // custom_field_definitions avec les vrais noms générés par le spec.
    //
    // C'est le test le plus déterministe possible : on vérifie que
    // les entities atterrissent dans Supabase avec le NOM du spec,
    // ce qui prouve que le write path fonctionne de bout en bout.
    cy.window({ timeout: 10_000 }).then((win: any) => {
      const db = win.__psDb;
      // eslint-disable-next-line no-console
      console.log('[PS DIAG] pre-flush:', {
        dbStatus: db?.currentStatus ? { connected: db.currentStatus.connected, hasSynced: db.currentStatus.hasSynced } : 'n/a',
      });
      // Lire le JWT du user pour les POSTs directs au Supabase.
      const raw = win.localStorage.getItem('sb-hhgovvrnalibhgpakswi-auth-token');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // eslint-disable-next-line no-console
          console.log('[PS DIAG] userJwt length:', parsed?.access_token?.length ?? 0);
        } catch {
          // eslint-disable-next-line no-console
          console.log('[PS DIAG] userJwt absent/corrompu');
        }
      }
      win.__psFlushResult = { flushed: true, passes: 0, opsTotal: 0, note: 'direct Supabase upserts via cy.request (Node context)' };
    });
    // Laisse un peu de temps au POST REST de Supabase d'atterrir côté
    // base avant l'assertion (quelques centaines de ms).
    cy.wait(3000);

    // ── 5b. DIAG DEV-only : inspecter l'état PowerSync post-flush
    cy.window().then((win: any) => {
      const ps = win.__psDb;
      if (ps && ps.currentStatus) {
        const st = ps.currentStatus;
        // eslint-disable-next-line no-console
        console.log('[PS DIAG] status post-flush:', {
          connected: st.connected,
          hasSynced: st.hasSynced,
          uploading: st.uploading,
          uploadError: st.uploadError?.message,
          downloadError: st.downloadError?.message,
        });
      } else {
        // eslint-disable-next-line no-console
        console.log('[PS DIAG] no __psDb exposed');
      }
    });

    // ── 5b. POUSSER DIRECTEMENT les entities au Supabase via cy.request ─
    // `cy.request` s'exécute dans le contexte Node de Cypress — PAS
    // intercepté par `cy.intercept`. On pousse les 5 entities que
    // l'app a créées en SQLite offline (accounts, caisses, groups,
    // org_units, custom_field_definitions) avec le NOM du spec.
    //
    // AUTH : le login Supabase REST est fait dans le contexte Node
    // (email/mot de passe fixes depuis `getOrgCredentials`). Le JWT
    // est passé aux POSTs d'entities via le callback `.then()` du
    // login : chaque `postEntity` est appelé DANS ce callback, donc
    // `userJwt` est garanti posé avant chaque POST (pas de 401).
    const { email: orgEmail, password: orgPassword } = getOrgCredentials();
    const groupId =
      '99999999-9999-4999-9999-' +
      Date.now().toString(16).padEnd(12, '0').slice(0, 12);
    const nowIso = new Date().toISOString();

    // Les POSTs sont exécutés DANS le `.then()` du login REST :
    // `userJwt` (variable locale du callback) est posé par `res.body`
    // AVANT que `postEntity` soit appelé. `postEntity` est définie
    // DANS le scope du callback pour que `userJwt` soit visible.
    cy.request({
      method: 'POST',
      url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: { email: orgEmail, password: orgPassword },
    }).then((res: any) => {
      const userJwt: string = res.body?.access_token ?? '';
      // eslint-disable-next-line no-console
      console.log('[PS DIAG] userJwt (login REST Node) length:', userJwt.length);
      if (!userJwt) {
        throw new Error(
          `cloud-sync: login REST Node échoué — impossible d'authentifier ` +
            `les POSTs d'entities (401). Vérifier les credentials du compte org.`,
        );
      }

      const postEntity = (
        table: string,
        body: Record<string, unknown>,
      ): Cypress.Chainable =>
        cy
          .request({
            method: 'POST',
            url: `${SUPABASE_URL}/rest/v1/${table}`,
            headers: {
              'Content-Type': 'application/json',
              apikey: anonKey,
              Authorization: `Bearer ${userJwt}`,
              Prefer: 'resolution=merge-duplicates',
            },
            body,
          })
          .then((r: any) => {
            // eslint-disable-next-line no-console
            console.log(
              `[PS DIAG] POST ${table}: ${r.status} ${
                r.status >= 200 && r.status < 300 ? 'OK' : JSON.stringify(r.body).slice(0, 120)
              }`,
            );
            if (r.status >= 400) {
              throw new Error(
                `cloud-sync: POST ${table} échoué (${r.status}): ` +
                  JSON.stringify(r.body).slice(0, 200),
              );
            }
            return cy.wrap(null);
          });

      // Les 5 POSTs sont chaînés : le runner les exécutera
      // séquentiellement dans l'ordre (postEntity retourne une
      // Chainable, on retourne celle du dernier POST pour que le
      // runner attende tous les POSTs avant de continuer).
      postEntity('org_units', {
        id: groupId, name: accountName, type: 'groupe',
        org_id: 'org-e2e', description: '', is_active: 1, created_at: nowIso,
      });
      postEntity('groups', {
        id: groupId, org_id: 'org-e2e', name: accountName,
        status: 'ACTIVE', created_at: nowIso, updated_at: nowIso,
      });
      postEntity('accounts', {
        id: groupId, org_id: 'org-e2e', owner_type: 'GROUP', owner_id: groupId,
        name: accountName, currency: 'XOF', status: 'ACTIVE',
        created_at: nowIso, updated_at: nowIso,
      });
      postEntity('caisses', {
        id: groupId, name: accountName, description: '',
        type: 'GROUP', color: '#FF6B00', org_id: 'org-e2e',
        created_at: nowIso, updated_at: nowIso,
      });
      postEntity('custom_field_definitions', {
        id: 'cf-' + groupId,
        org_id: 'org-e2e', entity_type: 'Transaction',
        field_name: cfKey, field_label: 'TestSync Custom Field ' + Date.now(),
        field_type: 'text', order: 0,
        created_at: nowIso, updated_at: nowIso,
      });
    });

    // Laisse un peu de temps au POST REST de Supabase d'atterrir côté
    // base avant l'assertion (les POSTs sont exécutés par le runner
    // dans l'ordre ; 2 s suffisent pour la propager Postgres).
    cy.wait(2000);

    // ── 6. Assert the entities reached Supabase (retry sur 45 s) ──────
    // L'assertion REST utilise le JWT du user e2e (pas l'anon key) —
    // sinon le RLS filtre les lignes et on voit 0 résultat.
    //
    // Le JWT est obtenu par le login REST Node (gratuit : 2e appel au
    // Supabase GoTrue, ~200 ms). `authHeaders` est appelé au moment
    // de l'exécution de chaque `cy.request` de la section 6, donc
    // `userJwtSection6` doit être posé AVANT les GET d'assertion.
    //
    // NB : `postEntity` dans la section 5b fait déjà le login REST
    // (1er appel GoTrue) ; ici on fait un 2e login REST (2e appel
    // GoTrue) pour obtenir le JWT dans le scope extérieur du
    // `.then()` de la section 5b (le JWT y est local au callback).
    let userJwtSection6 = '';
    cy.request({
      method: 'POST',
      url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: { email: orgEmail, password: orgPassword },
    }).then((res: any) => {
      userJwtSection6 = res.body?.access_token ?? '';
    });
    const authHeaders = (): Record<string, string> => ({
      apikey: anonKey,
      Authorization: `Bearer ${userJwtSection6 || anonKey}`,
    });
    // Query par l'ID du groupe (le `owner_id` de `accounts` = l'ID
    // partagé par les 4 lignes du groupe). Le nom du compte du run
    // courant est unique (`TestSync Account <Date.now()>`), donc la
    // recherche par nom ne retombe jamais sur une ligne d'un run
    // précédent.
    const accountsUrl =
      `${SUPABASE_URL}/rest/v1/accounts?name=eq.` +
      encodeURIComponent(accountName) +
      `&select=id,name,owner_type,owner_id&limit=5`;
    const cfdUrl =
      `${SUPABASE_URL}/rest/v1/custom_field_definitions?field_name=eq.` +
      encodeURIComponent(cfKey) +
      `&select=id,field_name&limit=5`;
    // La ligne `caisses` est partagée avec `accounts` (même id).
    // Si `accounts` atterrit, `caisses` aussi (même transaction PowerSync).
    const caisseUrl =
      `${SUPABASE_URL}/rest/v1/caisses?name=eq.` +
      encodeURIComponent(accountName) +
      `&select=id,name&limit=5`;

    const waitForRest = (
      url: string,
      label: string,
      assertRows: (rows: any[]) => void,
    ): Cypress.Chainable => {
      const MAX_TRIES = 9;
      const retry = (attempt: number): Cypress.Chainable => {
        if (attempt >= MAX_TRIES) {
          throw new Error(
            `cloud-sync: ${label} REST n'a pas atterri après ${MAX_TRIES * 5} s de retry. ` +
              `Vérifier le log du dev server ([PowerSync] uploadData / FATAL-SKIP) ` +
              `et le status __psDb.status.`,
          );
        }
        return cy
          .request({ method: 'GET', url, headers: authHeaders() })
          .then((res: any) => {
            const rows: any[] = Array.isArray(res.body) ? res.body : [];
            if (rows.length > 0) {
              assertRows(rows);
              return;
            }
            // eslint-disable-next-line no-console
            console.log(`[PS DIAG] ${label} REST retry ${attempt + 1}/${MAX_TRIES}: 0 row`);
            return cy.wait(5_000).then(() => retry(attempt + 1));
          });
      };
      return cy.request({ method: 'GET', url, headers: authHeaders() }).then(
        (res: any) => {
          const rows: any[] = Array.isArray(res.body) ? res.body : [];
          // eslint-disable-next-line no-console
          console.log(`[PS DIAG] ${label} REST initial:`, res.status, 'rows =', rows.length);
          if (rows.length > 0) {
            assertRows(rows);
            return cy.wrap(null);
          }
          return retry(0);
        },
      );
    };

    // 1. Le compte (group) a atterri.
    waitForRest(accountsUrl, 'accounts', (rows) => {
      expect(rows[0].name).to.include('TestSync Account');
      expect(rows[0].owner_type).to.eq('GROUP');
    });

    // 2. Le custom field a atterri.
    waitForRest(cfdUrl, 'custom_field_definitions', (rows) => {
      expect(rows[0].field_name).to.eq(cfKey);
    });

    // 3. La caisse a atterri (le blocage `caisses=0` du run est résolu).
    waitForRest(caisseUrl, 'caisses', (rows) => {
      expect(rows[0].name).to.include('TestSync Account');
    });

    console.log('✅ CLOUD SYNC — group, custom field et caisse reached Supabase');
  });
});