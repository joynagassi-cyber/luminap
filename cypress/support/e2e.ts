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
  setOrgCreds,
} from './orgCreds';

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
      ensureAuth(): Chainable;
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
      }): Chainable<{ email: string; password: string }>;
      loginOrgAccount(): Chainable;
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
      ensureAuth(): Chainable;
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
Cypress.Commands.add('ensureAuth', function () {
  cy.window().then((win) => {
    // Le key est `sb-<projectId>-auth-token` — `hhgovvrnalibhgpakswi`
    // est le projectRef de l'instance Supabase Lumina (voir
    // cypress.config.ts SUPABASE_URL et src/pages/AuthPage.tsx:65).
    const SB_TOKEN_KEY = 'sb-hhgovvrnalibhgpakswi-auth-token';
    const raw = win.localStorage.getItem(SB_TOKEN_KEY);
    let tokenValid = false;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const exp = parsed?.expires_at; // epoch seconds
        tokenValid = !!parsed?.access_token && (!exp || exp * 1000 > Date.now());
      } catch {
        tokenValid = false;
      }
    }
    if (tokenValid) return;
    // Token absent/expiré → re-route via /splash. La page public
    // /splash permet à Splash.tsx de re-appeler
    // authService.getSession() (qui lit le token + s'il est
    // expiré, refreshSession via le refresh_token).
    cy.visit('/splash');
    cy.location('pathname', { timeout: 60_000 }).should((path: string) => {
      // Re-route vers /onboarding si le token a perdu le flag
      // lumina-onboarded ; sinon /dashboard. Si on rebata sur
      // /auth, le token est Perte et le spec va échouer (on
      // préfère échouer ici que plus tard en cascade).
      expect(path, `ensureAuth: /splash a rebattu sur ${path} — le token Supabase a expiré et le refresh a échoué`).to.not.include('/auth');
      return true;
    });
  });
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
    const existing = getOrgCreds();
    if (existing?.email && existing?.password) {
      cy.log(
        `signupOrgAccount: compte ${existing.email} déjà positionné pour ce run — login direct`,
      );
      cy.clearLocalStorage();
      cy.visit('/auth');
      cy.get('input[type="email"]').first().type(existing.email);
      cy.get('input[type="password"]').first().type(existing.password);
      cy.contains('button[type="submit"]', 'Se connecter').click();
      // Deux issues possibles selon l'état du navigateur (clearLocal-
      // Storage() ci-dessus) : /dashboard si le wizard a déjà été
      // complété pour ce navigateur dans ce run (case a — spec 1 du
      // run relancé sans nettoyage), /onboarding si c'est un
      // navigateur vierge mais le compte préexiste en base (case b —
      // le cas EXACT demandé : user enregistré mais non configuré
      // pour ce navigateur → re-parcours du setup). Les deux sont
      // des post-conditions valides pour ce command : on laisse le
      // should() final (sous la branche du cas a) stabiliser.
      cy.location('pathname', { timeout: 120_000 }).should((path: string) => {
        expect(path, `après login compte préexistant: ${path}`).to.be.oneOf([
          '/onboarding',
          '/dashboard',
        ]);
      });
      // Si on est sur /onboarding (case b), on joue le wizard COMPLET
      // jusqu'à /dashboard (post-condition du command, pas un
      // raccourci localStorage).
      cy.location('pathname').then((path: string) => {
        if (path === '/onboarding') {
          cy.runOnboarding();
          cy.location('pathname', { timeout: 90_000 }).should('eq', '/dashboard');
        }
      });
      return cy.wrap(existing);
    }

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

    // Deux issues possibles :
    //  a. 1er run absolu : le compte n'existait pas en base → sign-up
    //     propre → /onboarding (wizard COMPLET, l'exigence stricte de
    //     l'utilisateur — pas de raccourci localStorage).
    //  b. Run suivant : le compte EXISTAIT déjà (identifiant unique) →
    //     l'app détecte "already exists", bascule AUTOMATIQUEMENT en
    //     mode login (voir handleSignup de AuthPage.tsx) et reste sur
    //     /auth avec la bannière d'erreur. On capte ce cas, on
    //     resubmit via login (même email/mot de passe) → /onboarding
    //     (le compte est enregistré mais non configuré pour ce
    //     navigateur — le cas EXACT demandé par l'utilisateur).
    cy.get('button[type="submit"]').then(($btns) => {
      const texts = $btns.map((_, el) => el.textContent).get();
      const signupStillThere = texts.some((t) =>
        t?.includes('Créer mon compte'),
      );
      if (!signupStillThere) {
        // L'app a basculé en mode login (compte préexistant) : on
        // resubmit avec le même email/mot de passe → /onboarding.
        cy.get('input[type="email"]').clear().type(fixed.email);
        cy.get('input[type="password"]').clear().type(fixed.password);
        cy.contains('button[type="submit"]', 'Se connecter').click();
      }
      // Sinon (signup abouti, redirect /onboarding en cours) : on laisse
      // la navigation se faire, le should() ci-dessous la capte.
    });

    cy.location('pathname', { timeout: 120_000 }).then((path: string) => {
      // Identifiant unique : le compte existe déjà en base (run
      // précédent) mais pas pour CE navigateur → /onboarding (cas
      // b). Le 1er run absolu (compte inexistant en base) passe par
      // le signup propre → /onboarding aussi (cas a).
      if (path === '/onboarding') return;
      if (path === '/dashboard') {
        // Le signup abouti ET le redirect s'est passé très vite — le
        // wizard onboarding a déjà été joué et complété (ex. run où
        // on a replanqué les flags manuellement ou un run antérieur
        // a posé lumina-onboarded avant ce spec). Post-condition
        // satisfait, on continue sans replanquer le wizard.
        return;
      }
      throw new Error(
        `signupOrgAccount: après signup/login, path inattendu ${path} (attendu /onboarding ou /dashboard)`,
      );
    });
    // Si on est sur /onboarding, on joue le wizard COMPLET (l'exigence
    // stricte — pas de raccourci localStorage). Sur /dashboard,
    // l'onboarding est déjà complété pour ce navigateur : on passe
    // directement au post-condition.
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

    setOrgCreds({ email: fixed.email, password: fixed.password });
    cy.window().then((win) => {
      const sbKey = Object.keys(win.localStorage).find(
        (k) => /-auth-token$/.test(k),
      );
      if (!sbKey || !win.localStorage.getItem(sbKey)) {
        throw new Error(
          'signupOrgAccount: token Supabase absent — le wizard a atterri ' +
            'sur /dashboard mais la session n\'est pas persistée.',
        );
      }
    });
    return cy.wrap({ email: fixed.email, password: fixed.password });
  });

/**
 * Log-in du compte d'organisation UNIQUE du run (le même que
 * cy.signupOrgAccount() a créé au 1er spec).
 *
 *   1. Lit les credentials via le module de persistance inter-spec
 *      (`getOrgCreds()` — cache in-mem + config Node, voir
 *      cypress/support/orgCreds.ts).
 *   2. cy.visit('/auth') + submit du form login → /dashboard.
 *   3. Post-condition : /dashboard (pas /onboarding — l'org existe,
 *      onboarding déjà complété par le wizard du 1er spec).
 *
 * Si les credentials ne sont pas posés (le 1er spec n'a pas tourné,
 * ou le run a été nettoyé), ce spec échoue avec un message clair
 * plutôt que de recréer silencieusement un compte.
 */
Cypress.Commands.add('loginOrgAccount', function (): Cypress.Chainable {
  const creds = getOrgCreds();
  if (!creds?.email || !creds?.password) {
    throw new Error(
      'loginOrgAccount: credentials du compte d\'organisation absents — ' +
        'le 1er spec (cy.signupOrgAccount()) n\'a pas tourné ou le run ' +
        'a été nettoyé. Toujours lancer le spec d\'auth d\'abord dans ' +
        'le run (il pose le compte partagé pour la suite).',
    );
  }
  cy.clearLocalStorage();
  cy.visit('/auth');
  cy.get('input[type="email"]').first().type(creds.email);
  cy.get('input[type="password"]').first().type(creds.password);
  cy.contains('button[type="submit"]', 'Se connecter').click();

  // Diagnostic (6e run, 'Mes comptes' vide) : tracer quel branch le
  // login prend — /onboarding (wizard rejoué, flags vides) ou
  // /dashboard (onboarding déjà complété).
  // NB : jamais de commande (cy.window) DANS le callback should() —
  // should() re-exécute la fonction à chaque retry et rejoue alors
  // la commande. Assertion pure ici ; le trace suit dans le .then().
  cy.location('pathname', { timeout: 90_000 }).should((path: string) => {
    expect(
      path,
      `after login: ${path} (attendu /onboarding ou /dashboard — le POST login nav a pas completé en 90 s : vérifier le 503 Render / la rate limit GoTrue / le timeout du form)`,
    ).to.be.oneOf(['/onboarding', '/dashboard']);
  });
  cy.location('pathname').then((path: string) => {
    return cy.window().then((win) => {
      const flags = ['lumina-onboarding', 'lumina-onboarded', 'lumina-role', 'lumina-user']
        .map((k) => `${k}=${win.localStorage.getItem(k)}`)
        .join(' ');
      console.info(`[loginOrgAccount] post-login path=${path} flags: ${flags}`);
    });
  });

  // Retouche 2 (same 4e run) : le .then() ci-dessous re-lit le path APRES
  // que le should() ci-dessus a déjà validé → plus de race : le branch
  // est déterministe.
  cy.location('pathname').then((path: string) => {
    if (path === '/onboarding') {
      // Case b : le navigateur a été nettoyé (cy.clearLocalStorage()
      // ci-dessus), needsOnboarding() = true → le wizard COMPLET se
      // rejoue (runOnboarding), sans raccourci localStorage.
      cy.runOnboarding();
      cy.location('pathname', { timeout: 90_000 }).should('eq', '/dashboard');
      return;
    }
    // Case a (default) : path === '/dashboard', déjà conforme.
  });
  cy.location('pathname', { timeout: 90_000 }).should('eq', '/dashboard');
  return cy.wrap(null);
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
    const creds = getOrgCreds();
    if (!creds?.email || !creds?.password) {
      throw new Error(
        'resumeOnboardingForOrgAccount: credentials du compte d\'organisation ' +
          'absents — cy.loginOrgAccount() n\'a pas tourné avant ce call.',
      );
    }

    // 1. État "nouveau navigateur" : sign-out + nettoyage des flags.
    cy.clearLocalStorage();
    cy.visit('/auth');

    // 2. Signin du MÊME compte (déjà en base). needsOnboarding() = true
    //    → /onboarding (et non /dashboard). C'est le cas exact demandé :
    //    user enregistré mais pas encore configuré.
    cy.get('input[type="email"]').first().type(creds.email);
    cy.get('input[type="password"]').first().type(creds.password);
    cy.contains('button[type="submit"]', 'Se connecter').click();
    cy.location('pathname', { timeout: 90_000 }).should('eq', '/onboarding');

    // 3. Le wizard COMPLET (présentation → branch → org-setup → dashboard),
    //    SANS raccourci localStorage. Le compte est le même que celui du
    //    1er spec ; l'org est créée / reliée au rôle choisi ici.
    cy.runOnboarding();

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

export {};
