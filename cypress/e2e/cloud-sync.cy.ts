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
    cy.visit('/groups');
    // « Groupes » est le titre du TopHeader (Ionic). Le form de création
    // est derrière le bouton « Créer » (aria-label du + Créé). On ouvre
    // le form si besoin (idempotent : le placeholder est déjà visible
    // si showCreate est déjà true).
    cy.get('input[placeholder="Nom du groupe"]').then(($in) => {
      if ($in.length === 0) {
        cy.contains('button', 'Créer').first().click();
      }
    });
    cy.get('input[placeholder="Nom du groupe"]').type(accountName);
    cy.contains('button', 'Créer le groupe').click();

    // ── 3. Create custom field while offline ──────────────────────────
    cy.visit('/custom-fields');
    // « Champs personnalisés » est le titre du TopHeader (Ionic) — le
    // placeholder du Label du modal est le marqueur de présence le plus
    // robuste. Le bouton « Créer » ouvre un modale (role=dialog,
    // aria-label="Nouveau champ").
    cy.contains('button', 'Créer').click();
    cy.get('input[placeholder="Ex: Montant estimé"]').type('TestSync Custom Field ' + now);
    cy.get('input[placeholder="montant_estime"]').type(cfKey);
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
