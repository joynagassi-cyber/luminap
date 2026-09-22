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

// Extends the Cypress namespace — the standard idiom for custom commands.
/* eslint-disable @typescript-eslint/no-namespace */
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
  // After a real cloud login, supabase-js persists the session under
  // `sb-<projectId>-auth-token`. The app's RouteGuard (src/App.tsx)
  // trusts `authService.getSession()` — which re-validates the token
  // via a network call to /auth/v1/token. If that call fails (rate
  // limit, transient 401, etc.), the guard bounces us back to /auth,
  // even though the login itself just succeeded.
  //
  // Strategy:
  //   1. Read the real session token from localStorage (key verified at
  //      runtime: `sb-hhgovvrnalibhgpakswi-auth-token`).
  //   2. Mark onboarding complete (`lumina-onboarding` → completed: true)
  //      so the next navigation lands on /dashboard, not /onboarding.
  //   3. Re-visit /splash — the app boots, the guard reads the
  //      still-present token, and Splash's own `needsOnboarding()` check
  //      (now false) routes to /dashboard.
  //
  // This mirrors what `cy.seedLocalSession()` does in local.ts, but
  // keeps the *real* cloud session so the auth is genuine.
  cy.window().then((win) => {
    const ls = win.localStorage;
    const sbKey = Object.keys(ls).find((k) => /-auth-token$/.test(k));
    let user: any = null;
    if (sbKey) {
      try {
        const raw = JSON.parse(ls.getItem(sbKey)!);
        user = raw?.user;
      } catch {
        user = null;
      }
    }
    const userId = user?.id ?? 'local-user';

    // Mark onboarding complete + write local user/role/config.
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
  });

  // Re-route: full reload on /splash. The guard re-checks the token
  // (network call to /auth/v1/token — fast, same-origin), and Splash's
  // needsOnboarding() check (now false) navigates to /dashboard.
  cy.visit('/splash');
  cy.location('pathname', { timeout: 60_000 }).then((loc) => {
    if (!['/dashboard', '/splash'].includes(loc)) {
      // Retry once — the first reload may race a session re-validation.
      cy.visit('/splash');
    }
  });
  cy.location('pathname', { timeout: 60_000 }).should((path) => {
    expect(['/dashboard', '/splash']).to.include(path as string);
  });
  // If we landed on /splash, follow the splash → dashboard redirect
  // (Splash waits ~2 s + data layer init before navigating).
  cy.location('pathname').then((loc) => {
    if (loc === '/splash') {
      cy.wait(3000);
      cy.location('pathname', { timeout: 60_000 }).should('include', 'dashboard');
    }
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
