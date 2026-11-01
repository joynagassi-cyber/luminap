/**
 * Cypress E2E — Création d'organisation self-serve (fin du cul-de-sac
 * « Organisation non rejointe »).
 *
 * ## Défaut visé
 *
 * Un compte tout juste créé (`MEMBRE` / `org_id = '__no_org__'`) qui suivait
 * l'onboarding « Je crée mon organisation » voyait « Créer l'organisation »
 * n'écrire QUE du localStorage : aucun appel `create_org`, aucun grant
 * `org_admins`, aucun rattachement de profil. La garde de route
 * `needs-membership` (R107) bloquait alors le dashboard sur un écran sans
 * issue — l'application était inutilisable pour un nouvel utilisateur.
 *
 * ## Ce que ce spec prouve (bout en bout, cloud réel)
 *
 *   1. le sign-up d'un compte NEUF aboutit ;
 *   2. le wizard « Je crée mon organisation » mène au dashboard (PAS à
 *      l'écran « Organisation non rejointe ») ;
 *   3. la persistance est RÉELLE en base : `profiles.org_id` est renseigné et
 *      `role = 'ADMIN'` (le créateur administre son organisation) ;
 *   4. un grant `org_admins` ACTIVE existe pour le créateur sur cette org.
 *
 * ## Nettoyage
 *
 * Le compte est ÉPHÉMÈRE (e-mail unique par run) — le self-serve exige un
 * compte SANS organisation, impossible avec le compte d'org partagé du run.
 * L'organisation créée est archivée dans `after()` via le helper P39
 * (`cy.cleanupTestArtifacts`, non fatal).
 *
 * LIMITE CONNUE : un compte éphémère ne peut pas être supprimé depuis le
 * client (RLS). Ces comptes (`ss-e2e-*@lumina.dev`) sont purgés par le
 * balayage de maintenance suivant (service_role) :
 *
 *   delete from profiles where email like 'ss-e2e-%@lumina.dev';
 *   delete from auth.users where email like 'ss-e2e-%@lumina.dev';
 *   delete from organizations where name like 'Self-Serve E2E %';
 *
 * (Le compte est créé pour PROUVER le parcours réel d'un nouvel utilisateur ;
 * un raccourci localStorage ne le prouverait pas.)
 */
describe('Lumina — création d’organisation self-serve', () => {
  const SUPABASE_URL =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;

  const ts = Date.now().toString().slice(-6);
  const orgName = `Self-Serve E2E ${ts}`;
  const email = `ss-e2e-${ts}-${Math.floor(Math.random() * 10000)}@lumina.dev`;
  const password = `Ss-${Math.random().toString(36).slice(2, 10)}!a`;
  const runStartedAt = new Date().toISOString();

  after(() => {
    // Archivage (non fatal) des organisations créées par ce run.
    cy.cleanupTestArtifacts({
      orgNamePrefix: [orgName],
      sinceIso: runStartedAt,
    });
  });

  it('un compte neuf crée son organisation et atteint le dashboard (aucun cul-de-sac)', function () {
    this.timeout(360_000);

    // ── 1. Sign-up réel par l'UI ──────────────────────────────────────
    cy.clearLocalStorage();
    cy.visit('/auth');
    cy.contains('button', 'Pas encore de compte', { timeout: 30_000 }).should(
      'be.visible',
    );
    cy.contains('button', 'Pas encore de compte').click();
    cy.get('input[aria-label="Prénom"]').type('Self');
    cy.get('input[aria-label="Nom"]').type('Serve');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains('button[type="submit"]', 'Créer mon compte').click();

    // Compte NEUF : pas de flags onboarding pré-posés → on doit atterrir sur
    // /onboarding (ou /splash le temps que Splash résolve).
    cy.location('pathname', { timeout: 120_000 }).should((path: string) => {
      expect(path, `après signup: ${path}`).to.be.oneOf([
        '/onboarding',
        '/splash',
      ]);
    });
    cy.visit('/onboarding');
    cy.contains('button', /Suivant|Passer/, { timeout: 30_000 }).should(
      'be.visible',
    );

    // ── 2. Wizard → branche « Je crée mon organisation » → /org-setup ──
    for (let i = 0; i < 8; i++) {
      cy.get('button').contains('Suivant', { timeout: 15_000 }).click();
    }
    cy.contains('button', 'Je crée mon organisation', { timeout: 30_000 }).click();
    cy.location('pathname', { timeout: 30_000 }).should('eq', '/org-setup');

    // ── 3. Formulaire d'identité + type + rôle ─────────────────────────
    cy.get('input[placeholder="Église MFE-JC Centrale"]', { timeout: 30_000 })
      .clear()
      .type(orgName);
    cy.get('input[placeholder="MFE"]').clear().type('SS');
    cy.contains('button', 'Église', { timeout: 15_000 }).click();
    cy.contains('button', 'Pasteur principal', { timeout: 15_000 }).click();

    // ── 4. Création RÉELLE ─────────────────────────────────────────────
    cy.contains('button', "Créer l'organisation", { timeout: 30_000 }).click();

    // Preuve n°1 : on atteint /dashboard — JAMAIS l'écran « Organisation non
    // rejointe » (c'était exactement le cul-de-sac).
    cy.location('pathname', { timeout: 120_000 }).should('eq', '/dashboard');
    cy.contains('Organisation non rejointe').should('not.exist');
    cy.get('[data-screen-state="ready"]', { timeout: 30_000 }).should('exist');

    // ── 5. Preuve n°2 : persistance réelle en base ─────────────────────
    // On lit le token de session Supabase (posé par supabase-js au signup).
    cy.window().then((win) => {
      const key = Object.keys(win.localStorage).find((k) =>
        /-auth-token$/.test(k),
      );
      expect(key, 'token de session Supabase présent').to.be.a('string');
      const parsed = JSON.parse(win.localStorage.getItem(key as string) || '{}');
      const token: string = parsed?.access_token ?? '';
      expect(token.length, 'access_token non vide').to.be.greaterThan(0);

      // Le profil doit être rattaché à une organisation réelle (≠ __no_org__)
      // avec le rôle ADMIN canonique.
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/profiles?select=id,org_id,role&limit=1`,
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const me = (res.body as Array<{ org_id: string; role: string }>)[0];
        expect(me, 'profil lisible (RLS soi-même)').to.be.an('object');
        expect(me.org_id, 'org_id rattaché (pas __no_org__)').to.match(/^org-/);
        expect(me.org_id).not.to.eq('__no_org__');
        expect(me.role, 'le créateur est ADMIN').to.eq('ADMIN');

        // Un grant org_admins ACTIVE existe pour cette organisation.
        cy.request({
          method: 'GET',
          url: `${SUPABASE_URL}/rest/v1/org_admins?select=id,status,org_id&limit=5`,
          headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        }).then((grantsRes) => {
          expect(grantsRes.status).to.eq(200);
          const grants = grantsRes.body as Array<{ status: string; org_id: string }>;
          expect(grants.length, 'au moins un grant org_admins').to.be.greaterThan(0);
          expect(
            grants.some((g) => g.status === 'ACTIVE' && g.org_id === me.org_id),
            'grant ACTIVE sur l’organisation créée',
          ).to.eq(true);
        });
      });
    });
  });
});
