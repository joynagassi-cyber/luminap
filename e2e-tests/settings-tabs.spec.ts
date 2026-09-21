import { test, expect, type Page } from "@playwright/test";

/**
 * Page Paramètres — hub de cartes + sous-pages :
 *  - /settings liste les options (cartes) : chaque option ouvre SA page ;
 *  - « Thème & apparence » (/settings/theme) : la bascule theme-mode-toggle
 *    passe dark → light (tokens clairs) puis revient en dark (tokens
 *    sombres), avec persistance au rechargement ;
 *  - « Profil » (/settings/profil) : bouton de déconnexion.
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

  // 120 s : absorber le démarrage à froid (re-optimisation Vite) de la
  // première navigation, comme les autres specs (convention 240 s).
  await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 120_000 });
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

test.describe("Page Paramètres — hub + sous-pages (thème, profil)", () => {
  test("le hub liste les options ; le thème et le profil sont configurables", async ({
    page,
  }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "test-user non provisionné (variables d'env absentes)",
    );
    test.setTimeout(300_000);

    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);

    // 1) Hub — la liste de cartes d'options (60 s : routeur Ionic + DB isolé
    //    sur un serveur en charge).
    await page.goto("/settings", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page.getByTestId("settings-opt-theme")).toBeVisible();
    await expect(page.getByTestId("settings-opt-profil")).toBeVisible();
    await expect(page.getByTestId("settings-opt-about")).toBeVisible();

    // 2) Sous-page « Thème & apparence » : dark → light puis retour dark.
    await page.getByTestId("settings-opt-theme").click();
    const toggle = page.getByTestId("theme-mode-toggle");
    await expect(toggle).toBeVisible({ timeout: 30_000 });

    // Sombre par défaut, sans interaction.
    await expect(page.locator("html[data-theme='dark']")).toHaveCount(1);
    expect(await canvasVar(page)).toBe("#121212");

    // Bascule dark → light (tokens clairs).
    await toggle.click();
    await expect(page.locator("html[data-theme='light']")).toHaveCount(1);
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(await canvasVar(page)).toBe("#F5F6F8");

    // Persistance du choix : le mode survit à un rechargement (deep link).
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html[data-theme='light']")).toHaveCount(1);

    // Retour en sombre.
    await page.getByTestId("theme-mode-toggle").click();
    await expect(page.locator("html[data-theme='dark']")).toHaveCount(1);
    expect(await canvasVar(page)).toBe("#121212");
    await expect(page.getByTestId("theme-mode-toggle")).toHaveAttribute(
      "aria-checked",
      "false",
    );

    // 3) Sous-page « Profil » : le bouton de déconnexion existe.
    await page.goto("/settings", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("settings-opt-profil").click();
    await expect(
      page.getByRole("button", { name: "Se déconnecter" }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
