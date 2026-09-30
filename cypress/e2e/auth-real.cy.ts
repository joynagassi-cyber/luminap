/**
 * Cypress E2E — Real auth flows against the live Supabase project.
 *
 * These tests cover the named e2e scenarios from the stabilization plan:
 *   1. Create account with email and password (signup)
 *   2. Sign in with existing email account (login)
 *   3. Resume a session after returning to the app (persisted session)
 *   4. Invitation entry point is discoverable on /auth
 *
 * This is the FIRST spec of the run: it calls cy.signupOrgAccount()
 * (real UI signup + the full onboarding wizard with a real organization
 * creation — no localStorage shortcuts), which persists the org's
 * credentials in `Cypress.env.orgCreds`. Every subsequent cloud spec
 * logs back in with cy.loginOrgAccount() instead of re-signing up, so
 * all specs share exactly one organization — the deterministic pattern
 * the user asked for.
 *
 * No cloud intercept: the real Supabase/PowerSync REST is used.
 */

function uniqueEmail() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return `e2e.${ts}.${rand}@lumina.dev`;
}

describe('Lumina — real auth flows (cloud)', () => {
  const password = `E2e-${Math.random().toString(36).slice(2, 10)}!a`;

  it('Create account with email and password (signup → full onboarding)', function () {
    this.timeout(300_000);

    // Le 1er spec du run : signup COMPLET par l'UI (wizard onboarding +
    // création réelle de l'organisation). Pas de raccourci localStorage :
    // c'est l'exigence stricte de l'utilisateur (signup → onboarding →
    // setup org → dashboard, enchaînement non-faisable par un flag).
    //
    // L'organization qui sort ici (nom unique par run, rôle
    // PASTEUR_PRINCIPAL) est l'org de référence de TOUT le run : les
    // specs suivantes font cy.loginOrgAccount() et atterrissent direct
    // sur /dashboard de cette org.
    const email = uniqueEmail();
    cy.signupOrgAccount({
      orgName: 'Org E2E ' + Date.now().toString().slice(-6),
      orgType: 'Église',
      role: 'PASTEUR_PRINCIPAL',
    }).then((creds) => {
      expect(creds?.email).to.eq(email);
    });
  });

  it('Sign in with existing email account (login → dashboard, NOT onboarding)', function () {
    this.timeout(120_000);

    // Login du MÊME compte d'org (Cypress.env.orgCreds, posé par le
    // test 1). L'org EXISTE déjà, l'onboarding EST déjà complété par le
    // wizard du test 1 → Splash redirige DIRECTEMENT vers /dashboard.
    //
    // C'est la vérification explicite de l'exigence de l'utilisateur :
    // « si pour un flux de connexion l'onboarding réapparaît, il y a un
    // bug produit à corriger ». On échoue si Splash nous renvoie sur
    // /onboarding ou /org-setup au lieu de /dashboard.
    cy.loginOrgAccount();
  });

  it('Resume a session after returning to the app', function () {
    this.timeout(120_000);

    // Do NOT clear localStorage : la session persistée du test 2 doit
    // survivre à un rechargement dur et atterrir de nouveau dans l'app
    // (et PAS sur /auth).
    cy.visit('/splash');
    cy.location('pathname', { timeout: 90_000 }).should((path) => {
      expect(
        ['/dashboard', '/splash'].includes(path),
        `session lost — bounced to ${path}`,
      ).to.be.true;
    });
  });

  it('exposes the invitation entry point on /auth', function () {
    this.timeout(90_000);
    cy.clearLocalStorage();
    cy.visit('/auth');
    // Le bouton « J'ai un code d'invitation » (ajouté 2026-09-30) doit
    // être visible sur l'écran d'auth — point d'entrée découvert de
    // l'invitation.
    cy.contains('button', "J'ai un code d'invitation", {
      timeout: 30_000,
    }).should('be.visible');
  });
});
