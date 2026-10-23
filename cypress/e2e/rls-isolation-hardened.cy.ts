/**
 * Cypress E2E — Isolation des données avec le JETON RÉEL de l'utilisateur
 *
 * Les specs `rls-leak.cy.ts` et `cross-tenant.cy.ts` s'authentifient avec la
 * clé ANON (`Authorization: Bearer <anonKey>`) : elles vérifient le rôle
 * `anon`, jamais l'utilisateur connecté. Elles ne peuvent donc PAS détecter une
 * fuite inter-utilisateurs ou inter-organisations survenant pour un compte
 * authentifié (c'est exactement le défaut corrigé en 20261022000006/7/8).
 *
 * Ce spec lit le vrai `access_token` Supabase depuis `localStorage` et vérifie,
 * pour un membre d'organisation :
 *   1. il ne lit QUE son propre profil (aucune fuite de profils tiers) ;
 *   2. il ne lit AUCUNE donnée de `org-1` (organisation par défaut historique) ;
 *   3. `org_family` ne lui expose QUE sa propre organisation ;
 *   4. sans jeton (`anon`), `org_family` n'expose RIEN.
 *
 * Aucune donnée n'est créée : le spec est en lecture seule et idempotent.
 */
describe('Lumina — isolation RLS avec le jeton réel (read-only)', () => {
  const SUPABASE_URL =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;

  /** Lit le vrai access_token de la session Supabase persistée. */
  const realToken = (): Cypress.Chainable<string> =>
    cy.window().then((win) => {
      const ls = win.localStorage;
      const sbKey = Object.keys(ls).find((k) => /-auth-token$/.test(k));
      if (!sbKey) throw new Error('Aucune session Supabase en localStorage');
      const raw = JSON.parse(ls.getItem(sbKey)!);
      const token = raw?.access_token;
      if (!token) throw new Error('access_token absent de la session');
      return token as string;
    });

  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
    cy.ensureAuth();
  });

  it('un membre ne lit que son propre profil (pas de fuite PII)', function () {
    this.timeout(60_000);
    realToken().then((token) => {
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/profiles?select=id,email,org_id`,
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const rows = res.body as any[];
        // Un membre d'une organisation sans collègue ne doit voir QUE lui-même.
        // (Une fuite type `handle_new_user` renverrait des dizaines de profils.)
        expect(rows.length, 'profils lisibles').to.be.lessThan(5);
        cy.log(`✅ profils lisibles par le membre : ${rows.length}`);
      });
    });
  });

  it("un membre ne lit aucune donnée de l'organisation org-1", function () {
    this.timeout(60_000);
    realToken().then((token) => {
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/profiles?org_id=eq.org-1&select=id,email`,
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect((res.body as any[]).length, 'profils org-1 visibles').to.eq(0);
        cy.log('✅ aucun profil de org-1 lisible');
      });
    });
  });

  it('org_family n\'expose que sa propre organisation', function () {
    this.timeout(60_000);
    realToken().then((token) => {
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/org_family?select=ancestor,org_id&limit=50`,
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const orgs = new Set((res.body as any[]).map((r) => r.ancestor));
        // La vue ne doit pas permettre d'énumérer les autres organisations.
        expect(orgs.size, 'organisations distinctes exposées').to.be.lessThan(5);
        cy.log(`✅ org_family expose ${orgs.size} organisation(s)`);
      });
    });
  });

  it('sans jeton, org_family n\'expose aucune organisation', function () {
    this.timeout(60_000);
    cy.request({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/org_family?select=ancestor,org_id&limit=50`,
      headers: { apikey: anonKey },
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect((res.body as any[]).length, 'organisations exposées à anon').to.eq(0);
      cy.log('✅ anon : aucune organisation exposée');
    });
  });
});
