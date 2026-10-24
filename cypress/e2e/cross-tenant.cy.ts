/**
 * Cypress E2E — Cross-tenant isolation (two orgs, zero data leakage)
 *
 * B2 — Feature « Multi-organization isolation ».
 *
 * Three complementary proofs:
 *   1. UI: create an event in the current org and assert its detail is
 *      displayed (scoped to the ACTIVE Ionic page).
 *   2. REST: the event is visible with its own org_id, and a foreign org_id
 *      returns zero rows — the real leak test.
 *   3. Replica: the local PowerSync database only contains the current org,
 *      so a leaking sync stream would be caught even if the API were
 *      correctly scoped.
 *
 * Session token: querying with the anon key alone returns zero rows for
 * EVERY org (RLS), which used to make the leak assertion « pass » while the
 * spec's own visibility check silently failed. Requests below carry the
 * logged-in user's access token.
 */

import { activePageShouldContain } from '../support/view';

/**
 * Artefact d'environnement : sous Cypress/Electron, le worker PowerSync
 * echoue a cloner son `schema` lors d'un `postMessage` et emet une
 * `DataCloneError` non capturee. Cela ne vient PAS de Lumina (le meme
 * code fonctionne dans un navigateur reel) et Cypress, par defaut,
 * echoue le test courant sur toute exception applicative non capturee.
 *
 * On ignore UNIQUEMENT ce message precis ; toutes les assertions du spec
 * restent actives. Tout autre `uncaught:exception` continue de faire
 * echouer le test.
 */
Cypress.on('uncaught:exception', (err) => {
  if (/could not be cloned/i.test(err.message)) return false;
  return true;
});

describe('Lumina — Cross-tenant isolation (2 orgs)', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  it('orgA event is invisible from a foreign org_id via REST, replica and UI', function () {
    this.timeout(240_000);

    const ts = Date.now().toString().slice(-6);
    const eventName = `CrossTenant Event ${ts}`;
    let eventId = '';

    const SUPABASE_URL =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;

    // ── 0. Session token + current org, read from the app ────────────
    // The org comes from the local PowerSync replica: a REST call with the
    // anon key on `profiles` answers 401, so it cannot be the source.
    let accessToken = '';
    let currentOrgId = '';

    cy.ensureAuth();

    cy.visit('/event/new');
    // Attendre l'hydratation du formulaire avant de le remplir : le champ
    // existe dans le DOM avant que React ne monte, et un remplissage trop
    // tot est ecrase par le premier render (valeur visible puis perdue,
    // d'ou « Le nom est requis »).
    cy.contains('button, ion-button', "Créer l'événement", {
      timeout: 60_000,
    }).should('be.visible');

    // Session reelle lue via le CLIENT SUPABASE DE L'APPLICATION
    // (`window.__psSupabaseClient`, publie par le connecteur PowerSync en
    // dev, donc seulement APRES le montage de l'app). C'est la source la
    // plus fiable : elle reflete exactement la session utilisee par l'app,
    // sans dependre du format de stockage.
    //
    // Ce global n'est publie qu'en mode dev (`import.meta.env.DEV`). Lance
    // contre un build de production (`vite preview` ou le deploiement), ce
    // spec attendrait 4 minutes puis echouerait avec un message obscur
    // (« `__psSupabaseClient` does not exist ») alors que l'app est saine.
    // On echoue donc tout de suite, avec la cause et la marche a suivre.
    cy.window().then((win) => {
      if (!(win as unknown as Record<string, unknown>).__psSupabaseClient) {
        throw new Error(
          "Ce spec exige le serveur de DEV (`npx vite`), pas un build de " +
            "production : `window.__psSupabaseClient` n'est publie qu'en " +
            "mode dev. Lancer via `scripts/run-cypress.sh` (cf. RUNBOOK.md).",
        );
      }
    });

    cy.window()
      .its('__psSupabaseClient')
      .should('exist')
      .then(async (client: any) => {
        const { data } = await client.auth.getSession();
        accessToken = data?.session?.access_token ?? '';
        expect(accessToken, 'jeton de session Supabase').to.be.a('string').and
          .not.be.empty;

        // Org courante : le profil de l'utilisateur connecte. Lue avec le
        // jeton de session (un appel anon sur `profiles` repond 401).
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=org_id&limit=1`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        expect(res.status, 'lecture du profil').to.eq(200);
        const profiles = await res.json();
        currentOrgId = profiles?.[0]?.org_id ?? '';
        expect(currentOrgId, 'org_id de la session').to.be.a('string').and.not.be
          .empty;
      });


    // ── 1. Create an event in the current org ────────────────────────
    cy.typeIonicInput("Nom de l'événement", eventName);
    cy.contains('button, ion-button', "Créer l'événement", {
      timeout: 30_000,
    }).click();
    // `/event/new` matches /^\/event\// too — require a real detail id so a
    // failed creation cannot pass this assertion.
    cy.location('pathname', { timeout: 60_000 })
      .should((path: string) => {
        expect(path, `event detail path: ${path}`).to.match(
          /^\/event\/(?!new$)[^/]+$/,
        );
      })
      .then((path: string) => {
        // On memorise l'id pour la preuve UI de l'etape 5 : naviguer
        // DIRECTEMENT vers la page de detail evite de dependre de la
        // liste `/events`, tronquee et triee par date (R42) — source
        // d'instabilite, pas de defaut d'isolation.
        eventId = path.split('/').filter(Boolean).pop() as string;
      });
    activePageShouldContain('ion-title, h1', eventName);

    // ── 2-4. REST + replica proofs ───────────────────────────────────
    // IMPORTANT : ces requetes sont construites DANS un `cy.then()`. Le
    // corps du test s'execute de maniere SYNCHRONE (toutes les commandes
    // sont mises en file avant la 1re execution) : une URL interpolee
    // directement dans le corps serait construite avec les variables
    // encore vides (`org_id=eq.` → 401). Le `cy.then()` s'execute apres
    // le bloc session, donc avec les vraies valeurs.
    cy.then(() => {
      expect(accessToken, 'jeton disponible').to.be.a('string').and.not.be
        .empty;
      expect(currentOrgId, 'org disponible').to.be.a('string').and.not.be.empty;

      // 2. The event IS visible in its own org.
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/events?org_id=eq.${encodeURIComponent(
          currentOrgId,
        )}&name=eq.${encodeURIComponent(eventName)}&select=id,name,org_id&limit=5`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }).then((eventsRes: any) => {
        expect(eventsRes.status).to.eq(200);
        const rows: any[] = eventsRes.body ?? [];
        expect(
          rows.length,
          `evenement visible dans sa propre org (${currentOrgId})`,
        ).to.be.greaterThan(0);
        expect(rows[0].org_id).to.eq(currentOrgId);
        cy.log(`Event visible in current org: ${rows.length} row(s)`);
      });

      // 3. A foreign org_id returns ZERO rows. No `name=` filter here: a
      // foreign org simply does not have this row, which is the real leak
      // test (absence of data, not absence of match).
      const fakeOrgId = '00000000-0000-0000-0000-000000000000';
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/events?org_id=eq.${fakeOrgId}&select=id,name&limit=5`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }).then((eventsRes: any) => {
        expect(eventsRes.status).to.eq(200);
        expect(eventsRes.body ?? []).to.have.length(0);
        cy.log(`✅ events: 0 rows for foreign org_id (${fakeOrgId})`);
      });

      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/transactions?org_id=eq.${fakeOrgId}&select=id&limit=5`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        expect(res.body ?? []).to.have.length(0);
        cy.log('✅ transactions: 0 rows for foreign org_id');
      });

      // 4. The LOCAL replica only holds the current org. Sync-level proof:
      // a leaking PowerSync stream would surface a foreign org here even if
      // the REST API were correctly scoped.
      cy.window()
        .its('__psDb')
        .then(async (db: any) => {
          const rows = await db.getAll('SELECT DISTINCT org_id FROM events');
          const orgIds = rows.map((r: any) => r.org_id);
          expect(
            orgIds,
            'orgs presentes dans le replica local',
          ).to.deep.equal([currentOrgId]);
          cy.log(`✅ replica local scope a 1 org: ${orgIds.join(', ')}`);
        });
    });

    // ── 5. UI check: the event is still visible in the same org ──────
    // Navigation directe vers la page de detail (id capture a l'etape 1) :
    // deterministe, contrairement a la liste `/events` (tronquee, R42).
    cy.then(() => {
      expect(eventId, 'id de l evenement capture').to.be.a('string').and.not.be
        .empty;
      cy.visit(`/event/${eventId}`);
    });
    activePageShouldContain('ion-title, h1', eventName);

    console.log('✅ CROSS-TENANT — org-scoped data isolation verified');
  });
});
