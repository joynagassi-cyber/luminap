import { test } from '../../fixtures/guarded-page';
import { expect } from '@playwright/test';

/**
 * /finance — grand livre.
 * Mode sans-backend : le seed de `e2e/fixtures/guarded-page.ts` fournit une
 * session Supabase factice (localStorage avant chargement) — le RouteGuard
 * de src/App.tsx laisse passer la page. Le fallback local de PowerSync
 * (src/lib/dataLayer.ts) sert les données du cache local quand le backend
 * n'est pas prêt ; les appels REST vers l'hôte factice échouent proprement
 * et la liste vide est affichée.
 *
 * Catégorie : `smoke` (test n° 1) = URL reste /finance + #root rempli +
 * un texte propre à l'écran (carte « Revenus »). Compte comme couverture
 * R+V minimale de l'écran.
 *
 * Les tests de contenu (V, P, F, A, N) : exécutés en mode sans-backend,
 * ils s'appuient sur le fallback local de PowerSync. La couverture complète
 * (données réelles, soumission) reste réservée au mode backend-test.
 */
test.describe('finance', () => {
  test('smoke : aucune erreur JS', async ({ appPage }) => {
    await appPage.goto('/finance');
    const page = appPage.page;
    // Smoke renforcé : l'URL reste /finance (pas de redirection /auth)
    // ET un texte propre à l'écran (titre / carte synthèse) est visible.
    // Ce test compte comme couverture R+V minimale de l'écran.
    await expect(page).toHaveURL(/\/finance/);
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 30_000 });
    await expect(page.getByText('Revenus')).toBeVisible({ timeout: 30_000 });
  });

  test('V : état vide — aucune transaction -> message dédié', async ({ appPage }) => {
    await appPage.goto('/finance');
    const page = appPage.page;
    await expect(page.getByText('Aucune transaction trouvée')).toBeVisible({ timeout: 30_000 });
  });

  test('P : FAB « Nouvelle entrée » (INCOME) ouvre /transaction/new?type=INCOME', async ({ appPage }) => {
    await appPage.goto('/finance');
    const page = appPage.page;
    await page.getByRole('button', { name: 'Nouvelle entrée' }).click();
    await appPage.waitForRoute(/\/transaction\/new\?type=INCOME/);
  });

  test('P : FAB « Nouvelle dépense » (EXPENSE) ouvre /transaction/new?type=EXPENSE', async ({ appPage }) => {
    await appPage.goto('/finance');
    const page = appPage.page;
    await page.getByRole('button', { name: 'Nouvelle dépense' }).click();
    await appPage.waitForRoute(/\/transaction\/new\?type=EXPENSE/);
  });

  test('A : bouton « Filtres » ouvre/ferme le panneau', async ({ appPage }) => {
    await appPage.goto('/finance');
    const page = appPage.page;
    const filterBtn = page.getByRole('button', { name: 'Filtres' });
    await filterBtn.click();
    // « Caisse » apparaît dans le panneau de filtres : le libellé du champ
    // (Finance.tsx:255) et le bouton du sélecteur de caisse (Finance.tsx:269,
    // « Caisse principale ») contiennent tous les deux le mot « Caisse ».
    // On cible le libellé exact du champ (text-xs, non-cliquable) — jamais
    // le bouton — pour éviter la violation strict-mode.
    await expect(page.getByText('Caisse', { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('N : nav basse « Accueil » ramène sur /dashboard', async ({ appPage }) => {
    await appPage.goto('/finance');
    const page = appPage.page;
    await page.getByRole('tab', { name: 'Accueil' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  });
});
