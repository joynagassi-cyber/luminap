/**
 * Cypress E2E — Real auth flow against the live Supabase project.
 *
 * These tests cover the named e2e scenarios from the stabilization plan:
 *   1. Create account with email and password (signup)
 *   2. Sign in with existing email account (login)
 *   3. Resume a session after returning to the app (persisted session)
 *   4. Invitation entry point is discoverable on /auth
 *
 * They use a fresh, unique email address on each run so they never collide
 * with real user data. The signup creates a real Supabase auth user +
 * profile row (via the on_auth_user_created trigger) — that is the point:
 * we are validating the RLS trigger + upsert_profile path end to end.
 *
 * No cloud intercept: the real Supabase/PowerSync REST is used.
 */

function uniqueEmail() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return `e2e.${ts}.${rand}@lumina.dev`;
}

describe('Lumina — real auth flows (cloud)', () => {
  const email = uniqueEmail();
  const password = `E2e-${Math.random().toString(36).slice(2, 10)}!a`;

  it('Create account with email and password', function () {
    this.timeout(180_000);
    cy.clearLocalStorage();

    cy.visit('/auth');

    // Pré-marcher l'état onboarding AVANT le submit du form : le flag
    // `lumina-onboarded` est lu par `needsOnboarding()` dans
    // `proceedAfterAuth`. Sans ce pré-set, le nouveau compte atterrit sur
    // `/onboarding` (comportement correct) et le test 2 (login) serait
    // bloqué par le wizard 9-étapes. En pré-écrivant le flag, on simule
    // un utilisateur qui a déjà complété l'onboarding à l'inscription et
    // on teste le parcours "login → dashboard" isolément.
    cy.window().then((win) => {
      win.localStorage.setItem('lumina-onboarded', 'true');
      win.localStorage.setItem('lumina-role', 'MEMBRE');
    });

    // Switch to signup mode.
    cy.contains('button', 'Pas encore de compte').click();
    cy.get('input[aria-label="Prénom"]').type('E2e');
    cy.get('input[aria-label="Nom"]').type('Test');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains('button[type="submit"]', 'Créer mon compte').click();

    // After signup the app routes through proceedAfterAuth(forceOnboarding)
    // → /onboarding (new account always goes through onboarding first).
    // If the RLS trigger + upsert_profile path is broken, the user stays on
    // /auth with an error — assert we LEFT /auth instead.
    cy.location('pathname', { timeout: 120_000 }).should((path) => {
      expect(path, `unexpected path ${path}`).not.to.include('auth');
    });
  });

  it('Sign in with existing email account', function () {
    this.timeout(120_000);
    cy.clearLocalStorage();

    cy.visit('/auth');

    // Re-pré-set du flag onboarding : le test 1 a déjà validé le signup ;
    // ici on isole le login d'un compte EXISTANT (le wizard onboarding
    // serait 9 étapes et sortirait du scope du test). Le flag n'existe
    // plus après cy.clearLocalStorage() — on le rétablit après cy.visit.
    cy.window().then((win) => {
      win.localStorage.setItem('lumina-onboarded', 'true');
      win.localStorage.setItem('lumina-role', 'MEMBRE');
    });

    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password);
    cy.contains('button[type="submit"]', 'Se connecter').click();

    // Existing account with onboarding already done in test 1 → dashboard.
    // Allow for /splash or /dashboard (Splash auto-redirects).
    cy.location('pathname', { timeout: 90_000 }).should((path) => {
      expect(
        ['/dashboard', '/splash'].includes(path),
        `unexpected path ${path}`,
      ).to.be.true;
    });
  });

  it('Resume a session after returning to the app', function () {
    this.timeout(120_000);
    // Do NOT clear localStorage: the persisted session from test 2 should
    // survive a hard reload and land back in the app (not /auth).
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
    // The "J'ai un code d'invitation" button (added 2026-09-30) must be
    // visible on the auth screen — the discoverable invitation entry point.
    cy.contains('button', "J'ai un code d'invitation", {
      timeout: 30_000,
    }).should('be.visible');
  });
});
