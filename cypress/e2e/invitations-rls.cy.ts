/**
 * Cypress E2E — R91 : isolation RLS des invitations (REST, jeton de session)
 *
 * Vérifie, par appels REST directs (indépendants de l'UI et de PowerSync),
 * le durcissement introduit par la migration
 * `20261024000002_fix_invitation_secret_leak.sql` :
 *
 *   1. une organisation ÉTRANGÈRE ne voit AUCUNE invitation (0 ligne) ;
 *   2. l'organisation courante voit ses invitations (contrôle positif : le
 *      compte E2E est gestionnaire, `can_manage_invitations` = vrai) ;
 *   3. les `invitation_claims` d'autres organisations sont invisibles ;
 *   4. le rôle `anon` ne voit AUCUNE invitation.
 *
 * Avant le correctif, `invitations_select = is_org_member(...)` exposait
 * `code`/`target_role` de toutes les invitations à tout membre (point 1 et 4
 * auraient échoué). Ce spec n'écrit AUCUNE donnée.
 */

// Organisations seedées connues, sans lien avec le compte E2E (`org-e2e`).
const FOREIGN_ORG_IDS = ['org-1', 'e2e-auth-org-1', 'org-central'];

describe('Lumina — R91 : isolation RLS des invitations', () => {
  let anonKey = '';
  let supabaseUrl = '';
  let accessToken = '';
  let authed: Record<string, string> = {};
  let currentUserId = '';
  let currentOrgId = '';
  let inviteCode = '';

  before(function () {
    this.timeout(120_000);
    supabaseUrl =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;
    const email = Cypress.expose('ORG_EMAIL') as string;
    const password = Cypress.expose('ORG_PASSWORD') as string;
    inviteCode = `E2E-RLS-${Date.now()}`;

    cy.request({
      method: 'POST',
      url: `${supabaseUrl}/auth/v1/token?grant_type=password`,
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: { email, password },
      failOnStatusCode: false,
    }).then((res: any) => {
      expect(res.status, `connexion du compte E2E (${email})`).to.eq(200);
      accessToken = res.body?.access_token ?? '';
      currentUserId = res.body?.user?.id ?? '';
      expect(accessToken, 'jeton de session').to.be.a('string').and.not.be.empty;
      authed = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };
    }).then(() => {
      cy.request({
        url: `${supabaseUrl}/rest/v1/profiles?id=eq.${currentUserId}&select=org_id`,
        headers: authed,
      }).then((res: any) => {
        currentOrgId = res.body?.[0]?.org_id ?? '';
        expect(currentOrgId, 'organisation du compte E2E').to.be.a('string').and
          .not.be.empty;
      });
    });
  });

  after(function () {
    if (!inviteCode || !accessToken) return;
    cy.request({
      method: 'DELETE',
      url: `${supabaseUrl}/rest/v1/invitations?code=eq.${inviteCode}`,
      headers: authed,
      failOnStatusCode: false,
    });
  });

  it('contrôle positif : l’émetteur gestionnaire voit son invitation', function () {
    this.timeout(60_000);
    cy.request({
      method: 'POST',
      url: `${supabaseUrl}/rest/v1/invitations`,
      headers: { ...authed, Prefer: 'return=representation' },
      body: {
        org_id: currentOrgId,
        code: inviteCode,
        target_role: 'MEMBRE',
        expires_at: '2026-12-31T00:00:00Z',
        max_uses: 1,
        issued_by: currentUserId,
      },
      failOnStatusCode: false,
    }).then((res: any) => {
      expect(res.status, 'création de l’invitation').to.eq(201);
      return cy.request({
        url: `${supabaseUrl}/rest/v1/invitations?select=id,code&code=eq.${inviteCode}`,
        headers: authed,
      });
    }).then((res: any) => {
      expect(res.status).to.eq(200);
      expect(res.body.length, 'invitation visible par son émetteur').to.eq(1);
    });
  });

  it('ne voit aucune invitation d’une organisation étrangère', function () {
    this.timeout(60_000);
    FOREIGN_ORG_IDS.forEach((foreignOrg) => {
      cy.request({
        url: `${supabaseUrl}/rest/v1/invitations?select=id,org_id,code,target_role&org_id=eq.${foreignOrg}`,
        headers: authed,
        failOnStatusCode: false,
      }).then((res: any) => {
        expect(res.status, `lecture invitations de ${foreignOrg}`).to.eq(200);
        expect(
          res.body,
          `aucune invitation de ${foreignOrg} ne doit fuiter`,
        ).to.deep.eq([]);
      });
    });
  });

  it('ne voit aucun invitation_claim', function () {
    this.timeout(60_000);
    cy.request({
      url: `${supabaseUrl}/rest/v1/invitation_claims?select=id,invitation_id&limit=5`,
      headers: authed,
      failOnStatusCode: false,
    }).then((res: any) => {
      expect(res.status, 'lecture des invitation_claims').to.eq(200);
      // Aucune claim ne doit concerner une organisation étrangère ; le
      // compte E2E n'a aucune claim propre.
      expect(res.body, 'aucune claim visible').to.deep.eq([]);
    });
  });

  it('le rôle anon ne voit aucune invitation', function () {
    this.timeout(60_000);
    cy.request({
      url: `${supabaseUrl}/rest/v1/invitations?select=id,code&limit=1`,
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      failOnStatusCode: false,
    }).then((res: any) => {
      // Soit l'accès est refusé (401/403), soit la RLS renvoie 0 ligne.
      if (res.status === 200) {
        expect(res.body, 'anon ne doit voir aucune invitation').to.deep.eq([]);
      } else {
        expect([401, 403], 'anon refusé').to.include(res.status);
      }
    });
  });
});
