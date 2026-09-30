import { test } from '../../fixtures/guarded-page';
import { expect } from '@playwright/test';

/**
 * /balance — bilan / solde.
 * Mode sans-backend : le seed de `e2e/fixtures/guarded-page.ts` fournit une
 * session Supabase factice — le RouteGuard laisse passer la page. On n'assert
 * que la structure (titre) et jamais le contenu du solde (pas de backend).
 */
test.describe('balance', () => {
  test('smoke : aucune erreur JS', async ({ appPage }) => {
    await appPage.goto('/balance');
    const page = appPage.page;
    // Smoke : #root rempli, pas d'erreur JS. Pas d'assertion sur le solde
    // (pas de backend de test) — pas une couverture de l'écran.
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 30_000 });
  });

  test('R+V : titre Bilan financier', async ({ appPage }) => {
    await appPage.goto('/balance');
    const page = appPage.page;
    await expect(page.getByText('Bilan financier').first()).toBeVisible({ timeout: 30_000 });
  });
});
