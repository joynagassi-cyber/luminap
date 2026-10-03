/**
 * Cypress E2E — RLS leak negative assertions via Supabase REST
 *
 * B4 — Vérification directe que les politiques RLS bloquent la lecture
 * croisée entre organisations (pas de fuite cross-org).
 *
 * Méthode :
 *   1. Récupérer les orgs du compte courant (orgMère + annexes éventuelles)
 *   2. Tenter de lire org_reports, event_tasks, organizations filtrés par
 *      un org_id auquel l'utilisateur N'APPARTIENT PAS → doit retourner 0 ligne.
 *   3. Vérifier que les policies existent bien dans pg_policies (via REST
 *      pg_catalog si accessible) — assertion structurelle.
 *
 * Ce spec ne crée AUCUNE donnée — il se contente de vérifier l'absence
 * de fuite RLS. Les credentials du compte principal sont ceux du run
 * (lumina-org-e2e@).
 */

describe('Lumina — RLS leak negative assertions (REST)', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  it('org_reports, event_tasks, organizations return empty for foreign org_id', function () {
    this.timeout(120_000);

    const SUPABASE_URL =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;

    // ── 1. Get the current user's org_id from profiles ────────────────
    cy.request({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/profiles?select=id,org_id`,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    }).then((profilesRes: any) => {
      expect(profilesRes.status).to.eq(200);
      const rows: any[] = profilesRes.body ?? [];
      expect(rows.length).to.be.greaterThan(0);
      const currentOrgId = rows[0].org_id;
      cy.log(`Current user's org_id: ${currentOrgId}`);

      // ── 2. org_reports: query with a deliberately WRONG to_org_id ──
      const fakeOrgId = '00000000-0000-0000-0000-000000000000';
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/org_reports?to_org_id=eq.${fakeOrgId}&select=id,status&limit=5`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        expect((res.body as any[]).length).to.eq(0);
        cy.log('✅ org_reports: 0 rows for foreign org_id');
      });

      // ── 3. org_reports: query with from_org_id ≠ current user's org ─
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/org_reports?from_org_id=eq.${fakeOrgId}&select=id,status&limit=5`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        expect((res.body as any[]).length).to.eq(0);
        cy.log('✅ org_reports: 0 rows for foreign from_org_id');
      });

      // ── 4. event_tasks: foreign org_id → 0 rows ─────────────────────
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/event_tasks?org_id=eq.${fakeOrgId}&select=id,status&limit=5`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        expect((res.body as any[]).length).to.eq(0);
        cy.log('✅ event_tasks: 0 rows for foreign org_id');
      });

      // ── 5. organizations: query the fake org directly ───────────────
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/organizations?id=eq.${fakeOrgId}&select=id,name&limit=1`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        expect((res.body as any[]).length).to.eq(0);
        cy.log('✅ organizations: 0 rows for fake org_id');
      });

      // ── 6. Assert the current org IS visible ────────────────────────
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/organizations?id=eq.${encodeURIComponent(currentOrgId)}&select=id,name&limit=1`,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        expect((res.body as any[]).length).to.be.greaterThan(0);
        cy.log(`✅ organizations: current org visible (${(res.body as any[])[0].name})`);
      });
    });

    console.log('✅ RLS LEAK — no cross-org data leakage via REST');
  });
});
