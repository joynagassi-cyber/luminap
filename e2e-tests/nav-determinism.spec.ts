import { test, expect, type Page } from "@playwright/test";

/**
 * Déterminisme de la barre de navigation (BottomNav).
 *
 * Chaque bouton de la barre mène à EXACTEMENT une page claire :
 *   - onglets + menu « Plus »  → navigate(feature.route) avec garde de repli ;
 *   - FAB → une seule destination par contexte, et MASQUÉ sur les pages qui
 *     exposent déjà leurs propres actions claires (jamais de bouton mort).
 *
 * Ce test verrouille : le FAB « Transaction » est présent (cible claire
 * /transaction/new) sur un contexte par défaut, et disparaît sur une page
 * formulaire (/event/new) qui se soumet elle-même.
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

async function loginAsTestUser(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "TREASURIER");
  });
  await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL!);
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(dashboard|splash)/, { timeout: 60_000 });
}

// Tous les libellés que le FAB a pu avoir (y compris « Valider », retiré :
// il ne doit plus exister nulle part).
const FAB_LABELS = ["Transaction", "Nouveau", "Verser", "Valider"];

test("FAB : destination claire par défaut, masqué sur page formulaire", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await loginAsTestUser(page);

  // 1) /dashboard : le FAB par défaut est « Transaction » (→ /transaction/new).
  await page.goto("/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(
    page.locator('nav[data-testid="bottom-nav"]'),
    "la barre de navigation doit être visible",
  ).toBeVisible({ timeout: 90_000 });

  await expect(
    page.locator('button[aria-label="Transaction"]'),
    "le FAB par défaut doit cibler une page claire (Transaction)",
  ).toBeVisible();

  // 2) /event/new : le formulaire se soumet lui-même → aucun FAB (pas de
  //    bouton mort ni ambigu sur cette page).
  await page.goto("/event/new", { waitUntil: "domcontentloaded", timeout: 60_000 });
  for (const label of FAB_LABELS) {
    await expect(
      page.locator(`button[aria-label="${label}"]`),
      `le FAB « ${label} » ne doit plus être présent sur /event/new`,
    ).toHaveCount(0);
  }
});
