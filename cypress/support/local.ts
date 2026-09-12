/**
 * Cypress E2E — Local (offline) seeding helpers.
 *
 * The Lumina app is offline-first: every data scenario (transactions, events,
 * forms, groups, custom fields, settings, balance, history, 404, bottom nav)
 * runs against local storage with NO cloud. Cloud (Supabase/PowerSync) is
 * required only for email auth, cross-device sync, and invitation settling.
 *
 * These helpers give the specs two capabilities:
 *   1. seedLocalSession()  — write the localStorage keys the app reads at boot
 *      (auth session, onboarding completion, user, role, config). This lets
 *      `cy.visit('/dashboard')` land on a fully-functional offline shell.
 *   2. interceptCloud()    — abort all Supabase + PowerSync REST so the spec
 *      is truly offline and never leaks real network calls.
 *
 * Usage in a spec:
 *   beforeEach(() => { cy.clearLocalStorage(); cy.seedLocalSession(); });
 *   before(() => { cy.interceptCloud(); });   // if you also want to block
 *                                               // any real network as proof.
 *
 * Key names mirror exactly what the app writes:
 *   sb-lumina-auth       — supabase-js session (access/refresh token + user).
 *                          getSession() reads this WITHOUT a network call when
 *                          the token is present and unexpired → RouteGuard
 *                          (src/App.tsx) passes fully offline.
 *   lumina-onboarded     — legacy "onboarding complete" flag (value: "true")
 *   lumina-onboarding    — current onboarding state JSON (completed: true)
 *   lumina-user          — local user object (id, email, role, org)
 *   lumina-role          — active role
 *   lumina-config        — app config (churchName etc.)
 *   lumina-session       — session id (cotisation / versement services)
 */

declare global {
  namespace Cypress {
    interface Chainable {
      /** Seed the app's localStorage so the shell renders without cloud. */
      seedLocalSession(overrides?: {
        orgName?: string;
        role?: string;
        userId?: string;
        userEmail?: string;
      }): Chainable;
      /** Abort every Supabase + PowerSync REST request (offline mode). */
      interceptCloud(): Chainable;
      /** Restore network for Supabase/PowerSync (unrouteAll). */
      restoreCloud(): Chainable;
    }
  }
}

function nowISO() {
  return new Date().toISOString();
}

function futureExpiry() {
  // 30 days in the future, in seconds (supabase-js expires_at format).
  return Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}

Cypress.Commands.add('seedLocalSession', function (overrides = {}) {
  const orgName = overrides.orgName ?? 'E2E Org';
  const role = overrides.role ?? 'TREASURIER';
  const userId = overrides.userId ?? 'local-user';
  const userEmail = overrides.userEmail ?? 'e2e@test.local';

  // 1. Auth session (supabase-js). The unexpired token makes
  //    authService.getSession() pass the RouteGuard without any network.
  const session = {
    access_token: 'fake-jwt-for-e2e',
    token_type: 'bearer',
    expires_at: futureExpiry(),
    expires_in: 30 * 24 * 60 * 60,
    refresh_token: 'fake-refresh',
    user: {
      id: userId,
      email: userEmail,
      user_metadata: {},
      identities: [],
      aud: 'authenticated',
      created_at: nowISO(),
      updated_at: nowISO(),
    },
  };
  cy.setLocalStorage('sb-lumina-auth', JSON.stringify(session));

  // 2. Onboarding — mark complete so the app lands on /dashboard, not /onboarding.
  cy.setLocalStorage('lumina-onboarded', 'true');
  cy.setLocalStorage(
    'lumina-onboarding',
    JSON.stringify({
      screen: 0,
      branch: 'creator',
      org: {
        name: orgName,
        sigle: orgName
          .split(' ')
          .map((w) => (w ? w[0] : ''))
          .join('')
          .toUpperCase()
          .slice(0, 12),
        type: 'Eglise',
        theme: 'orange',
        features: [],
      },
      role,
      completed: true,
    }),
  );

  // 3. Local user + role + config (read by loadInitialData / useCurrentUser).
  cy.setLocalStorage(
    'lumina-user',
    JSON.stringify({
      id: userId,
      email: userEmail,
      firstName: 'E2E',
      role,
      org: { id: 'default-org', name: orgName, type: 'Eglise' },
    }),
  );
  cy.setLocalStorage('lumina-role', role);
  cy.setLocalStorage('lumina-config', JSON.stringify({ churchName: orgName }));
  cy.setLocalStorage('lumina-session', userId);

  return this;
});

Cypress.Commands.add('interceptCloud', function () {
  const SUPABASE =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const POWERSYNC =
    (Cypress.expose('POWERSYNC_URL') as string) ||
    'https://6a9dd96302481fb31b945823.powersync.journeyapps.com';

  // Abort every Supabase REST/Auth/Storage call + realtime websocket.
  cy.intercept({ url: `${SUPABASE}/**` }, (req: any) => {
    req.abort('network-error');
  });
  // Abort every PowerSync sync call.
  cy.intercept({ url: `${POWERSYNC}/**` }, (req: any) => {
    req.abort('network-error');
  });

  return this;
});

Cypress.Commands.add('restoreCloud', function () {
  // Remove all registered routes (Supabase/PowerSync aborts + any UI intercepts).
  (cy as any).unrouteAll();
  return this;
});

export {};
