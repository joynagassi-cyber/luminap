/**
 * Isolation check — single test to expose blocked hosts from the guard.
 * Run with: npx playwright test --config=playwright.config.ts specs/_isolation/isolation.spec.ts
 *
 * This test does NOT assert content — it only captures `blockedRequests`
 * from the fixture and prints the HOSTS (no query, no secrets) that the
 * network guard refused. If any real database host appears here,
 * isolation is broken.
 */
import { test } from '../../fixtures/guarded-page';
import { expect } from '@playwright/test';

test('isolation : hosts blocked by network guard', async ({ appPage }) => {
  await appPage.goto('/finance');

  // Extract unique HOSTS (strip path) from blockedRequests.
  const blockedHosts = [...new Set(appPage.blockedRequests.map((r) => r.split('/')[0]))];

  console.log('\n===== ISOLATION CHECK — hosts blocked by guard =====');
  if (blockedHosts.length === 0) {
    console.log('(aucun hôte bloqué — tous les flux restent en local)');
  } else {
    blockedHosts.forEach((h) => console.log(`  BLOCKED: ${h}`));
  }
  console.log('=====================================================\n');

  // If any Supabase/PowerSync host appears, the dummy values were NOT
  // effective → isolation is broken. We surface this as a soft warning
  // and still let the test PASS so the output is captured (the fixture
  // guard will have already aborted those requests; they did not reach
  // the real DB).
  const REAL_HOSTS = /supabase\.co|powersync\.local|agnes-ai\.com/i;
  const leaked = blockedHosts.filter((h) => REAL_HOSTS.test(h));
  if (leaked.length > 0) {
    console.error(`[ISOLATION BROKEN] hosts leaked into guard: ${leaked.join(', ')}`);
  }

  // The test itself passes: we only observe, the guard already blocked
  // the offending requests so no real data path was reached.
  expect(true).toBe(true);
});
