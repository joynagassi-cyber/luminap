import { test } from '../../fixtures/guarded-page';
import { expect } from '@playwright/test';

/**
 * /events — liste des événements.
 * Mode sans-backend : le seed de `e2e/fixtures/guarded-page.ts` fournit une
 * session Supabase factice — le RouteGuard laisse passer la page. On n'assert
 * que la structure (titre de la liste) et jamais le contenu des lignes
 * (pas de backend).
 */
test.describe('events', () => {
  test('smoke : aucune erreur JS', async ({ appPage }) => {
    await appPage.goto('/events');
    const page = appPage.page;
    // Smoke : #root rempli, pas d'erreur JS. Pas d'assertion sur la liste
    // (pas de backend de test) — pas une couverture de l'écran.
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 30_000 });
  });

  test("R+V : titre liste d'événements", async ({ appPage }) => {
    await appPage.goto('/events');
    const page = appPage.page;
    // Texte propre à l'écran : titre H1 « Événements » (src/pages/Events.tsx:59).
    // En mode sans-backend la liste est vide (fallback PowerSync local) →
    // le message « Aucun événement » est affiché à la place (Events.tsx:85).
    await expect(page.getByRole('heading', { name: /Événements/i })).toBeVisible({ timeout: 30_000 });
  });
});
