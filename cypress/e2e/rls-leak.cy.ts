/**
 * Cypress E2E — Assertions négatives de fuite RLS via Supabase REST
 *
 * Vérifie que les politiques RLS bloquent la lecture croisée entre
 * organisations (aucune fuite cross-org).
 *
 * DÉFAUTS CORRIGÉS (session 2) :
 *  1. Ce spec interrogeait REST avec la clé **anon** (`Bearer <anonKey>`).
 *     La clé anon n'a aucun `sub` : toutes les requêtes renvoyaient 0 ligne,
 *     y compris l'assertion « l'org courante est visible » → échec
 *     systématique (`expected 0 to be above 0`) **sans jamais tester la
 *     RLS**. Un test rouge permanent qui ne teste rien masque un vrai défaut.
 *  2. Les URL étaient construites avec des littéraux de gabarit évalués à la
 *     **mise en file** des commandes Cypress (avant l'affectation des
 *     variables) → `org_id=eq.` vide. Les étapes sont désormais imbriquées
 *     dans le `.then()` qui les alimente.
 *
 * Méthode : authentification REST déterministe (indépendante de l'UI et de
 * l'ordre des specs), puis :
 *   1. `profiles` AVEC le jeton : aucune ligne d'une autre organisation.
 *   2. Organisations **réellement étrangères** (identifiants seedés connus)
 *      → 0 ligne. Contrôle positif : l'org courante est visible.
 *   3. `transactions` : aucune ligne d'une autre organisation.
 *
 * Ce spec n'écrit AUCUNE donnée.
 */

// Organisations seedées connues, sans lien avec le compte E2E (`org-e2e`).
// Elles existent réellement en base : c'est ce qui rend le test probant
// (un identifiant inexistant ne prouverait qu'un filtrage, pas la RLS).
const FOREIGN_ORG_IDS = ['org-1', 'e2e-auth-org-1', 'org-central'];

describe('Lumina — assertions négatives de fuite RLS (REST, jeton de session)', () => {
  let accessToken = '';
  let anonKey = '';
  let supabaseUrl = '';
  let currentOrgId = '';
  let currentUserId = '';
  let authed: Record<string, string> = {};

  before(function () {
    this.timeout(120_000);

    supabaseUrl =
      (Cypress.expose('SUPABASE_URL') as string) ||
      'https://hhgovvrnalibhgpakswi.supabase.co';
    anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;
    const email = Cypress.expose('ORG_EMAIL') as string;
    const password = Cypress.expose('ORG_PASSWORD') as string;

    // Authentification directe par mot de passe : déterministe.
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
      expect(accessToken, 'jeton de session Supabase').to.be.a('string').and.not
        .be.empty;
      expect(currentUserId, 'identifiant utilisateur').to.be.a('string').and.not
        .be.empty;
      authed = {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      };
    });
  });

  it('les lectures cross-org sont bloquées et l’org courante est visible', function () {
    this.timeout(120_000);

    // ── 1. `profiles` : aucune ligne d'une AUTRE organisation ─────────
    cy.request({
      method: 'GET',
      url: `${supabaseUrl}/rest/v1/profiles?select=id,org_id&limit=500`,
      headers: authed,
    }).then((res: any) => {
      expect(res.status, 'lecture de profiles avec le jeton').to.eq(200);
      const rows = res.body as Array<{ id: string; org_id: string | null }>;
      expect(rows.length, 'profils visibles').to.be.greaterThan(0);

      currentOrgId = rows.find((r) => r.id === currentUserId)?.org_id ?? '';
      expect(currentOrgId, 'org_id de la session').to.be.a('string').and.not.be
        .empty;

      const leaked = rows.filter(
        (r) => r.id !== currentUserId && r.org_id !== currentOrgId,
      );
      expect(
        leaked.map((r) => `${r.id}:${r.org_id}`),
        'aucun profil d’une autre organisation',
      ).to.deep.eq([]);

      // ── 2. Organisations étrangères réellement existantes → 0 ligne ─
      FOREIGN_ORG_IDS.filter((id) => id !== currentOrgId).forEach(
        (foreignId) => {
          cy.request({
            method: 'GET',
            url: `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(
              foreignId,
            )}&select=id,name`,
            headers: authed,
            failOnStatusCode: false,
          }).then((r: any) => {
            expect(r.status, `statut pour ${foreignId}`).to.eq(200);
            expect(
              (r.body as any[]).length,
              `organizations ${foreignId} : 0 ligne (RLS)`,
            ).to.eq(0);
          });
        },
      );

      // ── 3. Contrôle positif : l'org courante EST visible ────────────
      cy.request({
        method: 'GET',
        url: `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(
          currentOrgId,
        )}&select=id,name&limit=1`,
        headers: authed,
      }).then((r: any) => {
        expect(r.status).to.eq(200);
        expect(
          (r.body as any[]).length,
          'l’organisation courante est visible',
        ).to.be.greaterThan(0);
      });

      // ── 4. `transactions` : aucune ligne d'une org étrangère ────────
      cy.request({
        method: 'GET',
        url: `${supabaseUrl}/rest/v1/transactions?select=id,org_id&limit=500`,
        headers: authed,
      }).then((r: any) => {
        expect(r.status).to.eq(200);
        const txs = r.body as Array<{ id: string; org_id: string }>;
        const foreign = txs.filter((t) => t.org_id !== currentOrgId);
        expect(
          foreign.map((t) => `${t.id}:${t.org_id}`),
          'aucune transaction d’une autre organisation',
        ).to.deep.eq([]);
      });
    });
  });
});
