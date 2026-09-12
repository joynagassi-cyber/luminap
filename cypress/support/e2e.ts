/**
 * Cypress E2E — Global setup + custom commands.
 *
 *   cy.login(email, password)   — signs in via the /auth UI page (requires cloud)
 *   cy.skipOnboarding()         — runs the onboarding wizard (creator → org setup)
 *   cy.prepareSession(email, pw)— login + onboarding in one call (cloud)
 *   cy.requireCredentials()     — fail fast when cloud credentials are missing
 *
 * The LOCAL (offline) session helpers — `cy.seedLocalSession()`,
 * `cy.interceptCloud()`, `cy.restoreCloud()` — live in
 * `cypress/support/local.ts` and are registered below via `import './local'`.
 *
 * Auth model (offline-first):
 *   supabase-js persists the session in localStorage under the key
 *   `sb-lumina-auth`. `authService.getSession()` reads it WITHOUT a network
 *   call when the token is present and unexpired, so a seeded localStorage
 *   session passes the `RouteGuard` (src/App.tsx) entirely offline.
 *   Every data scenario then runs against local PowerSync/IndexedDB + the
 *   Zustand store — no Supabase/PowerSync network needed.
 *
 * Exposed keys (set from shell env vars at cypress.config.ts load time):
 *   TEST_EMAIL / TEST_PASSWORD — Supabase test account (cloud specs only)
 *   SUPABASE_URL / SUPABASE_ANON_KEY — for direct REST assertions
 *   POWERSYNC_URL — PowerSync worker URL (for offline interception)
 */

declare global {
  namespace Cypress {
    interface Chainable {
      /** Signs in via the /auth UI page. No-op if credentials are empty. */
      login(email: string, password: string): Chainable;
      /** Runs the onboarding wizard (creator branch → org setup → dashboard). */
      skipOnboarding(): Chainable;
      /** login() + skipOnboarding() — full cloud session ready for dashboard. */
      prepareSession(email: string, password: string): Chainable;
      /** Throws a clear error when CYPRESS_TEST_* credentials are not set. */
      requireCredentials(): Chainable;
    }
  }
}

function getExposed(key: string): string {
  return ((Cypress.expose(key) as string) || '').trim();
}

Cypress.Commands.add('login', function (email: string, password: string) {
  if (!email || !password) {
    cy.log('cy.login() — no credentials, skipping');
    return;
  }

  // Clean auth + onboarding state so every spec starts from a fresh login.
  cy.clearLocalStorage();

  cy.visit('/auth');
  cy.get('input[type="email"]').first().type(email);
  cy.get('input[type="password"]').first().type(password);
  cy.contains('button[type="submit"]', 'Se connecter').click();

  // After the fresh local storage, needsOnboarding() is true again, so the
  // app lands on /onboarding. The redirect happens after loadInitialData +
  // OneSignal init — allow up to 60 s for Supabase + data-layer init.
  cy.location('pathname', { timeout: 60_000 }).should((path) => {
    expect(['/onboarding', '/org-setup', '/dashboard', '/']).to.include(
      path as string,
    );
  });
});

/**
 * Completes the onboarding wizard for a fresh session:
 *   1. 8 presentation screens × "Suivant"
 *   2. branch choice: "Je crée mon organisation"
 *   3. /org-setup: name + type + role → "Créer l'organisation"
 *   4. lands on /dashboard
 *
 * Idempotent: a no-op when already on /dashboard.
 */
Cypress.Commands.add('skipOnboarding', function () {
  cy.location('pathname', { timeout: 15_000 }).then((loc) => {
    if (loc === '/dashboard') return; // already onboarded

    // 8 presentation screens: the bottom bar shows
    // "Ignorer | Suivant" on screen 0 and "Précédent | Suivant" after —
    // "Suivant" is the right button on every screen.
    for (let i = 0; i < 8; i++) {
      cy.contains('button', 'Suivant', { timeout: 8_000 }).click();
    }

    // Step 9 — branch choice.
    cy.contains('button', 'Je crée mon organisation').click({ timeout: 15_000 });

    // /org-setup — identity.
    cy.location('pathname', { timeout: 15_000 }).should('include', 'org-setup');
    cy.get('input').first().type('Org Test E2E');
    cy.get('input').eq(1).type('E2E');

    // /org-setup — pick an organisation type (first template, e.g. Église).
    cy.contains('button', 'Église', { timeout: 8_000 }).click();

    // /org-setup — pick a creator role. The Église template exposes
    // 'Pasteur principal', 'Trésorier', 'Comptable', 'Secrétaire',
    // 'Resp. département' — pick Trésorier (full finance rights).
    cy.contains('button', 'Trésorier').click();

    // Confirm — creates the org and navigates to the dashboard.
    cy.contains('button', "Créer l'organisation").click({ force: true });
    cy.location('pathname', { timeout: 60_000 }).should('include', 'dashboard');
  });
});

Cypress.Commands.add('prepareSession', function (email: string, password: string) {
  cy.login(email, password);
  cy.skipOnboarding();
});

Cypress.Commands.add('requireCredentials', function (): Cypress.Chainable {
  const email = getExposed('TEST_EMAIL');
  const password = getExposed('TEST_PASSWORD');
  if (!email || !password) {
    throw new Error(
      'Cloud credentials not configured. Export CYPRESS_TEST_EMAIL and ' +
        'CYPRESS_TEST_PASSWORD (Supabase test account) before running this spec. ' +
        'For a local-only run, use cy.seedLocalSession() instead.',
    );
  }
  return cy.wrap(null);
});

// Register the offline/local helpers (seedLocalSession, interceptCloud,
// restoreCloud) so they are available to every spec.
import './local';

export {};
