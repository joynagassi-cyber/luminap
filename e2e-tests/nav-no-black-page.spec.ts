import { test, expect, type Page } from "@playwright/test";

/**
 * RÉGRESSION « page noire » : naviguer vers une page doit afficher son
 * contenu — JAMAIS l'écran d'erreur de l'error-boundary (fond noir).
 *
 * Cause racine corrigée : useCurrentUser() renvoyait null au PREMIER rendu
 * (le repli utilisait un setState en phase de rendu, non appliqué au rendu
 * courant). Toute page lisant `user.role` à son montage crashait donc →
 * LazyRouteErrorBoundary → écran quasi noir. Ce test verrouille que les
 * pages concernées s'affichent bien.
 *
 * On navigue directement par URL (plus direct et plus stable qu'une chaîne
 * de clics sur la nav) : /groups était LA page qui crashait.
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

const ERROR_TEXT = "Impossible d'afficher cette page";

async function openApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "TREASURIER");
  });

  // Warm-up dédié : absorbé ici le coût du démarrage à froid Vite
  // (re-optimisation des dépendances) pour que le reste du test ne soit
  // pas gonflé par cette latence d'environnement.
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 240_000 });

  if (TEST_EMAIL && TEST_PASSWORD) {
    await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/(dashboard|splash)/, { timeout: 90_000 });
  }
}

test("les pages s'affichent après navigation (pas d'écran noir d'erreur)", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  // 240 s de warm-up absorbées, il reste ~180 s pour login + 2 navigations.
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await openApp(page);

  // /groups : LA page qui crashait (lecture synchrone de user.role).
  await page.goto("/groups", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: "Groupes" }),
    "la page Groupes doit s'afficher (et non l'écran d'erreur)",
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(ERROR_TEXT)).toHaveCount(0);

  // /cotisations : une autre page lazy de premier niveau.
  await page.goto("/cotisations", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(
    page.getByRole("heading", { name: "Cotisations" }),
    "la page Cotisations doit s'afficher",
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(ERROR_TEXT)).toHaveCount(0);
});
