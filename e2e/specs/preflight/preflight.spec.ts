import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Pré-vol minimal — 3 runs Playwright + 1 run Magnitude (exécuté séparément).
 *
 * Ce test vérifie :
 * - goto /auth avec waitUntil "commit"
 * - #root rempli (mutation observer)
 * - 0 pageerror (erreur JS non capturée)
 */

const PREFLIGHT_LOG = path.resolve(__dirname, '../../../e2e-min/logs/preflight-runs.log');

function appendRun(runNo: number, durationMs: number): void {
  fs.appendFileSync(PREFLIGHT_LOG, `[${new Date().toISOString()}] run ${runNo} : ${(durationMs / 1000).toFixed(1)} s\n`);
}

test('pré-vol : goto /auth commit + #root rempli + 0 pageerror', async ({ context, page }) => {
  let runNo = 1;
  const pageErrors: string[] = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Run 1 — FROID (premier, React lazy chunks chargés à froid).
  const t0 = performance.now();
  await page.goto('/auth', { waitUntil: 'commit', timeout: 120_000 });
  await page.locator('#root').evaluate((el) => {
    if (el.children.length > 0) return;
    return new Promise<void>((resolve, reject) => {
      const obs = new MutationObserver(() => {
        if (el.children.length > 0) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(el, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); reject(new Error('timeout #root')); }, 90_000);
    });
  });
  const coldMs = performance.now() - t0;
  appendRun(runNo, coldMs);
  console.log(`[pré-vol] run 1 (froid) : ${(coldMs / 1000).toFixed(1)} s, pageerrors=${pageErrors.length}`);
  expect(pageErrors, `erreurs JS non capturées au run 1 : ${pageErrors.join('; ')}`).toHaveLength(0);

  // Runs 2 et 3 — CHAUDS (modules déjà chargés par le run 1, même page).
  for (let i = 2; i <= 3; i++) {
    pageErrors.length = 0;
    const t1 = performance.now();
    await page.reload({ waitUntil: 'commit', timeout: 120_000 });
    await page.locator('#root').evaluate((el) => {
      if (el.children.length > 0) return;
      return new Promise<void>((resolve, reject) => {
        const obs = new MutationObserver(() => {
          if (el.children.length > 0) {
            obs.disconnect();
            resolve();
          }
        });
        obs.observe(el, { childList: true, subtree: true });
        setTimeout(() => { obs.disconnect(); reject(new Error('timeout #root')); }, 90_000);
      });
    });
    const hotMs = performance.now() - t1;
    appendRun(i, hotMs);
    console.log(`[pré-vol] run ${i} (chaud) : ${(hotMs / 1000).toFixed(1)} s, pageerrors=${pageErrors.length}`);
    expect(pageErrors, `erreurs JS non capturées au run ${i} : ${pageErrors.join('; ')}`).toHaveLength(0);
  }
});
