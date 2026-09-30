import { defineConfig } from "@playwright/test";

/**
 * Config minimale pour le test de fumée `e2e:min`.
 * Distincte de `playwright-dyad.config.ts` (non touchée).
 *
 * - Le serveur de dev Vite écoute sur le port 8080 (vite.config.ts :
 *   `server: { host: "::", port: 8080 }`) → IPv6 dual-stack, `localhost`
 *   résout bien en pratique (à ajuster 127.0.0.1 si ECONNREFUSED).
 * - Navigateur : le Chrome installé sur la machine (channel `chrome`).
 * - Repli : `$env:HEADED=1` ouvre une fenêtre visible.
 */
export default defineConfig({
  testDir: "./e2e-min",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60000,
  use: {
    channel: "chrome",
    baseURL: "http://localhost:8080",
    headless: !process.env.HEADED,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 180000,
  },
});
