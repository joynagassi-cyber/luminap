import { test, expect, type Page } from "@playwright/test";

/**
 * Page Finance :
 *  - le FAB global (« Transaction ») est masqué (les boutons de la page font
 *    la même chose, il ne doit plus se superposer) ;
 *  - le bouton vert ouvre le formulaire pré-sélectionné sur ENTRÉE, le bouton
 *    rouge sur SORTIE (le type voyage en query param `?type=`, fiable à
 *    travers le routeur Ionic).
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

async function loginAsTestUser(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "TREASURIER");
  });

  await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL!);
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(dashboard|splash)/, { timeout: 60_000 });
}

test("la page Finance masque le FAB et pré-sélectionne le type de transaction", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(240_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsTestUser(page);

  // Aller sur la liste des finances (démarrage à froid : polling).
  await page.goto("/finance", {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await expect(
    page.getByRole("button", { name: "Nouvelle dépense" }),
  ).toBeVisible({ timeout: 90_000 });

  // Le FAB global « Transaction » n'est plus affiché sur /finance.
  await expect(
    page.locator('button[aria-label="Transaction"]'),
    "le FAB doit être masqué sur la page Finance",
  ).toHaveCount(0);

  // Les deux boutons de la page sont bien présents.
  await expect(page.getByRole("button", { name: "Nouvelle entrée" })).toBeVisible();

  // Bouton rouge « Nouvelle dépense » → formulaire pré-sélectionné SORTIE.
  await page.getByRole("button", { name: "Nouvelle dépense" }).click();
  await expect(page).toHaveURL(/\/transaction\/new\?type=EXPENSE/, {
    timeout: 45_000,
  });

  // Retour sur /finance, bouton vert « Nouvelle entrée » → ENTRÉE.
  await page.goto("/finance", { waitUntil: "domcontentloaded", timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: "Nouvelle entrée" }),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Nouvelle entrée" }).click();
  await expect(page).toHaveURL(/\/transaction\/new\?type=INCOME/, {
    timeout: 45_000,
  });
});
