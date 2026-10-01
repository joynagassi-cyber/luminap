import { defineConfig } from 'cypress';

/**
 * Cypress configuration — Lumina E2E (migration from Playwright)
 *
 * Design notes (kept in line with the old Playwright setup):
 * - `webServer` is intentionally NOT defined: the Vite dev server is started
 *   separately (npm run dev → http://localhost:8080) so we don't double-start
 *   the Nitro SSR app. Point `baseUrl` at the already-running server via the
 *   CYPRESS_BASE_URL env var.
 * - Default browser: Chromium (bundled with Cypress). To run against the
 *   system Chrome (matching the previous Playwright `channel: 'chrome'`),
 *   use:  CYPRESS_BROWSER=chrome npm run cypress:run
 */
export default defineConfig({
  e2e: {
    baseUrl:
      process.env.CYPRESS_BASE_URL ||
      'https://lumina-76un.onrender.com',
    // Expose credentials to the browser test context via Cypress.config().env.
    // In Cypress 16, process.env is not directly available in the
    // Node-context Mocha runner. Use `expose` (a plain object) to whitelist
    // keys that the browser test context can access via Cypress.expose().
    expose: {
      TEST_EMAIL: process.env.CYPRESS_TEST_EMAIL || '',
      TEST_PASSWORD: process.env.CYPRESS_TEST_PASSWORD || '',
      SUPABASE_URL: process.env.CYPRESS_SUPABASE_URL || 'https://hhgovvrnalibhgpakswi.supabase.co',
      // Fallback to the project's publishable key (same value as
      // .env.local SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY).
      SUPABASE_ANON_KEY:
        process.env.CYPRESS_SUPABASE_ANON_KEY ||
        'sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh',
      // PowerSync worker URL — used by `cy.interceptCloud()` to prove
      // offline specs never hit the sync worker (cypress/support/local.ts).
      POWERSYNC_URL:
        process.env.CYPRESS_POWERSYNC_URL ||
        'https://6a9dd96302481fb31b945823.powersync.journeyapps.com',
      // Compte d'organisation UNIQUE du run (pattern signupOrgAccount →
      // loginOrgAccount, voir cypress/support/orgCreds.ts) : le 1er spec
      // (auth-real.cy.ts) l'écrit via Cypress.expose('orgCreds', {...}) ;
      // tous les specs suivants le relisent via loginOrgAccount().
      // Pré-déclaré ici (null) pour que la clé soit lisible au boot.
      orgCreds: null,
      // IDENTIFIANT UNIQUE du compte d'organisation de test (source de
      // vérité : CYPRESS_ORG_EMAIL / CYPRESS_ORG_PASSWORD, jamais
      // éphémère). Par défaut = lumina-org-e2e@lumina.dev / E2e-Lumina!1
      // (voir cypress/support/orgCreds.ts). Le 1er run absolu fait le
      // sign-up COMPLET par l'UI ; les runs suivants font login direct.
      ORG_EMAIL: process.env.CYPRESS_ORG_EMAIL || 'lumina-org-e2e@lumina.dev',
      ORG_PASSWORD: process.env.CYPRESS_ORG_PASSWORD || 'E2e-Lumina!1',
    },
    // Same testDir shape as before; specs live under cypress/e2e.
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    // Load the global support file before every spec (custom commands, setup).
    supportFile: 'cypress/support/e2e.ts',
    // Default timeouts mirror the old Playwright per-test timeouts.
    defaultCommandTimeout: 8000,
    pageLoadTimeout: 120000,
    screenshotOnRunFailure: true,
    video: false,
    // Keep runs deterministic (avoids flakiness from parallel network bursts).
    viewportWidth: 390,
    viewportHeight: 844,
  },
});
