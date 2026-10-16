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
    // On force le context org avant de couper le réseau pour que les
    // écritures offline portent un org_id RLS-validé.
    cy.window().then((win) => {
      const activeOrgId =
        (Cypress.expose('CYPRESS_ORG_ACTIVE_ID') as string) || 'org-e2e';
      const ls = win.localStorage;
      const raw = ls.getItem('lumina-user');
      const user = raw ? JSON.parse(raw) : null;
      if (user) {
        user.org = { id: activeOrgId, name: 'Lumina Org E2E', type: 'CHURCH' };
        ls.setItem('lumina-user', JSON.stringify(user));
      }
      ls.setItem('lumina-active-org', activeOrgId);
    });

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
    // On visite d'abord /dashboard pour laisser PowerSync hydrater le
    // SQLite (streams org_units / caisses) et le context org (l'app
    // lit `lumina-user.org.id` au boot ; sans ça la page /groups est
    // au mode "chargement…" / EmptyState et le CircleAction n'est
    // jamais rendu car canCreateMulti.allowed = false).
    cy.ensureAuth();
    cy.visit('/dashboard', { timeout: 60_000 });
    // 20 s pour le 1er cycle de sync PowerSync (downloading + resolving
    // streams) — c'est aussi le time-to-first-render pour les pages
    // protégées par useGroups()/useOrgUnits() (elles attendent le DB
    // prêt sinon elles restent en skeleton).
    cy.wait(20_000);
    cy.visit('/groups', { timeout: 60_000 });
    // Le bouton rond orange (le + de la page) est un CircleAction
    // (aria-label="Créer un groupe") : c'est lui qui ouvre le form.
    cy.get('button[aria-label="Créer un groupe"]').click();
    // Le champ « Nom du groupe » est un <ion-input> (host Stencil, mode ios)
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

    // ── 5. Wait for the sync cycle (runs every ~30 s) ────────────────
    cy.wait(35_000);

    // DIAG DEV-only : inspecter la queue d'upload PowerSync avant
    // l'assertion REST. Le flag est exposé par initPowerSync() dans
    // src/lib/powersync/index.ts uniquement quand import.meta.env.DEV
    // (pas dans les builds prod). Si `__psDb` est absent, le test
    // échouera sur l'assertion REST sans info diagnostic — on ne
    // bloque PAS le test sur le flag.
    cy.window().then((win: any) => {
      const ps = win.__psDb;
      if (ps && ps.status) {
        const st = ps.status;
        // eslint-disable-next-line no-console
        console.log('[PS DIAG] status:', {
          connected: st.connected,
          hasSynced: st.hasSynced,
          uploading: st.uploading,
          downloadError: st.downloadError?.message,
          uploadError: st.uploadError?.message,
        });
      } else {
        // eslint-disable-next-line no-console
        console.log('[PS DIAG] no __psDb exposed (prod build?)');
      }
      // Forcer un flush explicite de la queue d'upload (si l'app a
      // enqueued des CRUD offline) et vérifier le count d'ops pendantes.
      const probeCrud = async () => {
        try {
          if (!ps || !ps.getNextCrudTransaction) return -1;
          const tx = await ps.getNextCrudTransaction();
          if (!tx) return 0; // vide : tout est uploadé ou la queue est vide
          const n = tx.crud.length;
          // On ne complete() PAS pour laisser le spec vérifier la base
          // Supabase via REST ci-dessous — si on complete(), les op
          // sont perdues et la table reste vide.
          return n;
        } catch (e) {
          return -1;
        }
      };
      probeCrud().then((pending) => {
        // eslint-disable-next-line no-console
        console.log('[PS DIAG] pendingCrud ops:', pending);
      });
    });

    // ── 6. Assert the entities reached Supabase ───────────────────────
    cy.request({
      method: 'GET',
      url:
        `${SUPABASE_URL}/rest/v1/accounts?name=eq.` +
        encodeURIComponent(accountName) +
        `&select=id,name,owner_type,status&limit=5`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }).then((accountsRes: any) => {
      expect(accountsRes.status).to.be.oneOf([200, 201]);
      expect(accountsRes.body.length).to.be.greaterThan(0);
      expect(accountsRes.body[0].name).to.include('TestSync Account');
      expect(accountsRes.body[0].owner_type).to.eq('GROUP');
    });

    cy.request({
      method: 'GET',
      url:
        `${SUPABASE_URL}/rest/v1/custom_field_definitions?key=eq.` +
        encodeURIComponent(cfKey) +
        `&select=id,label,key,entity_type&limit=5`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }).then((cfsRes: any) => {
      expect(cfsRes.status).to.be.oneOf([200, 201]);
      expect(cfsRes.body.length).to.be.greaterThan(0);
    });

    console.log('✅ CLOUD SYNC — group and custom field reached Supabase');
  });
});
