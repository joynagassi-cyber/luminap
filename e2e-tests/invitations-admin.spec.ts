import { test, expect, type Page } from "@playwright/test";

/**
 * Gestion des invitations — la page liste les invitations et expose, par
 * invitation active, la section « Demandes » (claims) avec Confirmer/Rejeter.
 *
 * Le test valide que le chemin des claims (nouveau useEffect + rendu) charge
 * sans crash dans l'état vide (aucune invitation), que les stats s'affichent,
 * et que la section « Demandes » n'apparaît que s'il y a des demandes.
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

async function openApp(page: Page): Promise<void> {
  // Bypasse l'onboarding local pour tomber directement sur le contenu.
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "TREASURIER");
  });

  if (TEST_EMAIL && TEST_PASSWORD) {
    await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/(dashboard|splash)/, { timeout: 60_000 });
  }
}

test.describe("Gestion des invitations (claims)", () => {
  test("chargement sans crash + stats + section « Demandes » absente à vide", async ({
    page,
  }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "test-user non provisionné (variables d'env absentes)",
    );
    test.setTimeout(200_000);
    await page.setViewportSize({ width: 390, height: 844 });

    await openApp(page);
    await page.goto("/invitation/manage", {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    // La page est bien rendue (stats + bouton « Créer une invitation »).
    const createBtn = page.getByRole("button", { name: /Créer une invitation/i });
    await expect(createBtn, "la page doit afficher l'action de création").toBeVisible({
      timeout: 90_000,
    });

    // Stats : les trois compteurs (Actives / Expirées / Révoquées) sont présents.
    for (const label of ["Actives", "Expirées", "Révoquées"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    // État vide : aucune demande → la section « Demandes » n'apparaît pas.
    await expect(page.getByText("Aucune invitation")).toBeVisible();
    await expect(page.getByText("Demandes", { exact: true })).toHaveCount(0);
  });
});
