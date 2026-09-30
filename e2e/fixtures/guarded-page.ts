import { test as base, expect, Page } from '@playwright/test';

/**
 * Fixture partagée — garde-fou réseau + navigation avec waitUntil "commit".
 *
 * Règle n° 4 (jamais de vraie base) : le backend utilisé par les tests est
 * désigné par TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY (valeurs de TEST)
 * ou, à défaut (mode sans-backend), par les valeurs factices posées dans
 * webServer.env (VITE_SUPABASE_URL etc. — voir e2e/ENV_NAMES.md).
 *
 * Règle n° 5 (garde-fou réseau) : aucun hôte n'est autorisé sauf
 * 127.0.0.1 / ::1 / localhost ET l'hôte de TEST_SUPABASE_URL (si posée).
 * Toute requête vers un autre hôte est ABORTée et fait ÉCHOUER le test
 * avec un message explicite (listée dans `blockedRequests`).
 *
 * Règle n° 5b (jamais de sleep fixe) : navigation en `waitUntil: "commit"`
 * + attente du repère visible `#root` via MutationObserver.
 */

type GuardedPage = {
  page: Page;
  /** Liste des requêtes bloquées par le garde-fou (hôte + chemin, sans query ni secret). */
  blockedRequests: string[];
  /** Échoue le test si le garde-fou a bloqué au moins une requête. */
  assertNoBlockedRequests(): void;
  /** Navigue à `path` (commit) et attend que #root soit rempli. */
  goto(path: string): Promise<void>;
  /** Attend que l'URL corresponde à `path` (regex ou string). */
  waitForRoute(path: string | RegExp): Promise<void>;
};

function allowedHosts(): Set<string> {
  const hosts = new Set<string>(['localhost', '127.0.0.1', '::1']);
  // TEST_SUPABASE_URL : posée par le fixture (process.env.TEST_SUPABASE_URL =
  // VITE_SUPABASE_URL_e2e) quand le mode sans-backend est actif. L'hôte
  // factice est autorisé — les appels REST de l'app y vont, le serveur
  // factice ne les sert pas, le fallback local de PowerSync prend le relais.
  // En mode backend-test, l'utilisateur a posé TEST_SUPABASE_URL sur la vraie
  // base de test — on l'autorise.
  const testUrl = process.env.TEST_SUPABASE_URL;
  if (testUrl) {
    try {
      hosts.add(new URL(testUrl).hostname);
    } catch {
      // URL invalide → on n'ajoute rien.
    }
  }
  // VITE_SUPABASE_URL_e2e : source de vérité de l'URL factice. Ajoutée
  // explicitement pour que le guard ne dépende que d'une seule variable
  // même si TEST_SUPABASE_URL n'a pas été copié par le fixture.
  const e2eUrl = process.env.VITE_SUPABASE_URL_e2e;
  if (e2eUrl) {
    try {
      hosts.add(new URL(e2eUrl).hostname);
    } catch {
      // URL invalide → on n'ajoute rien.
    }
  }
  // L'hôte factice de l'URL posée dans webServer.env (VITE_SUPABASE_URL)
  // est TOUJOURS autorisé, même si l'opérateur n'a pas posé
  // VITE_SUPABASE_URL_e2e dans use.env. On le dérive ici de la valeur
  // factice déclarée dans le config — jamais d'hôte réel.
  try {
    hosts.add(new URL('https://example-dummy.supabase.co').hostname);
  } catch {
    // valeur factice invalide (devrait ne jamais arriver)
  }
  return hosts;
}

/**
 * Mode sans-backend : on seed le localStorage AVANT le chargement de la page
 * pour tromper le garde-fou de routage (SessionProvider). On simule une
 * session Supabase valide (dummy, pas de vraie clé) + l'état onboarding
 * complété + un rôle, pour que les routes protégées se rendent sans
 * rediriger vers /auth.
 */
/**
 * Dérive la clé de stockage Supabase exactement comme le fait
 * `createClient` (node_modules/@supabase/supabase-js/dist/index.mjs:635) :
 * `sb-${new URL(baseUrl).hostname.split('.')[0]}-auth-token`.
 *
 * Le serveur Vite reçoit VITE_SUPABASE_URL (webServer.env, factice).
 * La fixture reçoit VITE_SUPABASE_URL_e2e (même valeur, posée à côté)
 * — la variable de la fixture est la source de vérité du seed pour
 * éviter de dupliquer l'URL factice dans le code.
 */
const E2E_SUPABASE_URL =
  process.env.VITE_SUPABASE_URL_e2e || 'https://example-dummy.supabase.co';
const sbKey = `sb-${new URL(E2E_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

const SEED_SCRIPT = `
(() => {
  const uuid = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      (c) =>
        (Math.random() * 16 | 0) +
        (c === 'x' ? 0 : (Math.random() * 4 | 8) + 8)
    );
  const session = {
    access_token: 'dummy-token-for-tests-only',
    refresh_token: 'dummy-refresh-token-for-tests-only',
    token_type: 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: uuid(),
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e-test@lumina.local',
      email_confirmed_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      user_metadata: {},
    },
  };
  try {
    // La clé est injectée par la template-string — elle dérive de la même
    // VITE_SUPABASE_URL que le serveur (voir commentaire ci-dessus).
    localStorage.setItem(${JSON.stringify(sbKey)}, JSON.stringify(session));
  } catch {}
  localStorage.setItem('lumina-role', 'TREASURIER');
  localStorage.setItem('lumina-onboarded', 'true');
})();
`;

export const test = base.extend<{ appPage: GuardedPage }>({
  appPage: async ({ page, context }, use) => {
    // Mode sans-backend : on seed le localStorage AVANT le chargement de la
    // page pour tromper le garde-fou de routage (RouteGuard, src/App.tsx).
    // Le process Playwright reçoit VITE_SUPABASE_URL_e2e via webServer.env
    // (pas VITE_SUPABASE_URL, qui est consommé par Vite côté serveur) — on
    // la copie vers process.env.TEST_SUPABASE_URL, qui est la variable que
    // allowedHosts() ci-dessous lit pour autoriser l'hôte factice.
    // Le mode backend-test reste intact : si l'utilisateur a posé
    // TEST_SUPABASE_URL (vraie base de test), on ne l'écrase pas.
    if (!process.env.TEST_SUPABASE_URL && process.env.VITE_SUPABASE_URL_e2e) {
      process.env.TEST_SUPABASE_URL = process.env.VITE_SUPABASE_URL_e2e;
      // On pointe TEST_SUPABASE_ANON_KEY sur une valeur factice assortie :
      // le guard du fixture autorise l'hôte, le serveur factice ne servira
      // pas les requêtes, le fallback local (PowerSync) prend le relais.
      process.env.TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'dummy-anon-key-0000000000000000';
    }

    // Mode sans-backend : on seed le localStorage avant chaque navigation
    // pour éviter la redirection vers /auth sur les routes protégées.
    await page.addInitScript(SEED_SCRIPT);

    const blockedRequests: string[] = [];

    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
      const allowed = isLocal || allowedHosts().has(url.hostname);
      if (!allowed) {
        const entry = `${url.hostname}${url.pathname}`;
        blockedRequests.push(entry);
        console.error(`[garde-fou] REQUETE BLOCQUEE : ${entry} — le test va échouer explicitement.`);
        // Code d'erreur valide pour Playwright : "blockedbyclient"
        // (list des codes acceptés par Route.abort : aborted, accessdenied,
        // addressunreachable, blockedbyclient, blockedbyresponse,
        // connectionaborted, connectionclosed, connectionfailed,
        // connectionrefused, connectionreset, internetdisconnected,
        // namenotresolved, timedout, failed — source :
        // node_modules/playwright-core/lib/coreBundle.js:36540).
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });

    const appPage: GuardedPage = {
      page,
      blockedRequests,
      assertNoBlockedRequests() {
        if (blockedRequests.length > 0) {
          throw new Error(
            `GARDE-FOU : ${blockedRequests.length} requête(s) vers un hôte non autorisé : ${blockedRequests.join(', ')} ` +
            `(autorisés : localhost + hôte de TEST_SUPABASE_URL si posée)`
          );
        }
      },
      async goto(path: string): Promise<void> {
        await page.goto(path, { waitUntil: 'commit', timeout: 120_000 });
        // Repère visible : #root se remplit (MutationObserver, jamais de sleep fixe).
        await page.locator('#root').evaluate((el) => {
          if (el.children.length > 0) return Promise.resolve();
          return new Promise<void>((resolve, reject) => {
            const obs = new MutationObserver(() => {
              if (el.children.length > 0) {
                obs.disconnect();
                resolve();
              }
            });
            obs.observe(el, { childList: true, subtree: true });
            setTimeout(() => {
              obs.disconnect();
              reject(new Error('waitForReady : #root reste vide après 90 s'));
            }, 90_000);
          });
        });
      },
      async waitForRoute(path: string | RegExp): Promise<void> {
        await page.waitForURL(path, { timeout: 60_000 });
      },
    };

    await use(appPage);

    // Garde-fou : toute requête bloquée = échec explicite du test.
    appPage.assertNoBlockedRequests();
  },
});

export { expect };
