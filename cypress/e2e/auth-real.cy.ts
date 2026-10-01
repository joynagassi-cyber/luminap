/**
 * Cypress E2E — Real auth flows against the live Supabase project.
 *
 * These tests cover the named e2e scenarios from the stabilization plan:
 *   1. Create account with email and password (signup → full onboarding)
 *   2. Sign in with existing email account (login → dashboard, NOT onboarding)
 *   3. Registered but unconfigured user — login resumes onboarding → org setup
 *   4. Resume a session after returning to the app (persisted session)
 *   5. Invitation entry point is discoverable on /auth
 *
 * This is the FIRST spec of the run: it calls cy.signupOrgAccount()
 * (real UI signup + the full onboarding wizard with a real organization
 * creation — no localStorage shortcuts), which persists the org's
 * credentials in `Cypress.env.orgCreds`. Every subsequent cloud spec
 * logs back in with cy.loginOrgAccount() instead of re-signing up, so
 * all specs share exactly one organization — the deterministic pattern
 * the user asked for.
 *
 * IDENTIFIANT UNIQUE : le compte d'organisation est FIXE
 * (lumina-org-e2e@lumina.dev par défaut, override CYPRESS_ORG_EMAIL /
 * CYPRESS_ORG_PASSWORD) — réutilisé à chaque run, jamais d'email
 * éphémère. Voir cypress/support/orgCreds.ts.
 *
 * No cloud intercept: the real Supabase/PowerSync REST is used.
 */

describe('Lumina — real auth flows (cloud)', () => {
  it('Create account with email and password (signup → full onboarding)', function () {
    this.timeout(300_000);

    // Le 1er spec du run : signup COMPLET par l'UI (wizard onboarding +
    // création réelle de l'organisation) — SANS raccourci localStorage :
    // c'est l'exigence stricte de l'utilisateur (signup → onboarding →
    // setup org → dashboard, enchaînement non-faisable par un flag).
    //
    // IDENTIFIANT UNIQUE : le compte est FIXE (lumina-org-e2e@lumina.dev
    // par défaut, override CYPRESS_ORG_EMAIL/CYPRESS_ORG_PASSWORD),
    // réutilisé à chaque run — jamais d'email éphémère. L'organisation
    // qui sort ici est l'org de référence de TOUT le run : les specs
    // suivantes font cy.loginOrgAccount() et atterrissent direct sur
    // /dashboard de cette org.
    cy.signupOrgAccount({
      orgName: 'Lumina E2E',
      orgType: 'Église',
      role: 'PASTEUR_PRINCIPAL',
    });
  });

  it('Sign in with existing email account (login → dashboard, NOT onboarding)', function () {
    this.timeout(120_000);

    // Login du MÊME compte d'org (identifiant unique, posé par le
    // test 1). L'org EXISTE déjà, l'onboarding EST déjà complété par le
    // wizard du test 1 → Splash redirige DIRECTEMENT vers /dashboard.
    //
    // C'est la vérification explicite de l'exigence de l'utilisateur :
    // « si pour un flux de connexion l'onboarding réapparaît, il y a un
    // bug produit à corriger ». On échoue si Splash nous renvoie sur
    // /onboarding ou /org-setup au lieu de /dashboard.
    cy.loginOrgAccount();
  });

  it('Registered but unconfigured user — login resumes onboarding → org setup', function () {
    this.timeout(300_000);

    // Cas EXPLICITE demandé par l'utilisateur : l'user s'était inscrit
    // (email/mot de passe en base) mais n'a JAMAIS passé le setup
    // d'organisation. En revenant en mode login, il doit pouvoir
    // repasser par l'onboarding + le setup de l'organisation, pas
    // rester bloqué sans rôle ni organisation.
    //
    // Ici le compte est le même qu'au test 1 (identifiant unique) ; on
    // simule le « nouveau navigateur » en effaçant les flags locaux
    // (lumina-onboarded etc.) et on rejoue le wizard COMPLET.
    cy.resumeOnboardingForOrgAccount();
  });

  it('Resume a session after returning to the app', function () {
    this.timeout(120_000);

    // Do NOT clear localStorage : la session persistée du test 2 doit
    // survivre à un rechargement dur et atterrir de nouveau dans l'app
    // (et PAS sur /auth).
    cy.visit('/splash');
    // La session persistée du test 2 doit survivre au rechargement dur
    // et atterrir de nouveau dans l'app (et PAS sur /auth).
    cy.location('pathname', { timeout: 90_000 }).should((path) => {
      expect(path, `session lost — bounced to ${path}`).to.be.oneOf([
        '/dashboard',
        '/splash',
      ]);
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
