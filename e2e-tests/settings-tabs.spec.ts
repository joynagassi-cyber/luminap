import { test, expect, type Page } from "@playwright/test";

/**
 * Page Paramètres en 3 onglets + bascule de thème :
 *  - les 3 onglets (Paramètres / Pratique / Profil) existent et basculent ;
 *  - l'onglet 1 est actif par défaut (contenu existant : #nav-tab-select) ;
 *  - le mode sombre est le défaut sans interaction ;
 *  - la bascule theme-mode-toggle passe dark → light (tokens clairs) puis
 *    revient en dark (tokens sombres).
 *
 * Connexion avec le test-user provisionné (process.env.DYAD_TEST_USER_*).
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

async function loginAsTestUser(page: Page): Promise<void> {
  // addInitScript se ré-exécute à CHAQUE navigation (y compris le reload
  // d'assertion de persistance). On ne peut donc PAS y effacer
  // lumina-theme-mode sans sabotager le test de persistance. On ne « met à
  // plat » le mode qu'au TOUT PREMIER chargement (sessionStorage y survit),
  // ce qui garantit le défaut dark sans toucher le choix persisté au reload.
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "TREASURIER");
    if (!sessionStorage.getItem("__lumina_test_seeded")) {
      sessionStorage.setItem("__lumina_test_seeded", "1");
      localStorage.removeItem("lumina-theme-mode");
    }
  });

  await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL!);
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(dashboard|splash)/, { timeout: 60_000 });
}

// Les valeurs custom property sont rendues telles qu'écrites en CSS
// (minuscules) → on normalise en uppercase pour la comparaison.
const canvasVar = async (page: Page) =>
  (
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--canvas")
        .trim(),
    )
  ).toUpperCase();

test.describe("Paramètres en 3 onglets + thème clair/sombre", () => {
  test("les 3 onglets basculent ; la bascule de thème passe light puis dark", async ({
    page,
  }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "test-user non provisionné (variables d'env absentes)",
    );
    test.setTimeout(180_000);

    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);

    await page.goto("/settings", { waitUntil: "domcontentloaded", timeout: 20_000 });

    // Sombre par défaut, sans interaction.
    await expect(page.locator("html[data-theme='dark']")).toHaveCount(1);
    expect(await canvasVar(page)).toBe("#121212");

    // Les 3 onglets existent ; l'onglet 1 est actif par défaut.
    const tabs = page.locator('[data-testid="settings-tabs"] [role="tab"]');
    await expect(tabs).toHaveCount(3);
    await expect(page.getByTestId("tab-parameters")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Onglet 1 — le réglage features & navigation est ici (testid existant).
    await expect(page.locator("#nav-tab-select")).toBeVisible({
      timeout: 30_000,
    });

    // Onglet 2 « Pratique » — raccourcis + actions.
    await page.getByTestId("tab-practical").click();
    await expect(
      page.getByRole("button", { name: "Voir le bilan financier" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nouveau versement" }),
    ).toBeVisible();
    // Le contenu de l'onglet 1 n'est plus affiché.
    await expect(page.locator("#nav-tab-select")).toHaveCount(0);

    // Onglet 3 « Profil » — profil + stats + déconnexion.
    await page.getByTestId("tab-profile").click();
    await expect(
      page.getByRole("button", { name: "Se déconnecter" }),
    ).toBeVisible();

    // Bascule de thème (onglet Paramètres) : dark → light.
    await page.getByTestId("tab-parameters").click();
    const toggle = page.getByTestId("theme-mode-toggle");
    await toggle.click();

    await expect(page.locator("html[data-theme='light']")).toHaveCount(1);
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(await canvasVar(page)).toBe("#F5F6F8");

    // Les surfaces deviennent claires (cartes blanches, fond canvas clair).
    await expect(page.locator("html[data-theme='light']")).toHaveCount(1);

    // Persistance du choix : le mode survit à une rechargement.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html[data-theme='light']")).toHaveCount(1);

    // Retour en sombre.
    await page.getByTestId("tab-parameters").click();
    await page.getByTestId("theme-mode-toggle").click();
    await expect(page.locator("html[data-theme='dark']")).toHaveCount(1);
    expect(await canvasVar(page)).toBe("#121212");
    await expect(page.getByTestId("theme-mode-toggle")).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
