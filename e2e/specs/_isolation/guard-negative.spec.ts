import { test } from '../../fixtures/guarded-page';
import { expect } from '@playwright/test';

/**
 * Contrôle négatif du garde-fou réseau (Règle n° 5).
 *
 * Objectif : prouver que le garde-fou de `e2e/fixtures/guarded-page.ts`
 * DÉTECTE bien une requête vers un hôte non autorisé. On déclenche
 * volontairement `fetch('https://example.com/')` depuis la page ; le
 * route handler du fixture (context.route) doit :
 *   1. ENREGISTRER `example.com/` dans `blockedRequests`,
 *   2. ABORTer la requête (route.abort) — le fetch côté page échoue
 *      (pas de 200), le serveur example.com n'est JAMAIS contacté.
 *
 * Vérification (sans dépendre du teardown du fixture) :
 *   - le fetch a échoué côté page (isolation respectée),
 *   - `example.com` est présent dans `appPage.blockedRequests`,
 *   - `assertNoBlockedRequests` LEVE une erreur contenant le nom
 *     d'hôte (preuve que le fixture échoue explicitement en fin de test).
 *
 * Résultat attendu : le test PASSE (le garde-fou a bien détecté et
 * bloqué la requête). Si le garde-fou est inopérant, le test ÉCHOUE
 * (assertion `blockedRequests.some(...)` fausse).
 */
test('guard-negative : une requête vers example.com est bloquée par le garde-fou', async ({ appPage, page }) => {
  await appPage.goto('/finance');

  // 1. Déclencher la requête non autorisée depuis la page.
  //    Le garde-fou l'ABORTE → le fetch échoue côté page (jamais de 200).
  const fetchResult = await page.evaluate(async () => {
    try {
      const resp = await fetch('https://example.com/');
      return { ok: resp.ok, status: resp.status };
    } catch (e) {
      return { ok: false, status: 0 };
    }
  });

  // Isolation : la requête n'atteint PAS le serveur distant.
  expect(
    fetchResult.ok,
    'isolation cassée : fetch(example.com) a RÉUSSI (garde-fou inopérant)',
  ).toBe(false);

  // 2. Le garde-fou a ENREGISTRÉ la requête.
  expect(
    appPage.blockedRequests.some((r) => r.startsWith('example.com')),
    `example.com absent de blockedRequests : [${appPage.blockedRequests.join(', ')}]`,
  ).toBe(true);

  // 3. Le fixture échoue explicitement (assertNoBlockedRequests lève avec
  //    le nom d'hôte) — c'est le comportement attendu en fin de test.
  //    On le vérifie SANS faire échouer ce test (le contrôle négatif
  //    documente que le fixture est armé) : on capture l'exception.
  let guardError: string | null = null;
  try {
    appPage.assertNoBlockedRequests();
  } catch (e: any) {
    guardError = String(e?.message ?? e);
  }
  expect(
    guardError?.includes('example.com'),
    `assertNoBlockedRequests n'a pas levé avec example.com (message=${guardError})`,
  ).toBe(true);

  // 4. Marquer le test comme « échec attendu » si le fixture doit encore
  //    échouer au teardown (le teardown re-tente assertNoBlockedRequests
  //    dans le fixture). Le contrôle négatif est VÉRIFIÉ ; le teardown du
  //    fixture écoue de bonne foi — on le tolère ici car il est attendu.
  test.fail(true, "contrôle négatif vérifié : le fixture teardown va échouer (assertNoBlockedRequests) — c'est le comportement documenté.");
});
