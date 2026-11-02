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

/**
 * Persistance inter-spec des credentials du compte d'organisation UNIQUE
 * du run (pattern signupOrgAccount → loginOrgAccount). Voir
 * `cypress/support/orgCreds.ts` pour le design (cache in-mem + config
 * Node comme source de vérité).
 */
import {
  getOrgCreds,
  getOrgCredentials,
  getUnconfiguredOrgCredentials,
  setOrgCreds,
  type OrgCredentials,
} from './orgCreds';

// Retry borné + skip gracieux pour l'auth cloud (GoTrue partagé). La
// politique PURE (classify/backoff/maySkip) vit dans authRetryPolicy.ts
// (testée en vitest) ; cloudRetry.ts ajoute le poller DOM + le skip Mocha.
// Voir l'en-tête de ces modules pour la cause racine mesurée (run
// 41282690879 : 400 Invalid login credentials + 500 transitoires + 422).
import { attemptAuthWithRetry, runWithAuthRetry } from './cloudRetry';

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
      /**
       * Fresh Supabase sign-up via /auth → /dashboard (unique email per
       * call). Use when no pre-existing test account is available.
       */
      freshSignup(overrides?: {
        email?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
      }): Chainable;
      /**
       * Garantit qu'une session Supabase est persistée dans localStorage
       * avant un cy.visit() sur route protégée ; sinon re-route via
       * /splash pour re-hydrater. A appeler après freshSignup si le
       * spec fait des cy.visit() multiples sur des routes protégées.
       */
      ensureAuth(options?: { allowSkip?: boolean }): Chainable;
      /**
       * Parcours l'onboarding COMPLET par l'UI (pas le contournement par
       * localStorage de skipOnboarding()) :
       *   1. /onboarding : 8 écrans de présentation × « Suivant », puis
       *      l'écran de branch → « Je crée mon organisation »
       *   2. /org-setup : nom + type + thème + modules + rôle
       *      → « Créer l'organisation »
       *   3. atterrit sur /dashboard
       *
       * Créer une vraie organisation (lumina-config + onboardingState
       * complets) — nécessaire pour les specs qui testent l'invitation
       * ou les features qui exigent une org créée (RBAC par org).
       *
       * Précondition : cy.freshSignup() déjà appelé (session Supabase).
       */
      runOnboarding(overrides?: {
        orgName?: string;
        orgSigle?: string;
        orgType?: 'Église' | 'École' | 'Entreprise';
        role?: string;
      }): Chainable;
      /**
       * Le flow d'auth DÉTERMINISTE demandé par l'utilisateur :
       *
       *   1. Un seul compte d'organisation est créé au 1er run de la
       *      session via cy.signupOrgAccount() (freshSignup + runOnboarding
       *      complet par l'UI, SANS raccourci localStorage). Ses credentials
       *      sont écrits dans `Cypress.env` (key `orgCreds`) — persistance
       *      inter-spec sur la même machine.
       *   2. Dès le run suivant, cy.loginOrgAccount() loggue directement
       *      avec ces credentials (pas de re-signup) et atterrit sur
       *      /dashboard (l'org existe déjà, onboarding déjà complété).
       *
       * C'est LE pattern à utiliser dans TOUTES les specs cloud : le
       * même compte d'organisation est partagé sur l'ensemble du run,
       * ce qui garantit le déterminisme demandé par l'utilisateur
       * (pas de fresh signup par spec, pas de contournement, un seul
       * org = une seule session de référence pour les tests).
       */
      signupOrgAccount(overrides?: {
        orgName?: string;
        orgType?: 'Église' | 'École' | 'Entreprise';
        role?: string;
        /**
         * Si vrai, un échec INFRA (GoTrue partagé en 429/5xx après le budget
         * de retry) marque la spec PENDING au lieu d'échouer. Un échec
         * d'auth AUTHENTIQUE (mauvais mot de passe, compte inconnu) échoue
         * TOUJOURS — jamais de skip silencieux.
         */
        allowSkip?: boolean;
      }): Chainable<{ email: string; password: string }>;
      loginOrgAccount(options?: { allowSkip?: boolean }): Chainable;
      /**
       * Déclenche l'ONBOARDING COMPLET (le wizard réel, sans raccourci
       * localStorage) pour le compte d'organisation courant — le cas
       * exact demandé par l'utilisateur : user déjà inscrit en base
       * (email/mot de passe existants) mais qui n'a JAMAIS passé le
       * setup d'organisation (pas de lumina-onboarded en localStorage).
       *
       * Entraîné par : sign-out + sign-in dans le navigateur courant.
       * La route guard redirige /splash → /onboarding (needsOnboarding()
       * = true car le flag localStorage est absent pour ce navigateur).
       *
       * Précondition : le compte d'org existe déjà (cy.loginOrgAccount()
       * ou le 1er spec du run). Ne crée PAS de nouveau compte.
       */
      resumeOnboardingForOrgAccount(): Chainable;
      /**
       * Re-affirme la session Supabase du compte org courant AVANT chaque
       * cy.visit() sur une route protégée, dans les specs multi-visit.
       *
       * Contexte (cluster AUTH_SESSION du test-mapper, ~40–45 issues) :
       * le token Supabase est persisté dans localStorage via le key
       * `sb-hhgovvrnalibhgpakswi-auth-token`. Chaque cy.visit() sur une
       * route protégée re-sert la SPA fresh — si le token est expiré,
       * le RouteGuard (App.tsx) rebat sur /auth avant même le premier
       * cy.get(). Sur mobile, le user ne peut pas recharger : le refresh
       * échoue, écran noir.
       *
       * Le pattern « loginOrgAccount + ensureAuth avant CHAQUE cy.visit() »
       * est le correctif déterministe : on ré-hydrate via /splash
       * (public route — Splash.tsx appelle authService.getSession() qui
       * fait le refresh si le refresh_token est encore valide). Si
       * /splash rebatte sur /auth, on échoue ICI avec un message clair
       * plutôt qu'en cascade plus loin.
       *
       * Usage dans les specs multi-visit :
       *   it('…', () => {
       *     cy.loginOrgAccount();
       *     cy.ensureAuth();  // ← avant le 1er cy.visit() protégé
       *     cy.visit('/finance');
       *     cy.ensureAuth();  // ← avant chaque cy.visit() protégé suivant
       *     cy.visit('/balance');
       *   });
       */
      ensureAuth(options?: { allowSkip?: boolean }): Chainable;
      /**
       * Résout l'identifiant de l'organisation ACTIVE du compte d'org
       * courant, sans jamais coder `org-e2e` en dur.
       *
       * Depuis R161 (création self-serve), chaque organisation reçoit un id
       * `org-<uuid>` : `org-e2e` n'existe plus en base, donc un id figé fait
       * échouer toute écriture REST (RLS 42501) et toute assertion
       * d'appartenance. Sources, dans l'ordre : slot `expose('orgActiveId')`
       * (posé par `loginOrgAccount`) → `localStorage['lumina-active-org']`
       * (posé par `auth.ts` à la connexion) → réplique PowerSync.
       */
      orgActiveId(): Chainable<string>;
    }
  }
}

function getExposed(key: string): string {
  return ((Cypress.expose(key) as string) || '').trim();
}

/**
 * Vrai si le compte AUTHENTIFIÉ (JWT dans localStorage) possède DÉJÀ une
 * organisation RÉELLE en base (≠ sentinelles `__no_org__` / `no-org`).
 *
 * Cause racine P0 : rejouer le wizard de création pour un compte qui a déjà
 * une organisation créait une org de PLUS à chaque run. Mesure en base live :
 * `lumina-org-e2e@lumina.dev` était admin de 1493 organisations (1452 ACTIVE),
 * ce qui dépassait la limite PowerSync de 1000 résultats de paramètre
 * (`PSYNC_S2305`) → la synchronisation échouait et aucune donnée ne
 * descendait. On ne rejoue donc le wizard QUE si le compte n'a réellement
 * aucune organisation (self-serve neuf).
 */
function accountHasOrg(win: Window): Cypress.Chainable<{
  hasOrg: boolean;
  orgId: string | null;
  orgName: string | null;
}> {
  let token = '';
  try {
    const key = Object.keys(win.localStorage).find((k) => /-auth-token$/.test(k));
    const parsed = JSON.parse((key && win.localStorage.getItem(key)) || '{}');
    token = parsed?.access_token ?? '';
  } catch {
    /* session illisible — traité comme « pas d'org » (le login échouera avant) */
  }
  if (!token) return cy.wrap({ hasOrg: false, orgId: null, orgName: null });

  const url =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const anon = Cypress.expose('SUPABASE_ANON_KEY') as string;

  const result: {
    hasOrg: boolean;
    orgId: string | null;
    orgName: string | null;
  } = { hasOrg: false, orgId: null, orgName: null };

  return cy
    .request({
      method: 'GET',
      url: `${url}/rest/v1/profiles?select=org_id&limit=1`,
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    })
    .then((res) => {
      const orgId = Array.isArray(res.body) ? (res.body[0]?.org_id ?? null) : null;
      if (!orgId || orgId === '__no_org__' || orgId === 'no-org') return;
      result.hasOrg = true;
      result.orgId = String(orgId);
      return cy
        .request({
          method: 'GET',
          url: `${url}/rest/v1/organizations?select=name&id=eq.${encodeURIComponent(
            orgId,
          )}&limit=1`,
          headers: { apikey: anon, Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        })
        .then((orgRes) => {
          result.orgName = Array.isArray(orgRes.body)
            ? ((orgRes.body[0]?.name as string) ?? null)
            : null;
        });
    })
    .then(() => cy.wrap(result));
}

/**
 * Aligne les flags d'onboarding locaux d'un navigateur VIERGE sur
 * l'organisation EXISTANTE du compte (déjà en base) : aucun wizard, donc
 * AUCUNE nouvelle organisation. C'est le pendant « reuse » du wizard ; il
 * n'écrit que du localStorage dérivé de la vérité serveur.
 */
function completeOnboardingForExistingOrg(
  orgId: string,
  orgName: string,
  role = 'PASTEUR_PRINCIPAL',
): void {
  cy.window().then((win) => {
    try {
      win.localStorage.setItem('lumina-onboarded', 'true');
      win.localStorage.setItem('lumina-role', role);
      win.localStorage.setItem('lumina-active-org', orgId);
      win.localStorage.setItem(
        'lumina-onboarding',
        JSON.stringify({
          screen: -1,
          branch: 'creator',
          role,
          completed: true,
          org: { name: orgName, sigle: '', type: 'Eglise', theme: null, features: [] },
        }),
      );
      let cfg: Record<string, unknown> = {};
      try {
        cfg = JSON.parse(win.localStorage.getItem('lumina-config') || '{}');
      } catch {
        /* config absente */
      }
      win.localStorage.setItem(
        'lumina-config',
        JSON.stringify({ ...cfg, churchName: orgName }),
      );
      let user: Record<string, unknown> = {};
      try {
        user = JSON.parse(win.localStorage.getItem('lumina-user') || '{}');
      } catch {
        /* user absent */
      }
      const org = (user.org as Record<string, unknown>) || {};
      win.localStorage.setItem(
        'lumina-user',
        JSON.stringify({ ...user, org: { ...org, id: orgId, name: orgName } }),
      );
    } catch {
      /* stockage indisponible — non fatal */
    }
  });
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

Cypress.Commands.add('runOnboarding', function (overrides: {
  orgName?: string;
  orgSigle?: string;
  orgType?: 'Église' | 'École' | 'Entreprise';
  role?: string;
} = {}) {
  const orgName = overrides.orgName ?? 'Org E2E ' + Date.now().toString().slice(-6);
  const orgSigle =
    overrides.orgSigle ??
    orgName
      .split(' ')
      .map((w) => (w ? w[0] : ''))
      .join('')
      .toUpperCase()
      .slice(0, 12);
  const orgType = overrides.orgType ?? 'Église';
  // Par défaut on prend le 1er rôle de la template Église (PASTEUR_PRINCIPAL)
  // qui a group/event/transaction/form/invitation:create.
  const role = overrides.role ?? 'PASTEUR_PRINCIPAL';

  // freshSignup a pré-set lumina-onboarded=true + lumina-role=TREASURIER
  // (voir le commentaire dans cy.freshSignup). Le Splash ne redirige
  // donc PAS vers /onboarding. On doit naviguer DIRECTEMENT sur
  // /onboarding (la route est publique pour les users auth).
  cy.visit('/onboarding');
  cy.contains('button', /Suivant|Passer/, { timeout: 30_000 }).should('be.visible');

  // 8 écrans de présentation. Le bouton du bas gauche est :
  //   - écran 0 : « Ignorer » (skip) → avance à l'écran 1
  //   - écrans 1-7 : « Précédent »
  // Le bouton du bas droit est toujours « Suivant » (avance à l'écran
  // suivant, jusqu'à l'écran 8 = branch).
  //
  // Stratégie la plus robuste : 8 × « Suivant » pour arriver à l'écran
  // branch, sans ambiguïté de sélecteur.
  cy.get('button').contains('Suivant', { timeout: 30_000 }).should('exist');
  for (let i = 0; i < 8; i++) {
    cy.get('button').contains('Suivant', { timeout: 15_000 }).click();
  }
  // On est maintenant sur l'écran 8 = branch (pas de « Suivant »).
  cy.contains('button', 'Je crée mon organisation', { timeout: 30_000 })
    .click();
  cy.location('pathname', { timeout: 30_000 }).should('eq', '/org-setup');

  // Org setup : nom + sigle. Les inputs de OrgSetup sont des <input>
  // natifs dans le light DOM — ciblés par leur placeholder (uniques).
  cy.get('input[placeholder="Église MFE-JC Centrale"]', { timeout: 30_000 })
    .clear()
    .type(orgName);
  cy.get('input[placeholder="MFE"]')
    .clear()
    .type(orgSigle);

  // Type : le label affiché (ex. « Église ») est dans le template card,
  // on clique dessus.
  cy.contains('button', orgType, { timeout: 15_000 }).click();

  // Rôle : le label (ex. « Pasteur principal ») est dans la role card.
  const roleLabel: Record<string, string> = {
    PASTEUR_PRINCIPAL: 'Pasteur principal',
    TREASURIER: 'Trésorier',
    COMPTABLE: 'Comptable',
    SECRETAIRE: 'Secrétaire',
    RESPONSABLE_DEPARTEMENT: 'Resp. département',
    DIRECTEUR: 'Directeur',
  };
  const roleText = roleLabel[role] ?? role;
  cy.contains('button', roleText, { timeout: 15_000 }).click();

  // CTA. Le submit fait updateConfig + selectRole (PowerSync) —
  // peut prendre quelques secondes.
  cy.contains('button', "Créer l'organisation", { timeout: 30_000 }).click();

  // Post-condition : on est sur /dashboard et lumina-onboarded est true.
  cy.location('pathname', { timeout: 90_000 }).should('eq', '/dashboard');
  cy.window().then((win) => {
    expect(win.localStorage.getItem('lumina-onboarded'), 'lumina-onboarded').to.eq('true');
    const cfg = JSON.parse(win.localStorage.getItem('lumina-config') || '{}');
    expect(cfg.churchName ?? '', 'churchName in lumina-config').to.eq(orgName);
  });
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

/**
 * Garantit qu'une session Supabase authentifiée est présente dans
 * localStorage (key `sb-hhgovvrnalibhgpakswi-auth-token` — le
 * key est HARCODÉ dans src/pages/AuthPage.tsx et est unique à
 * l'instance Supabase « Lumina »). Le RouteGuard (App.tsx) rebat
 * sur /auth à CHAQUE cy.visit() sur route protégée si ce token
 * n'existe pas ou est expiré.
 *
 * Usage : au début de chaque spec qui fait plusieurs cy.visit()
 * sur des routes protégées, après cy.freshSignup(). Ne crée PAS
 * de nouveau compte — si le token est absent, repasse par
 * /splash pour re-hydrater (authService.getSession() →
 * /auth/v1/token si le cookie http-only persiste), sinon c'est
 * vraiment perdue et le spec doit re-sign.
 */
Cypress.Commands.add('ensureAuth', function (options?: {
  allowSkip?: boolean;
}) {
  // Cypress 16 active `testIsolation` par défaut : `localStorage` (donc le
  // token Supabase, qui vit UNIQUEMENT en localStorage — supabase-js ne
  // pose pas de cookie http-only) est EFFACÉ avant chaque `it()`. L'ancienne
  // implémentation se contentait de re-router via /splash en supposant un
  // cookie persistant : il n'existe pas, donc à partir du 2e `it()` d'un
  // spec la session était perdue et le RouteGuard rebattait sur /auth
  // (`h1.text-2xl` d'AuthPage) — d'où des échecs en cascade non
  // déterministes.
  //
  // `cy.session()` est le mécanisme canonique : il met en cache
  // cookies + localStorage après le setup et les RESTAURE avant chaque
  // test, et rejoue le setup si le cache est invalide. Le setup est
  // `loginOrgAccount()` (login UI réel, idempotent). Résultat : chaque
  // `it()` repart authentifié, indépendamment de l'ordre d'exécution.
  //
  // `allowSkip` est transmis tel quel : si le GoTrue partagé est en panne
  // après le budget de retry, la spec est marquée PENDING (pending) —
  // vérifié : le skip fonctionne depuis un setup `cy.session()`.
  cy.session('lumina-org-account', () => {
    cy.loginOrgAccount({ allowSkip: options?.allowSkip });
  });
});

/**
 * Résout l'id de l'organisation ACTIVE du compte d'org courant.
 *
 * `org-e2e` est un id FIGÉ qui n'existe plus depuis R161 (création
 * self-serve : chaque organisation reçoit `org-<uuid>`). L'utiliser
 * provoquait des échecs cloud réels (RLS 42501, FK 23503, listes vides)
 * sur TOUS les specs cloud. Ce helper résout la valeur réelle, dans
 * l'ordre : slot `expose('orgActiveId')` (posé par `loginOrgAccount`),
 * `localStorage['lumina-active-org']`, puis la réplique PowerSync
 * (`organizations` non-`__no_org__`). Échoue clairement si introuvable
 * plutôt que de retomber silencieusement sur un id périmé.
 */
Cypress.Commands.add('orgActiveId', function (): Cypress.Chainable<string> {
  const exposed = (Cypress.expose('orgActiveId') as string) || '';
  if (exposed && exposed !== 'org-e2e') {
    return cy.wrap(exposed) as unknown as Cypress.Chainable<string>;
  }
  return cy.window({ timeout: 30_000 }).then(async (win: any) => {
    // `auth.ts` pose `lumina-user.org.id` (source de vérité du contexte
    // applicatif) puis `lumina-active-org` : les deux sont fiables.
    try {
      const u = JSON.parse(win.localStorage?.getItem('lumina-user') ?? 'null');
      const fromUser = u?.org?.id ? String(u.org.id) : '';
      if (fromUser && fromUser !== 'org-e2e') return fromUser;
    } catch {
      /* lumina-user absent/malformé — on tente les autres sources */
    }
    const fromLs = win.localStorage?.getItem('lumina-active-org') || '';
    if (fromLs && fromLs !== 'org-e2e') return fromLs;
    try {
      const rows =
        (await win.__psDb?.getAll(
          `SELECT id FROM organizations
             WHERE id NOT IN ('__no_org__', 'no-org', 'org-1')
             ORDER BY created_at DESC LIMIT 1`,
        )) ?? [];
      const id = rows[0]?.id ? String(rows[0].id) : '';
      if (id) return id;
    } catch {
      /* réplique indisponible — on échoue plus bas avec un message clair */
    }
    throw new Error(
      "orgActiveId: aucune organisation active résolue (expose/localStorage/réplique). " +
        "Vérifier que loginOrgAccount() a bien tourné et que le compte a une org.",
    );
  }) as unknown as Cypress.Chainable<string>;
});

/**
 * Signs up a brand-new Supabase user via the /auth UI, completes
 * onboarding, and lands on /dashboard. The email is unique per call
 * so re-runs never collide with real data. This is the inverse of
 * `prepareSession` (which logs in an existing account).
 *
 * Use this when the spec needs a session but no pre-existing account
 * is guaranteed to exist (or the password is unknown).
 */
Cypress.Commands.add('freshSignup', function (overrides?: {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}): Cypress.Chainable {
  const email =
    overrides?.email ?? `e2e.${Date.now()}.${Math.floor(Math.random() * 10000)}@lumina.dev`;
  const password = overrides?.password ?? `E2e-${Math.random().toString(36).slice(2, 10)}!a`;
  const firstName = overrides?.firstName ?? 'E2e';
  const lastName = overrides?.lastName ?? 'Test';

  cy.clearLocalStorage();
  cy.visit('/auth');
  // Laisser la page d'auth s'hydrater complètement : le blocage
  // « Continuer avec Google » + form email/password n'est utilisable
  // qu'après l'init supabase. Sans ce stabilisateur, le click « Pas
  // encore de compte » peut atterrir sur le form login vide.
  cy.contains('button', 'Pas encore de compte', { timeout: 30_000 }).should('be.visible');

  // Pré-set des flags onboarding AVANT le submit (même pattern que
  // auth-real.cy.ts) : sans ça, le nouveau compte atterrit sur
  // /onboarding et cy.skipOnboarding() (qui attend /dashboard) échoue.
  //
  // Rôle TREASURIER : les spécimens créent des groupes, événements,
  // transactions et formulaires — toutes ces actions exigent les
  // permissions du rôle TREASURIER (group:create, event:create, etc.).
  // Un rôle MEMBRE n'y a pas accès et les boutons « Créer » ne s'afficheraient pas.
  //
  // NOTE : ces flags ne PASSENT pas la route guard (RouteGuard dans
  // App.tsx check le token Supabase via authService.getSession(), PAS
  // localStorage). Ils servent à splash → /dashboard post-login.
  cy.window().then((win) => {
    win.localStorage.setItem('lumina-onboarded', 'true');
    win.localStorage.setItem('lumina-role', 'TREASURIER');
  });

  cy.contains('button', 'Pas encore de compte').click();
  cy.get('input[aria-label="Prénom"]').type(firstName);
  cy.get('input[aria-label="Nom"]').type(lastName);
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.contains('button[type="submit"]', 'Créer mon compte').click();

  // Le sign-up + RLS trigger + upsert_profile peuvent prendre quelques
  // secondes ; Splash redirige vers /dashboard (ou /onboarding si le
  // flag n'a pas été lu à temps — on le gère via skipOnboarding).
  cy.location('pathname', { timeout: 120_000 }).should((path: string) => {
    expect(path, `unexpected path after signup: ${path}`).not.to.include('auth');
  });
  cy.skipOnboarding();
  cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
    expect(['/dashboard', '/splash']).to.include(path);
  });

  // POST-CONDITION de freshSignup : le session Supabase est PERSISTÉ
  // dans localStorage (key sb-<projectId>-auth-token) par supabase-js
  // lors du submit du form sign-up. On le vérifie ici pour s'assurer
  // que le spec qui suit ne sera PAS rebatté sur /auth par le
  // RouteGuard à son cy.visit(...).
  cy.window().then((win) => {
    const sbKey = Object.keys(win.localStorage).find((k) => /-auth-token$/.test(k));
    if (!sbKey) {
      throw new Error(
        'freshSignup: supabase session token absent de localStorage — ' +
          'le sign-up UI a échoué silencieusement (rate-limit, email ' +
          'doublon, ou page non-hydratée au submit).',
      );
    }
    try {
      const parsed = JSON.parse(win.localStorage.getItem(sbKey) || 'null');
      if (!parsed?.access_token) {
        throw new Error(
          'freshSignup: session token présente mais access_token manquant — ' +
            'le form sign-up a retourné une réponse non conforme.',
        );
      }
    } catch (e) {
      // JSON invalide = session non écrite → même diagnostic.
      throw new Error(
        'freshSignup: localStorage sb-*-auth-token malformé: ' +
          (e instanceof Error ? e.message : String(e)),
      );
    }
  });

  return cy.wrap({ email, password });
});

/**
 * Provisionne (ou ré-authentifie) le compte d'organisation FIXE via le
 * parcours UI COMPLET : signup `/auth` → wizard d'onboarding →
 * `/org-setup` → `/dashboard`, SANS raccourci localStorage. Extrait de
 * `signupOrgAccount` pour être réutilisé par le fallback de provisioning
 * (compte absent de la base partagée).
 *
 * Le chemin « compte déjà inscrit » est géré : l'app bascule
 * automatiquement en mode login (voir handleSignup d'AuthPage) ; on
 * resoumet alors en login avec les mêmes identifiants.
 */
function provisionOrgAccount(
  fixed: OrgCredentials,
  overrides?: {
    orgName?: string;
    orgType?: 'Église' | 'École' | 'Entreprise';
    role?: string;
  },
): Cypress.Chainable {
  cy.visit('/auth');
  cy.contains('button', 'Pas encore de compte', { timeout: 30_000 }).should(
    'be.visible',
  );
  cy.contains('button', 'Pas encore de compte').click();
  cy.get('input[aria-label="Prénom"]').type(fixed.email.split('@')[0].slice(0, 10));
  cy.get('input[aria-label="Nom"]').type('E2E');
  cy.get('input[type="email"]').type(fixed.email);
  cy.get('input[type="password"]').type(fixed.password);
  cy.contains('button[type="submit"]', 'Créer mon compte').click();

  // Compte déjà inscrit → l'app bascule en mode login : on resoumet.
  cy.get('button[type="submit"]').then(($btns) => {
    const texts = $btns.map((_, el) => el.textContent).get();
    const signupStillThere = texts.some((t) =>
      t?.includes('Créer mon compte'),
    );
    if (!signupStillThere) {
      cy.get('input[type="email"]').clear().type(fixed.email);
      cy.get('input[type="password"]').clear().type(fixed.password);
      cy.contains('button[type="submit"]', 'Se connecter').click();
    }
  });

  cy.location('pathname', { timeout: 120_000 }).then((path: string) => {
    if (path === '/onboarding') return;
    if (path === '/dashboard') return;
    throw new Error(
      `provisionOrgAccount: après signup/login, path inattendu ${path} (attendu /onboarding ou /dashboard)`,
    );
  });

  // Wizard COMPLET si le navigateur est vierge (l'exigence stricte).
  cy.window().then((win) => {
    const onboarded = win.localStorage.getItem('lumina-onboarded');
    if (onboarded === 'true') return;
    cy.location('pathname').then((p: string) => {
      if (p === '/onboarding') {
        cy.runOnboarding({
          orgName: overrides?.orgName ?? fixed.orgName,
          orgType: (overrides?.orgType ?? fixed.orgType) as
            | 'Église'
            | 'École'
            | 'Entreprise',
          role: overrides?.role ?? fixed.role,
        });
      }
    });
  });
  cy.location('pathname', { timeout: 90_000 }).should('eq', '/dashboard');

  cy.window().then((win) => {
    const sbKey = Object.keys(win.localStorage).find(
      (k) => /-auth-token$/.test(k),
    );
    if (!sbKey || !win.localStorage.getItem(sbKey)) {
      throw new Error(
        'provisionOrgAccount: token Supabase absent — le wizard a atterri ' +
          'sur /dashboard mais la session n\'est pas persistée.',
      );
    }
  });
  return cy.wrap(null);
}

/**
 * Sign-up du compte d'organisation UNIQUE du run, avec parcours
 * COMPLET par l'UI (pas de raccourci localStorage) :
 *
 *   1. cy.freshSignup() — crée le compte Supabase via le formulaire
 *      /auth (email unique par run, persisté dans Cypress.env.orgCreds
 *      pour les specs suivantes).
 *   2. cy.runOnboarding() — le wizard UI : 8 écrans de présentation,
 *      branch « Je crée mon organisation », /org-setup (nom + type +
 *      thème + modules + rôle) → « Créer l'organisation » → /dashboard.
 *
 * Post-condition : un compte d'organisation existe (Supabase + org
 * créée via le wizard), le token est dans localStorage, les flags
 * onboarding sont complets. Cypress.env.orgCreds est posé pour que
 * les specs suivantes fassent cy.loginOrgAccount() au lieu de
 * recréer un compte.
 *
 * À n'appeler QUE dans le 1er spec du run (ex. auth-real.cy.ts ou
 * un dedicated org-setup spec). Tous les autres specs utilisent
 * cy.loginOrgAccount() qui LOGGIN (pas re-signup) et atterrit
 * directement sur /dashboard (needsOnboarding() = false, l'org
 * existe déjà).
 */
Cypress.Commands.add('signupOrgAccount', function (
    overrides?: {
      orgName?: string;
      orgType?: 'Église' | 'École' | 'Entreprise';
      role?: string;
      allowSkip?: boolean;
    },
  ): Cypress.Chainable<{ email: string; password: string }> {
    // IDENTIFIANT UNIQUE (source de vérité) : le compte est FIXE
    // (getOrgCredentials — CYPRESS_ORG_EMAIL / CYPRESS_ORG_PASSWORD,
    // valeur par défaut lumina-org-e2e@lumina.dev), réutilisé à chaque
    // run. Jamais d'email éphémère.
    const fixed = getOrgCredentials();

    // Run précédent : le compte a déjà son onboarding complété (flag
    // exposé par le 1er spec du run). On n'essaie PAS de re-signup :
    // login direct, l'org existe déjà en base → /dashboard.
    //
    // NB (cause racine CI 41282690879) : `getOrgCreds()` retombe TOUJOURS
    // sur l'identifiant fixe (voir orgCreds.ts), donc cette branche est en
    // pratique la SEULE prise — l'ancien login « manuel » à 120 s était la
    // source des échecs de ce spec. On délègue désormais à
    // `loginOrgAccount({ allowSkip })` : retry borné + backoff sur les
    // erreurs infra (429/5xx), échec explicite sur les erreurs d'auth
    // authentiques, skip gracieux (pending) si autorisé.
    //
    // MAIS (vraie cause racine) : sur le projet PARTAGÉ, le compte de test
    // peut être ABSENT (base purgée). `getOrgCreds()` retombant sur
    // l'identifiant fixe, l'ancien code ne re-signupait JAMAIS → 400
    // « Invalid login credentials » en boucle. On retente donc d'abord le
    // login (rapide, borné, non-échouant) ; s'il échoue sur des
    // identifiants refusés ET que `allowSkip` autorise le provisionnement,
    // on PROVISIONNE le compte (signup UI complet + wizard) — l'exigence
    // « signup → onboarding → setup org → dashboard » est respectée à la
    // lettre. L'échec d'auth authentique reste visible si `allowSkip` est
    // faux (jamais de provisioning silencieux).
    const existing = getOrgCreds();
    if (existing?.email && existing?.password) {
      cy.log(
        `signupOrgAccount: compte ${existing.email} déjà positionné pour ce run — login direct (retry borné + skip gracieux)`,
      );

      const statusRef = { status: 0 };
      cy.intercept('POST', '**/auth/v1/token**', (req) => {
        req.continue((res) => {
          statusRef.status = res.statusCode;
        });
      });
      cy.clearLocalStorage();
      const ctx = this as unknown as Mocha.Context;

      return attemptAuthWithRetry({
        label: 'signupOrgAccount(login préexistant)',
        ctx,
        statusRef,
        attempt: () => {
          cy.visit('/auth');
          cy.get('input[type="email"]').first().type(existing.email);
          cy.get('input[type="password"]').first().type(existing.password);
          cy.contains('button[type="submit"]', 'Se connecter').click();
        },
      }).then((result) => {
        if (result.navigated) {
          // Le login a abouti. P0 — on ne rejoue le wizard QUE si le compte
          // n'a RÉELLEMENT aucune organisation (self-serve neuf). Un compte qui
          // possède déjà une org réutilise la sienne : rejouer le wizard créait
          // une org de PLUS à chaque run (1452 ACTIVE mesurées → PSYNC_S2305).
          cy.location('pathname').then((path: string) => {
            if (path !== '/onboarding') return;
            cy.window().then((win) => {
              accountHasOrg(win).then(({ hasOrg, orgId, orgName }) => {
                if (hasOrg && orgId) {
                  cy.log(
                    `signupOrgAccount: compte ${existing.email} a déjà l'org ${orgId} — réutilisation (aucune création)`,
                  );
                  completeOnboardingForExistingOrg(
                    orgId,
                    orgName ?? '',
                    overrides?.role ?? 'PASTEUR_PRINCIPAL',
                  );
                  cy.visit('/splash');
                } else {
                  cy.runOnboarding();
                }
              });
            });
          });
          cy.location('pathname', { timeout: 90_000 }).should(
            'eq',
            '/dashboard',
          );
          return cy.wrap(existing);
        }

        // Login refusé. Provisionner le compte SEULEMENT si autorisé.
        const canProvision =
          overrides?.allowSkip === true &&
          result.kind === 'invalid-credentials';
        if (!canProvision) {
          // Comportement inchangé par défaut : on délègue au retry
          // échouant/skippant (message explicite, jamais de skip silencieux).
          return cy
            .loginOrgAccount({ allowSkip: overrides?.allowSkip })
            .then(() => cy.wrap(existing));
        }

        cy.log(
          `signupOrgAccount: login refusé (${result.kind}, HTTP ${result.status}) — provisioning du compte ${existing.email} (signup UI complet + wizard)`,
        );
        return provisionOrgAccount(fixed, overrides).then(() => {
          setOrgCreds({ email: fixed.email, password: fixed.password });
          return cy.wrap({ email: fixed.email, password: fixed.password });
        });
      });
    }

    return provisionOrgAccount(fixed, overrides).then(() => {
      setOrgCreds({ email: fixed.email, password: fixed.password });
      return cy.wrap({ email: fixed.email, password: fixed.password });
    });
  });

/**
 * Log-in du compte d'organisation UNIQUE du run (le même que
 * cy.signupOrgAccount() a créé au 1er spec).
 *
 *   1. Lit les credentials via le module de persistance inter-spec
 *      (`getOrgCreds()` — cache in-mem + config Node, voir
 *      cypress/support/orgCreds.ts).
 *   2. cy.visit('/auth') + submit du form login → /dashboard.
 *   3. Post-condition : /onboarding ou /dashboard (pas /auth).
 *
 * ## Résilience (cause racine mesurée, run CI 41282690879)
 *
 * Le projet Supabase est PARTAGÉ et, pendant le run, GoTrue a renvoyé des
 * centaines de `400 Invalid login credentials` (compte non provisionné /
 * mot de passe divergent), des `500` transitoires (« context canceled »,
 * « unexpected EOF ») et deux `422 User already registered` (course entre
 * les 2 conteneurs CI). Le POST login ne « complete » donc jamais et
 * l'assertion de nav time out à 90 s → échec d'INFRA, pas de produit.
 *
 * On distingue désormais :
 *   - TRANSITOIRE (429/5xx/POST en vol) → retry borné + backoff exponentiel
 *     (voir cloudRetry.ts / authRetryPolicy.ts). Budget épuisé + `allowSkip`
 *     ⇒ spec PENDING (pending), jamais un échec rouge.
 *   - AUTHENTIQUE (identifiants invalides / compte inconnu) → échec EXPLICITE
 *     immédiat, jamais retenté, jamais skippé : c'est un vrai défaut.
 */
Cypress.Commands.add('loginOrgAccount', function (options?: {
  allowSkip?: boolean;
}): Cypress.Chainable {
  const creds = getOrgCreds();
  if (!creds?.email || !creds?.password) {
    throw new Error(
      'loginOrgAccount: credentials du compte d\'organisation absents — ' +
        'le 1er spec (cy.signupOrgAccount()) n\'a pas tourné ou le run ' +
        'a été nettoyé. Toujours lancer le spec d\'auth d\'abord dans ' +
        'le run (il pose le compte partagé pour la suite).',
    );
  }

  // Statut HTTP du POST `grant_type=password` — capturé par l'intercept
  // ci-dessous, lu par le poller pour distinguer 429/5xx (transitoire) de
  // 400 (identifiants refusés).
  const statusRef = { status: 0 };
  cy.intercept('POST', '**/auth/v1/token**', (req) => {
    req.continue((res) => {
      statusRef.status = res.statusCode;
    });
  });

  cy.clearLocalStorage();

  // `this` = contexte Mocha de la commande (vérifié : `this.skip()` marche
  // depuis un hook, un spec, une commande custom et un setup `cy.session`).
  const ctx = this as unknown as Mocha.Context;

  return runWithAuthRetry({
    label: 'loginOrgAccount',
    allowSkip: options?.allowSkip,
    ctx,
    statusRef,
    attempt: () => {
      cy.visit('/auth');
      cy.get('input[type="email"]').first().type(creds.email);
      cy.get('input[type="password"]').first().type(creds.password);
      cy.contains('button[type="submit"]', 'Se connecter').click();
    },
  }).then((result) => {
    // `result.navigated` est garanti vrai ici (sinon le retry a levé ou
    // skippé). Trace légère conservée pour le diagnostic CI.
    cy.location('pathname').then((path: string) => {
      console.info(
        `[loginOrgAccount] login accepté — path=${path}` +
          (result.status ? ` (HTTP ${result.status})` : ''),
      );
      if (path === '/onboarding') {
        // Navigateur vierge (clearLocalStorage ci-dessus) : needsOnboarding()
        // = true. P0 — on ne rejoue le wizard QUE si le compte n'a RÉELLEMENT
        // aucune organisation. Un compte qui en possède déjà une la RÉUTILISE
        // (aucune création) : c'est ici que se produisait la prolifération,
        // chaque spec rejouant le wizard → une org de plus par run.
        cy.window().then((win) => {
          accountHasOrg(win).then(({ hasOrg, orgId, orgName }) => {
            if (hasOrg && orgId) {
              console.info(
                `[loginOrgAccount] org existante ${orgId} — réutilisation (aucune création)`,
              );
              completeOnboardingForExistingOrg(
                orgId,
                orgName ?? '',
                getOrgCredentials().role,
              );
              cy.visit('/splash');
            } else {
              cy.runOnboarding();
            }
          });
        });
        cy.location('pathname', { timeout: 90_000 }).should('eq', '/dashboard');
      }
    });

    // Seed de la réplique locale avant de rendre la main : le service
    // PowerSync Cloud rejette l'audience JWT (`PSYNC_S2105`), donc la
    // réplique ne descend jamais et TOUTES les pages gardées par
    // `isPowerSyncReadyNow()` restent en squelette (sessions, events,
    // groups, members, finance, reports…). `seedOrgReplica()` écrit l'org
    // E2E dans la réplique locale + marque la réplique prête → les pages
    // rendent hors-ligne ; `hydrateOrgReplica()` y copie ensuite les données
    // réelles de l'org (REST → réplique), y compris le profil complet.
    cy.seedOrgReplica();
    cy.hydrateOrgReplica();
    // Pose le slot `orgActiveId` (survit au reste du run) : les specs cloud
    // lisent l'org active sans recalculer la résolution à chaque appel.
    cy.orgActiveId().then((id) => {
      try {
        Cypress.expose('orgActiveId', id);
      } catch {
        /* contexte navigateur : le slot reste résolu à la demande */
      }
    });
    return cy.wrap(null);
  });
});

/**
 * Resume l'ONBOARDING COMPLET pour le compte d'organisation courant,
 * dans le scénario réel demandé : l'user est déjà enregistré en base
 * (email/mot de passe existants) mais n'a JAMAIS passé le setup
 * d'organisation pour ce navigateur.
 *
 * 1. Sign-out complet + nettoyage localStorage (état "nouveau
 *    navigateur" — le compte existe en base, pas ici).
 * 2. Re-signin avec le même compte : la route guard redirige
 *    /splash → /onboarding (needsOnboarding() = true).
 * 3. Le wizard COMPLET (runOnboarding, sans raccourci localStorage)
 *    est rejoué jusqu'à /dashboard.
 *
 * Post-condition : /dashboard + lumina-onboarded=true pour le compte.
 * Ce n'est PAS une re-création du compte — c'est le re-parcours du
 * setup pour un utilisateur existant.
 */
Cypress.Commands.add('resumeOnboardingForOrgAccount', function (): Cypress.Chainable {
    // Option A : le scénario "registered but unconfigured" est joué sur un
    // compte ISOLÉ (getUnconfiguredOrgCredentials — lumina-org-unconfigured
    // par défaut), jamais sur le compte principal des specs 2/4. Cela
    // permet de répéter le setup sans corrompre le login → dashboard du
    // compte org principal. Option B : le re-parcours est FORCÉ par
    // resetOnboardingState() (supprime lumina-onboarding/-onboarded/-role)
    // plutôt que par cy.clearLocalStorage() qui détruirait aussi le token
    // Supabase et obligerait à rejouer un login complet.
    const creds = getUnconfiguredOrgCredentials();

    // 0. PROVISIONNEMENT du compte isolé (gap d'infra trouvé QA Run A,
    //    2026-10-06) : si le compte unconfigured n'existe pas encore en
    //    base Supabase (1er run absolu), le login ci-dessous échouerait
    //    "Invalid email or password" et le spec retomberait sur /auth.
    //    On le signe up via l'UI (comme signupOrgAccount le fait pour
    //    le compte principal) ; sur les runs suivants l'app bascule
    //    automatiquement en mode login (déjà existant) et le bloc
    //    ci-dessous devient un no-op. Le wizard runOnboarding est
    //    rejoué au point 4 car l'option B force le re-parcours via
    //    resetOnboardingState() — l'org du compte unconfigured n'est
    //    PAS un prérequis du scénario.
    cy.clearLocalStorage();
    cy.visit('/auth');
    cy.contains('button', 'Pas encore de compte', { timeout: 30_000 })
      .should('be.visible')
      .click();
    cy.get('input[aria-label="Prénom"]').type('E2e');
    cy.get('input[aria-label="Nom"]').type('Unconfig');
    cy.get('input[type="email"]').type(creds.email);
    cy.get('input[type="password"]').type(creds.password);
    cy.contains('button[type="submit"]', 'Créer mon compte').click();

    // Le sign-up est ASYNCHRONE : pendant la requête, le bouton affiche un
    // SPINNER (aucun texte). L'ancien code lisait son texte IMMÉDIATEMENT et
    // concluait à tort au succès dès que le spinner remplaçait « Créer mon
    // compte », puis cherchait « Se connecter » — inexistant si le compte est
    // NEUF (l'app part sur /onboarding), d'où un timeout de 300 s (échec
    // mesuré en CI, run après run). On attend ici un signal ROBUSTE,
    // NON-ÉCHOUANT et borné : l'app a quitté /auth (compte neuf → onboarding)
    // OU le formulaire est repassé en mode LOGIN (« Se connecter » visible —
    // compte déjà existant, bannière « already exists »).
    //
    // Le point 1 ci-dessous rejoue de toute façon un login complet : ce bloc
    // ne sert qu'à PROVISIONNER le compte (le créer s'il est absent) et à
    // garantir la session quand le mode login est atteint.
    const signupStart = Date.now();
    const waitForSignupOutcome = (): Cypress.Chainable => {
      return cy.window({ log: false }).then((win) => {
        if (win.location.pathname !== '/auth') return;
        const loginBtn = Array.from(
          win.document.querySelectorAll('button[type="submit"]'),
        ).some((b) => (b.textContent || '').includes('Se connecter'));
        if (loginBtn) {
          cy.get('input[type="email"]').clear().type(creds.email);
          cy.get('input[type="password"]').clear().type(creds.password);
          cy.contains('button[type="submit"]', 'Se connecter').click();
          return;
        }
        if (Date.now() - signupStart >= 60_000) return;
        return cy.wait(200, { log: false }).then(waitForSignupOutcome);
      });
    };
    waitForSignupOutcome();

    // 1. Signin stabilisé du compte unconfigured (déjà en base depuis le
    //    1er run ou créé au point 0 ci-dessus). La session Supabase est
    //    conservée pour le re-parcours forcé des points 2-3.
    cy.visit('/auth');
    cy.get('input[type="email"]').first().type(creds.email);
    cy.get('input[type="password"]').first().type(creds.password);
    cy.contains('button[type="submit"]', 'Se connecter').click();
    cy.location('pathname', { timeout: 90_000 }).should((path: string) => {
      // Le signup fresh atterrit sur /onboarding (wizard non joué) ou
      // sur /splash puis /dashboard ; le compte préexistant fait de
      // même. /auth = login refusé (password diverge — override
      // CYPRESS_ORG_UNCONFIGURED_PASSWORD non aligné avec la base).
      expect(
        path,
        `login compte unconfigured: ${path} (attendu /onboarding, /dashboard ou /splash — /auth = compte inconnu ou password erroné)`,
      ).to.not.eq('/auth');
      return true;
    });

    // 2. FORCER le re-parcours : effacer les flags d'onboarding du
    //    navigateur courant (lumina-onboarding / -onboarded / -role)
    //    pour que needsOnboarding() revienne à true → /onboarding.
    //    (Option B — sans toucher au token Supabase ni à l'état PowerSync.)
    cy.window().then((win) => {
      win.localStorage.removeItem('lumina-onboarding');
      win.localStorage.removeItem('lumina-onboarded');
      win.localStorage.removeItem('lumina-role');
    });

    // 3. Splash redirige /splash → /onboarding (needsOnboarding() = true,
    //    voir src/pages/Splash.tsx:40 et src/lib/onboardingState.ts:140).
    cy.visit('/splash');
    cy.location('pathname', { timeout: 90_000 }).should('eq', '/onboarding');

    // 4. Reprise de l'onboarding. P0 — si le compte possède DÉJÀ une
    //    organisation en base, on la RÉUTILISE : le wizard n'est PAS rejoué,
    //    donc AUCUNE organisation supplémentaire n'est créée (c'était la cause
    //    de la prolifération : 1452 orgs ACTIVE pour ce seul compte → PSYNC_S2305).
    //    Le scénario « reprendre l'onboarding » est prouvé par les points 2-3
    //    (retour à /onboarding) ; la réutilisation le ramène au dashboard.
    //    Le wizard COMPLET n'est joué QUE pour un compte réellement sans org.
    cy.window().then((win) => {
      accountHasOrg(win).then(({ hasOrg, orgId, orgName }) => {
        if (hasOrg && orgId) {
          cy.log(
            `resumeOnboardingForOrgAccount: org ${orgId} déjà possédée — réutilisation (aucune création)`,
          );
          completeOnboardingForExistingOrg(orgId, orgName ?? '');
          cy.visit('/splash');
        } else {
          cy.runOnboarding({
            orgName: 'Lumina E2E Unconfigured',
            orgType: 'Église',
            role: 'PASTEUR_PRINCIPAL',
          });
        }
      });
    });

    // Post-condition.
    cy.location('pathname', { timeout: 90_000 }).should('eq', '/dashboard');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('lumina-onboarded')).to.eq('true');
    });
    return cy.wrap(null);
  });

// Register the offline/local helpers (seedLocalSession, interceptCloud,
// restoreCloud) so they are available to every spec.
import './local';

// Register the offline organization-replica seeder (seedOrgReplica) — works
// around the PowerSync Cloud JWT-audience rejection (PSYNC_S2105) so the
// org-data specs can run offline. See cypress/support/orgReplica.ts.
import './orgReplica';

// Register the RICH demo-organization seeder (seedDemoOrg) used by the
// screenshot/visual-docs spec (cypress/e2e/screenshots.cy.ts) so every screen
// renders with realistic data. See cypress/support/visualSeed.ts.
import './visualSeed';

// Register the Ionic UI helpers (clickButton, typeIonicInput,
// expectNoBlankScreen) — see cypress/support/ionic.ts for why they exist.
import './ionic';

// Register the E2E auto-cleanup command (cleanupTestArtifacts,
// trackTestArtifact) — see cypress/support/e2eCleanup.ts for the design
// (archive-only, run-scoped, non-fatal).
import './e2eCleanup';

// Neutralise la remontée d'erreurs vers le dépôt public (défense en
// profondeur — aucun test ne doit créer de vraie Issue GitHub).
import './noErrorReporting';

export {};
