import { test } from '../../fixtures/guarded-page';
import { expect } from '@playwright/test';

/**
 * /transaction/:id et /transaction/:id/edit — détail et édition d'une transaction.
 * Mode sans-backend : le seed de `e2e/fixtures/guarded-page.ts` fournit une
 * session Supabase factice — le RouteGuard laisse passer les pages. Avec une
 * id inconnue, on n'assert que le comportement (pas de crash, `#root`
 * rempli) : les détails d'une vraie transaction exigent un backend.
 *
 * Les tests ci-dessous sont des smoke (pas une couverture de l'écran) :
 * ils n'assertent que l'absence d'erreur JS et la présence de `#root`.
 */
const FAKE_ID = '00000000-0000-0000-0000-000000000000';

test.describe('transaction-detail', () => {
  test("smoke : aucune erreur JS — /transaction/:id inconnu", async ({ appPage }) => {
    await appPage.goto(`/transaction/${FAKE_ID}`);
    const page = appPage.page;
    // Aucune erreur JS non capturée (garde-fou global de la fixture).
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('smoke : aucune erreur JS — /transaction/:id/edit id inconnue', async ({ appPage }) => {
    await appPage.goto(`/transaction/${FAKE_ID}/edit`);
    const page = appPage.page;
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});
