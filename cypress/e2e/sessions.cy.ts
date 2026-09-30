/**
 * Cypress E2E — Session persistence (« Mes comptes »)
 *
 * Le flux exact demandé : après déconnexion, le hub /sessions liste le
 * compte actif de l'organisation ; l'utilisateur clique dessus et est
 * re-s'authentifié SANS retaper ses identifiants (le refresh token est
 * restauré depuis localStorage, voir `handleEnter` de Sessions.tsx).
 *
 * Le spec utilise le compte d'organisation UNIQUE du run (créé par
 * cy.signupOrgAccount() dans le spec d'auth) via cy.loginOrgAccount().
 */

describe('Lumina — Session persistence (Mes comptes, reconnect sans retaper)', () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('logout → /sessions shows the active account → click reconnects without re-login', function () {
    this.timeout(120_000);

    // ── 1. Se déconnecter depuis le hub /sessions ────────────────────
    cy.visit('/sessions');
    // Le compte actif est affiché avec son badge « Actif ».
    cy.get('button[aria-label^="Re-ouvrir"]').should('exist');
    cy.contains('Actif').should('be.visible');

    cy.contains('button', 'Se déconnecter').click();
    // Le sign-out navigue vers /auth (la session Supabase est effacée,
    // mais les comptes restent listés dans /sessions — localStorage
    // lumina-removed-accounts / my-orgs persistent côté client).
    cy.location('pathname', { timeout: 60_000 }).should('eq', '/auth');

    // ── 2. Retourner au hub /sessions (route publique) ──────────────
    cy.visit('/sessions');
    cy.get('button[aria-label^="Re-ouvrir"]').should('exist');

    // ── 3. Cliquer sur le compte : reconnexion SANS retaper ────────
    // `handleEnter` re-hydrate la session Supabase depuis le token
    // local (refresh token), puis entre dans le contexte org. On ne
    // retape AUCUN identifiant : le test échoue si /auth réapparaît.
    cy.get('button[aria-label^="Re-ouvrir"]').first().click();
    cy.location('pathname', { timeout: 90_000 })
      .should('eq', '/dashboard')
      .then(() => {
        cy.window().then((win) => {
          const sbKey = Object.keys(win.localStorage).find((k) => /-auth-token$/.test(k));
          expect(sbKey, 'token Supabase re-persisté après reconnexion').to.be.a('string');
          const raw = JSON.parse(win.localStorage.getItem(sbKey!) || 'null');
          expect(raw?.access_token, 'access_token présent').to.be.a('string');
        });
      });
  });
});
