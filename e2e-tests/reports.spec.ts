import { test, expect, type Page } from "@playwright/test";

/**
 * FUMEE « Rapports & Constructeur de rapport ».
 *
 * Vérifie que les deux écrans de reporting sont complets et fonctionnels :
 *   - /reports : 3 onglets (Global / Groupes / Événements), sélecteur de
 *     période, section « Mes rapports » et bouton d'export (RBAC).
 *   - /report-builder : groupement, métriques, exécution d'un aperçu.
 *
 * Le rôle est forcé à TREASURIER (report:read + report:export) via addInitScript.
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

async function openApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "TREASURIER");
  });

  // Warm-up : absorbe le démarrage à froid (re-optimisation Vite) ici.
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 240_000 });

  if (TEST_EMAIL && TEST_PASSWORD) {
    await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/(dashboard|splash)/, { timeout: 90_000 });
  }
}

test("la page Rapports expose onglets, période, mes rapports et export", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await openApp(page);

  await page.goto("/reports", { waitUntil: "domcontentloaded", timeout: 90_000 });

  // Le titre de page et les 3 onglets sont visibles.
  await expect(page.getByRole("button", { name: "Groupes" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Événements" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Global" })).toBeVisible();

  // Sélecteur de période.
  await expect(page.getByRole("button", { name: "Tout" })).toBeVisible();

  // Section « Mes rapports » + bouton d'export (visibles car TREASURIER).
  await expect(page.getByText("Mes rapports")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Exporter le rapport/ }),
  ).toBeVisible();

  // Basculer vers l'onglet Groupes affiche le diagramme de solde par caisse.
  await page.getByRole("button", { name: "Groupes" }).click();
  await expect(page.getByText("Solde par caisse")).toBeVisible();
});

test("le constructeur de rapport exécute un aperçu", async ({ page }) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await openApp(page);

  await page.goto("/report-builder", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });

  await expect(
    page.getByRole("heading", { name: "Constructeur de rapport" }),
  ).toBeVisible({ timeout: 60_000 });

  // Un groupement et l'ajout de métrique sont proposés.
  await expect(page.getByText("Groupement")).toBeVisible();
  await page.getByRole("button", { name: /Ajouter la métrique/ }).click();
  await expect(page.getByText("Somme · amount")).toBeVisible();

  // Renseigner un nom puis exécuter → un aperçu s'affiche (même vide).
  await page.getByPlaceholder("Ex : Revenus par groupe").fill("Rapport e2e");
  await page.getByRole("button", { name: /Exécuter/ }).click();
  await expect(page.getByText("Aperçu")).toBeVisible({ timeout: 60_000 });

  // La section « Mes rapports » est présente sur le constructeur aussi.
  await expect(page.getByText("Mes rapports")).toBeVisible();
});
