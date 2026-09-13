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
 *      (auth session, onboarding completion, user, role, config) via a
 *      `cy.session()` wrapper so the keys are written from the *browser*
 *      context (same origin as the app) and replayed into every test.
 *   2. interceptCloud()    — abort all Supabase + PowerSync REST so the spec
 *      is truly offline and never leaks real network calls.
 *
 * Usage in a spec:
 *   before(() => { cy.interceptCloud(); });
 *   beforeEach(() => { cy.clearLocalStorage(); cy.seedLocalSession(); });
 *   // then in the test body:
 *   cy.visit('/dashboard');  // works fully offline
 *
 * Auth storage key (supabase-js):
 *   `auth.ts` calls `createClient(url, key)` WITHOUT a `storage` option, so
 *   supabase-js derives the localStorage key from the Supabase PROJECT id:
 *   `sb` + <projectId> + `-auth-token` → `sb-hhgovvrnalibhgpakswi-auth-token`.
 *   `authService.getSession()` reads it WITHOUT a network call when the
 *   token is present and unexpired, so a seeded session passes the
 *   `RouteGuard` (src/App.tsx) entirely offline.
 *
 * Local keys:
 *   lumina-onboarded     — "true" when onboarding completed
 *   lumina-onboarding    — onboarding state JSON (completed: true)
 *   lumina-user          — local user object (id, email, role, org)
 *   lumina-role          — active role
 *   lumina-config        — app config (churchName etc.)
 *   lumina-session       — session id (cotisation / versement services)
 */

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Seed the app's localStorage so the shell renders without cloud.
       *
       * Must be called in `beforeEach` *after* `cy.clearLocalStorage()`
       * (or on its own if you just want to seed). The session wrapper
       * replays the written keys into the browser before each test.
       */
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function nowISO() {
  return new Date().toISOString();
}

function futureExpiry() {
  // 30 days in the future, in seconds (supabase-js expires_at format).
  return Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}

/**
 * Build the supabase-js session object + the localStorage key it is stored under.
 * The key is derived from the project id of the configured Supabase URL:
 *   sb-<projectId>-auth-token
 */
function buildSession(overrides: {
  userId?: string;
  userEmail?: string;
}) {
  const userId = overrides.userId ?? 'local-user';
  const userEmail = overrides.userEmail ?? 'e2e@test.local';

  const SUPABASE_HOST =
    (Cypress.expose('SUPABASE_URL') as string | undefined) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const projectId =
    new URL(SUPABASE_HOST).hostname.split('.')[0] || 'hhgovvrnalibhgpakswi';
  const sessionKey = `sb-${projectId}-auth-token`;

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

  return { sessionKey, session };
}

function buildOrgSigle(orgName: string) {
  return orgName
    .split(' ')
    .map((w) => (w ? w[0] : ''))
    .join('')
    .toUpperCase()
    .slice(0, 12);
}

// ── Commands ────────────────────────────────────────────────────────────────

Cypress.Commands.add('seedLocalSession', function (overrides = {}) {
  const orgName = overrides.orgName ?? 'E2E Org';
  const role = overrides.role ?? 'TREASURIER';
  const userId = overrides.userId ?? 'local-user';
  const userEmail = overrides.userEmail ?? 'e2e@test.local';

  const { sessionKey, session } = buildSession({ userId, userEmail });

  // `cy.session()` is the documented Cypress way to write localStorage from
  // the browser context and have it replayed into subsequent tests.
  // We use a unique session name per call so each spec/test can re-seed
  // independently.
  const sessionName = `local-e2e-${userId}`;

  cy.session(sessionName, () => {
    // Visit the app origin so we are on the correct origin for localStorage.
    cy.visit('/');
    // Write all keys from the browser context (same origin as the app).
    cy.window().then((win) => {
      const ls = win.localStorage;

      // 1. Auth session (supabase-js).
      ls.setItem(sessionKey, JSON.stringify(session));

      // 2. Onboarding — mark complete so the app lands on /dashboard.
      ls.setItem('lumina-onboarded', 'true');
      ls.setItem(
        'lumina-onboarding',
        JSON.stringify({
          screen: 0,
          branch: 'creator',
          org: {
            name: orgName,
            sigle: buildOrgSigle(orgName),
            type: 'Eglise',
            theme: 'orange',
            features: [],
          },
          role,
          completed: true,
        }),
      );

      // 3. Local user + role + config (read by loadInitialData / useCurrentUser).
      ls.setItem(
        'lumina-user',
        JSON.stringify({
          id: userId,
          email: userEmail,
          firstName: 'E2E',
          role,
          org: { id: 'default-org', name: orgName, type: 'Eglise' },
        }),
      );
      ls.setItem('lumina-role', role);
      ls.setItem('lumina-config', JSON.stringify({ churchName: orgName }));
      ls.setItem('lumina-session', userId);
    });
  });
});

Cypress.Commands.add('interceptCloud', function () {
  const SUPABASE =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';

  // Abort every Supabase REST/Auth/Storage call.
  // In Cypress 16 req.abort() was removed — use req.reply({ errorCode }).
  cy.intercept({ url: `${SUPABASE}/**` }, (req: any) => {
    req.reply({
      errorCode: 'ECONNABORTED',
      body: 'offline',
    });
  });
});

Cypress.Commands.add('restoreCloud', function () {
  // Remove all registered routes (Supabase/PowerSync aborts + any UI intercepts).
  (cy as any).unrouteAll();
});

export {};
