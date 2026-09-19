import { test, expect, type Page } from "@playwright/test";

/**
 * FUMEE « Dons & Campagnes » (P0) — /giving.
 *
 * Vérifie que l'écran Giving est accessible et fonctionnel : titre, 4 onglets
 * (Campagnes / Donateurs / Pledges / Reçus), et le parcours de création
 * (ouverture des feuilles + champs).
 *
 * La logique de progression (réel + engagements vs objectif), le total annuel
 * donateur et le reçu fiscal sont couverts par le test unitaire
 * `src/capabilities/__tests__/budgets-giving.test.ts` ; la persistance locale
 * (PowerSync) n'est pas fiable dans le sandbox headless.
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

test("giving : écran accessible, onglets et parcours de création", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await openApp(page);

  await page.goto("/giving", { waitUntil: "domcontentloaded", timeout: 90_000 });

  // L'écran est accessible (titre + 4 onglets).
  await expect(page.getByTestId("giving-title")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("tab", { name: "Campagnes" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Donateurs" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Pledges" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Reçus" })).toBeVisible();

  // Onglet Campagnes (par défaut) : parcours de création d'une campagne.
  await page.getByTestId("new-campaign-btn").click();
  await expect(
    page.getByRole("heading", { name: "Nouvelle campagne" }),
  ).toBeVisible();
  await expect(page.getByTestId("campaign-name")).toBeVisible();
  await expect(page.getByTestId("campaign-target")).toBeVisible();
  // Fermer la feuille (son backdrop couvre les onglets) avant de changer
  // d'onglet.
  await page.getByRole("button", { name: "Fermer" }).click();

  // Onglet Donateurs : parcours de création d'un donateur.
  await page.getByRole("tab", { name: "Donateurs" }).click();
  await expect(page.getByTestId("new-donor-btn")).toBeVisible();
  await page.getByTestId("new-donor-btn").click();
  await expect(
    page.getByRole("heading", { name: "Nouveau donateur" }),
  ).toBeVisible();
  await expect(page.getByTestId("donor-name")).toBeVisible();
});
