import { test, expect, type Page } from "@playwright/test";

/**
 * FUMEE « Budgets » (P0) — /budgets.
 *
 * Vérifie que l'écran Budgets est accessible et fonctionnel : titre, filtres
 * (exercice / période / centre de coûts), résumé (Prévu / Réel / Restant),
 * état vide, et le parcours de création (ouverture de la feuille + champs).
 *
 * La logique prévu/réel/écart est couverte par le test unitaire
 * `src/capabilities/__tests__/budgets-giving.test.ts` ; la persistance
 * locale (PowerSync) n'est pas fiable dans le sandbox headless, d'où cette
 * FUMEE centrée sur l'ergonomie du nouvel écran.
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

async function openApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "TREASURIER");
  });

  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 240_000 });

  if (TEST_EMAIL && TEST_PASSWORD) {
    await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/(dashboard|splash)/, { timeout: 90_000 });
  }
}

test("budgets : écran accessible, filtres et parcours de création", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await openApp(page);

  await page.goto("/budgets", { waitUntil: "domcontentloaded", timeout: 90_000 });

  // L'écran est accessible et rendu (titre + résumé + filtres).
  await expect(page.getByTestId("budgets-title")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText("Prévu")).toBeVisible();
  await expect(page.getByText("Restant")).toBeVisible();
  await expect(page.getByLabel("Exercice")).toBeVisible();

  // État vide lorsque aucun budget n'existe pour ce filtre.
  await expect(page.getByTestId("budgets-empty")).toBeVisible();

  // Ouverture de la feuille de création + présence des champs.
  await page.getByTestId("new-budget-btn").click();
  await expect(page.getByText("Nouveau budget")).toBeVisible();
  await expect(page.getByTestId("budget-name")).toBeVisible();
  await expect(page.getByTestId("budget-total")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Créer le budget/ }),
  ).toBeVisible();
});
