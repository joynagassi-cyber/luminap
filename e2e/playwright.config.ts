import { defineConfig } from '@playwright/test';

/**
 * Config E2E exhaustive (sessions /testing-qa) — distincte de
 * `playwright.min.config.ts` (pré-vol minimal) et de `playwright-dyad.config.ts`
 * (suite existante, non touchée).
 *
 * Règle n° 4 (jamais de vraie base) : le serveur de dev Vite lit `.env` /
 * `.env.local` automatiquement → on **écrase** via `webServer.env` toutes les
 * variables VITE_* recensées dans `e2e/ENV_NAMES.md` avec des valeurs
 * factices (dummy supabase.co, clé fake). La vraie base n'est jamais jointe.
 *
 * Règle n° 5 : `channel: "chrome"`, workers 1, retries 0.
 */
export default defineConfig({
  testDir: './specs',
  testMatch: ['**/*.spec.ts'],
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 180_000,
  use: {
    channel: 'chrome',
    baseURL: 'http://localhost:8080',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    outputDir: './e2e-min/logs/test-results',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    // Isolation (Règle n° 4) : Playwright démarre lui-même le serveur et
    // tue tout processus préexistant sur le port — on ne lance JAMAIS de
    // serveur manuellement (voir e2e/stop-server-8080.ps1).
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      // Valeurs factices — TOUTES les variables de e2e/ENV_NAMES.md sont
      // neutralisées ici. Jamais de vraie valeur.
      VITE_SUPABASE_URL: 'https://example-dummy.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'dummy-anon-key-0000000000000000',
      VITE_POWERSYNC_URL: 'https://example-dummy.powersync.local',
      VITE_ONESIGNAL_APP_ID: '00000000-0000-0000-0000-000000000000',
      // VITE_SUPABASE_JWKS_URL : posée dans .env.local pour la validation
      // hors ligne de JWT en prod. On la neutralise ici — aucun code src ne
      // la lit aujourd'hui (vérifié 2026-09-29), mais si une future feature
      // consomme cette valeur, elle tombera sur la factice et non sur la
      // vraie (jamais de vraie base). Valeur dummy = URL factice.
      VITE_SUPABASE_JWKS_URL: 'https://example-dummy.supabase.co/auth/v1/jwks',
      // PS_DATABASE_PASSWORD : mot de passe du DB pour la réplication
      // PowerSync. Ne doit JAMAIS arriver au serveur de dev en e2e. Valeur
      // vide pour neutraliser le fichier .env.local.
      PS_DATABASE_PASSWORD: '',
      CAPACITOR_BUILD: 'false',
      // TEST_SUPABASE_* : mode backend-test JAMAIS actif. On force le
      // mode sans-backend (valeurs vides → le fixture garde-fou ne
      // référence aucun hôte distant, voir e2e/ENV_NAMES.md « optionnelles »).
      TEST_SUPABASE_URL: '',
      TEST_SUPABASE_ANON_KEY: '',
    },
  },
  // Bloqué par défaut : ne jamais laisser un serveur manuellement démarré
  // prendre la main sur le port 8080 (isolation, Règle n° 4).
  //
  // VITE_SUPABASE_URL_e2e : l'URL factice LUE PAR LA FIXTURE (process
  // Playwright — les variables de `webServer.env` ne sont posées QUE pour
  // le serveur Vite, pas pour le process qui exécute les specs/fixtures).
  // La fixture :
  //   (a) dérive la clé de stockage de la même URL que le serveur
  //       (sb-example-auth-token, cf. supabase-js/index.mjs:635),
  //   (b) autorise l'hôte factice dans le garde-fou réseau (allowedHosts),
  //   (c) copie VITE_SUPABASE_URL_e2e → process.env.TEST_SUPABASE_URL pour
  //       le mode sans-backend (le fixture ne touche JAMAIS les vraies
  //       variables TEST_SUPABASE_* posées par un opérateur en mode
  //       backend-test).
  // Les deux valeurs (webServer.env.VITE_SUPABASE_URL et use.env.
  // VITE_SUPABASE_URL_e2e) doivent rester synchrones — jamais de vrai hôte.
  env: {
    VITE_SUPABASE_URL_e2e: 'https://example-dummy.supabase.co',
  },
});
