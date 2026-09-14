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
 *   supabase-js persists the session in localStorage under a key derived from
 *   the Supabase PROJECT id (see `auth.ts` — `createClient(url, key)` with no
 *   `storage` option): `sb-<projectId>-auth-token`.
 *   `authService.getSession()` reads it WITHOUT a network call when the token
 *   is present and unexpired, so a seeded localStorage session passes the
 *   `RouteGuard` (src/App.tsx) entirely offline.
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
/**
 * Completes onboarding for a fresh session WITHOUT walking the wizard.
 *
 * The onboarding completion flag lives in localStorage
 * (`lumina-onboarding`, `lumina-onboarded`, `lumina-role` — see
 * src/lib/onboardingState.ts). Writing `completed: true` makes
 * `needsOnboarding()` return false, so the next navigation lands on the
 * dashboard instead of resuming the wizard.
 *
 * Trade-off vs. the wizard walkthrough: no real organisation row is created
 * in Supabase. Specs that assert cloud-synced data (cloud-sync) still work
 * because the entities they create are new (account / custom field /
 * transaction / event / form), not the organisation itself.
 */
Cypress.Commands.add('skipOnboarding', function () {
  // ── 1. Read the supabase session token from localStorage ──────────
  // After a real cloud login, supabase-js persists the session under
  // `sb-<projectId>-auth-token`. We read it, mark onboarding complete,
  // and hand it back to the app via a full page reload — so the
  // RouteGuard in src/App.tsx (authService.getSession) authenticates
  // without needing a new network call, and the localStorage onboarding
  // flags are already `completed: true`.
  const session = cy.window().then((win) => {
    const ls = win.localStorage;
    const keys = Object.keys(ls);
    const sbKey = keys.find((k) => k.endsWith('-auth-token'));
    if (!sbKey) return null;
    try {
      return JSON.parse(ls.getItem(sbKey)!);
    } catch {
      return null;
    }
  });

  session.then((raw) => {
    // ── 2. Mark onboarding complete + write user/role/config ──────────
    cy.window().then((win) => {
      const ls = win.localStorage;
      const sbKey = Object.keys(ls).find((k) => k.endsWith('-auth-token'));
      if (sbKey && raw) {
        const user = raw.user;
        const userId = user?.id ?? 'local-user';
        // Onboarding completion (src/lib/onboardingState.ts).
        ls.setItem('lumina-onboarded', 'true');
        ls.setItem('lumina-role', 'TREASURIER');
        ls.setItem(
          'lumina-onboarding',
          JSON.stringify({
            screen: 0,
            branch: 'creator',
            org: {
              name: 'Org Test E2E',
              sigle: 'E2E',
              type: 'Eglise',
              theme: 'orange',
              features: [],
            },
            role: 'TREASURIER',
            completed: true,
          }),
        );
        // Local user + config (read by loadInitialData / useCurrentUser).
        ls.setItem(
          'lumina-user',
          JSON.stringify({
            id: userId,
            email: user?.email ?? '',
            firstName: 'E2E',
            role: 'TREASURIER',
            org: { id: 'default-org', name: 'Org Test E2E', type: 'Eglise' },
          }),
        );
        ls.setItem('lumina-config', JSON.stringify({ churchName: 'Org Test E2E' }));
        ls.setItem('lumina-session', userId);
      }
    });

    // ── 3. Full reload → /splash → /dashboard ─────────────────────────
    // A hard visit re-mounts the app. The RouteGuard re-checks
    // authService.getSession() — which reads the token we just kept in
    // localStorage — and passes. With onboarding completed, Splash's
    // own `needsOnboarding()` check routes to /dashboard (not
    // /onboarding). This mirrors what `cy.seedLocalSession()` does in
    // local.ts, but with the real cloud session instead of a fake one.
    cy.visit('/splash');
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
