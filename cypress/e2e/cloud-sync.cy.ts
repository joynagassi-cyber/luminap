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

    // ── 1. Simulate offline: intercept Supabase REST ───────────────────
    cy.intercept({ method: 'GET', url: `${SUPABASE_URL}/**` }, (req: any) => {
      req.abort('network-error');
    }).as('offlineGet');
    cy.intercept({ method: 'POST', url: `${SUPABASE_URL}/**` }, (req: any) => {
      req.abort('network-error');
    }).as('offlinePost');

    // ── 2. Create group (account) while offline ───────────────────────
    cy.ensureAuth();
    cy.visit('/groups');
    cy.get('h1, h2, h3').contains('Groupes').should('be.visible');
    cy.contains('button', 'Créer').click();
    cy.get('input[placeholder*="groupe"], input[placeholder*="nom"]')
      .first()
      .type(accountName);
    cy.contains('button', /créer le groupe/i).click();

    // ── 3. Create custom field while offline ──────────────────────────
    cy.visit('/custom-fields');
    cy.get('h1, h2, h3').contains('Champs personnalisés').should('be.visible');
    cy.contains('button', 'Créer').click();
    cy.get('.fixed input').first().type('TestSync Custom Field ' + now);
    cy.get('.fixed input').eq(1).type(cfKey);
    cy.contains('button', /créer le champ/i).click();

    // ── 4. Restore online mode ────────────────────────────────────────
    // Cypress 16 a retiré `cy.unrouteAll()` — `cy.restore()` est le
    // repli documenté : il retire toutes les routes interceptées
    // (GET/POST Supabase ci-dessus) et restaure le réseau. Absent des
    // .d.ts de cypress@16 : cast explicite.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cy as any).restore();

    // ── 5. Wait for the sync cycle (runs every ~30 s) ────────────────
    // The sync wait is an external timing constraint, not a flaky
    // UI wait — the app's PowerSync poller needs wall-clock time.
    cy.wait(35_000);

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
