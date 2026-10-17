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

describe('Lumina — cloud sync (offline → online)', () => {
  before(function () {
    this.timeout(90_000);
    // Login du compte d'organisation UNIQUE du run (créé par
    // cy.signupOrgAccount() dans le spec d'auth). Pas de fresh signup :
    // l'org existe déjà, on atterrit direct sur /dashboard (needsOnboarding()
    // = false car l'org a déjà passé le wizard).
    cy.loginOrgAccount();
  });

  it('group and custom field created offline reach Supabase after reconnect', function () {
    this.timeout(90_000);

    const SUPABASE_URL =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;
    const now = Date.now();
    const accountName = 'TestSync Account ' + now;
    const cfKey = 'test_sync_cf_' + now;

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
    cy.intercept({ method: 'GET', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) {
        req.destroy();
      }
    }).as('supabaseGet');
    cy.intercept({ method: 'POST', url: `${SUPABASE_URL}/**` }, (req: any) => {
      if (offline) {
        req.destroy();
      }
    }).as('supabasePost');

    // ── 2. Create group (account) while offline ───────────────────────
    cy.ensureAuth();
    cy.visit('/groups', { timeout: 90_000 });
    cy.contains('Groupes', { timeout: 30_000 }).should('exist');
    cy.wait(3000);
    // DIAG : lister les aria-labels des boutons pour comprendre pourquoi
    // le FAB n'est pas trouvé par le sélecteur primaire.
    cy.window().then((win: any) => {
      const doc = win.document;
      const labels = Array.from(doc.querySelectorAll('button'))
        .map((b: HTMLButtonElement) => b.getAttribute('aria-label'));
      // eslint-disable-next-line no-console
      console.log('[cloud-sync DIAG] bouton aria-labels:', JSON.stringify(labels));
      // eslint-disable-next-line no-console
      console.log('[cloud-sync DIAG] count ion-input:', doc.querySelectorAll('ion-input').length);
    });
    // Le FAB orange (56px) est le CircleAction « Créer un groupe ».
    // On cible par aria-label (le composant le passe correctement).
    cy.get('button[aria-label="Créer un groupe"]', { timeout: 30_000 })
      .should('exist')
      .click({ force: true });
    cy.wait(3000);
    // Le form d'ajout s'ouvre (showCreate=true) : 2 IonInputs + 1 IonSelect.
    // dont l'input natif est en shadow root (sc-ion-input-ios). En mode
    // offline, le computed style de l'input interne est vide (pas encore
    // hydraté par Stencil) → Cypress le déclare "not visible" et cy.type()
    // échoue. Le pattern fiable (utilisé dans persistence.cy.ts qui passe) :
    // écrire le value sur l'input natif via shadowRoot + dispatcher
    // ionChange sur le host. L'adaptateur Stencil→React de IonInput lit
    // l'event ionChange (pas "input") pour synchroniser le state React.
    cy.get('ion-input', { timeout: 90_000 })
      .then(($ions) => {
        const el = $ions[0] as HTMLElement;
        const native =
          (el as any).nativeInput ??
          el.shadowRoot?.querySelector('input') ??
          el.querySelector('input') ??
          null;
        if (native) native.value = accountName;
        el.value = accountName;
        el.dispatchEvent(
          new CustomEvent('ionChange', {
            detail: { value: accountName, event: { target: native ?? el } },
            bubbles: true,
            composed: true,
          }),
        );
      });
    cy.contains('button', 'Créer le groupe').click();

    // ── 3. Create custom field while offline ──────────────────────────
    cy.visit('/custom-fields');
    cy.contains('button', 'Créer').click();
    // La page /custom-fields utilise des <ion-input> pour Label + Clé
    // (CustomFields.tsx). Même pattern que ci-dessus : on écrit via
    // shadowRoot + ionChange car les inputs internes sont "not visible"
    // en offline.
    // Ordre dans le form : 1er ion-input = Label, 2e = Clé.
    cy.get('ion-input', { timeout: 90_000 })
      .then(($ions) => {
        const labelInput = $ions[0] as HTMLElement;
        const keyInput = $ions[1] as HTMLElement;
        const cfName = 'TestSync Custom Field ' + now;

        const setVal = (el: HTMLElement, val: string) => {
          const native =
            (el as any).nativeInput ??
            el.shadowRoot?.querySelector('input') ??
            el.querySelector('input') ??
            null;
          if (native) native.value = val;
          el.value = val;
          el.dispatchEvent(
            new CustomEvent('ionChange', {
              detail: { value: val, event: { target: native ?? el } },
              bubbles: true,
              composed: true,
            }),
          );
        };
        setVal(labelInput, cfName);
        setVal(keyInput, cfKey);
      });
    cy.get('button[aria-label="Créer le champ"]').click();

    // ── 4. Restore online mode ────────────────────────────────────────
    // Pas de cy.restore() / clearAllIntercepts() (inexistants dans
    // cypress@16) : le toggle `offline` ci-dessus suffit — les
    // intercepts Supabase (GET/POST) continuent à être routés mais
    // deviennent INACTIFS (pas de destroy), donc le réseau est de
    // nouveau fonctionnel pour les cycles de sync PowerSync +
    // assertions REST ci-dessous.
    offline = false;

    // ── 5. Flush explicite de la queue d'upload via le connector ──────
    // Le worker WASM PowerSync est suspendu dans le contexte Electron
    // headless (Cypress) : son cycle d'upload (~30 s) ne tourne pas de
    // façon fiable pendant le test, et `db.getNextCrudTransaction()` ne
    // résoud jamais si le worker n'est pas réveillé (pas de timeout
    // interne dans le SDK).
    //
    // `__psFlushCrudUpload` (exposé en DEV par src/lib/powersync/index.ts)
    // pousse directement la queue d'upload via le client Supabase du
    // connector (SupabaseConnector.uploadData) avec un timeout interne
    // de 5 s par `getNextCrudTransaction`, sans dépendre du timer du
    // worker. C'est exactement ce que le cycle automatique ferait, mais
    // sous contrôle du test — le déterminisme demandé.
    //
    // On l'appelle 3× (3 séries de 5 passes, ~15 s de fenêtre) pour
    // couvrir les op FATAL re-thrown en DEV (replay : l'op reste dans
    // la queue et est rejouée à la passe suivante).
    cy.window().then((win: any) => {
      const flush = win.__psFlushCrudUpload;
      if (typeof flush !== 'function') {
        // eslint-disable-next-line no-console
        console.log('[PS DIAG] no __psFlushCrudUpload exposed (prod build?) — flush impossible');
        return;
      }
      return (async () => {
        for (let round = 0; round < 3; round++) {
          const r = await flush(5);
          // eslint-disable-next-line no-console
          console.log(`[PS DIAG] flush round ${round + 1}:`, JSON.stringify(r));
          if (!r || r.passes === 0 || r.opsTotal === 0) break; // queue vide
          await new Promise((res) => setTimeout(res, 1000)); // laisser l'upload RLS se stabiliser
        }
      })();
    });
    // Laisse le temps au POST REST de Supabase d'atterrir côté base
    // avant l'assertion (quelques centaines de ms).
    cy.wait(2000);

    // ── 5b. DIAG DEV-only : inspecter l'état PowerSync post-flush
    cy.window().then((win: any) => {
      const ps = win.__psDb;
      if (ps && ps.status) {
        const st = ps.status;
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

    // ── 6. Assert the entities reached Supabase (retry sur 45 s) ──────
    // L'assertion REST utilise le JWT du user e2e (pas l'anon key) —
    // sinon le RLS filtre les lignes et on voit 0 résultat. On lit le
    // token directement dans localStorage depuis le contexte navigateur.
    let userJwt = '';
    cy.window().then((win: any) => {
      const raw = win.localStorage.getItem(
        'sb-hhgovvrnalibhgpakswi-auth-token',
      );
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          userJwt = parsed?.access_token ?? '';
        } catch {
          /* JSON corrompu — on retombe sur anonKey */
        }
      }
      // eslint-disable-next-line no-console
      console.log('[PS DIAG] userJwt length:', userJwt?.length ?? 0);
    });

    const authHeaders: Record<string, string> = {
      apikey: anonKey,
      Authorization: `Bearer ${userJwt || anonKey}`,
    };
    const accountsUrl =
      `${SUPABASE_URL}/rest/v1/accounts?name=eq.` +
      encodeURIComponent(accountName) +
      `&select=id,name,owner_type,status&limit=5`;
    const cfdUrl =
      `${SUPABASE_URL}/rest/v1/custom_field_definitions?field_name=eq.` +
      encodeURIComponent(cfKey) +
      `&select=id,field_name,field_label,entity_type&limit=5`;

    // Helper de retry : attend jusqu'à `maxMs` pour que la ligne atterrisse
    // (le cycle d'upload PowerSync du worker est asynchrone). Chaque
    // réessai fait un GET REST avec le JWT user (RLS). Si aucune ligne
    // au bout du délai, on échoue avec un message de diagnostic précis.
    const waitForRest = (
      url: string,
      label: string,
      assertRows: (rows: any[]) => void,
    ): Cypress.Chainable => {
      const MAX_TRIES = 9; // ~45 s
      const retry = (attempt: number) => {
        if (attempt >= MAX_TRIES) {
          return cy.wrap(null as unknown).then((last: any) => {
            throw new Error(
              `cloud-sync: ${label} REST n'a pas atterri après ${MAX_TRIES * 5} s de retry — ` +
                `le cycle d'upload PowerSync du worker n'a PAS poussé le CRUD offline vers Supabase ` +
                `(worker WASM suspendu dans le contexte headless, ou le POST uploadData a échoué). ` +
                `Vérifier le log [PowerSync] uploadData DEV du SupabaseConnector dans le terminal du dev server ` +
                `et le status PowerSync (__psDb.status).`,
            );
          });
        }
        return cy
          .request({ method: 'GET', url, headers: authHeaders })
          .then((res: any) => {
            const rows: any[] = Array.isArray(res.body) ? res.body : [];
            if (rows.length > 0) {
              assertRows(rows);
              return;
            }
            // eslint-disable-next-line no-console
            console.log(`[PS DIAG] ${label} REST retry ${attempt + 1}/${MAX_TRIES}: 0 row — re-check dans 5 s`);
            return cy.wait(5_000).then(() => retry(attempt + 1));
          });
      };
      return cy.request({ method: 'GET', url, headers: authHeaders }).then((res: any) => {
        const rows: any[] = Array.isArray(res.body) ? res.body : [];
        // eslint-disable-next-line no-console
        console.log(`[PS DIAG] ${label} REST initial:`, res.status, 'rows =', rows.length);
        if (rows.length > 0) {
          assertRows(rows);
          return cy.wrap(null);
        }
        return retry(0);
      });
    };

    // Assertion 1 : le compte (group) a atterri dans Supabase.
    waitForRest(
      accountsUrl,
      'accounts',
      (rows) => {
        expect(rows[0].name).to.include('TestSync Account');
        expect(rows[0].owner_type).to.eq('GROUP');
      },
    );

    // Assertion 2 : le custom field a atterri dans Supabase.
    waitForRest(
      cfdUrl,
      'custom_field_definitions',
      (rows) => {
        expect(rows[0].field_name).to.eq(cfKey);
      },
    );

    console.log('✅ CLOUD SYNC — group and custom field reached Supabase');
  });
});