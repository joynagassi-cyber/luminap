import { test, expect, type Page } from "@playwright/test";

/**
 * Nav bar configurée dynamiquement (non hardcodée) : l'utilisateur compose
 * sa liste d'onglets (retrait, ajout, réordonnancement — min 1, max 4) et
 * active/désactive les features du menu « Plus » — depuis Settings →
 * « Features & navigation ».
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

test("composer la nav bar et les features depuis les paramètres", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(200_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsTestUser(page);

  // Force la page cible (le login peut laisser la rampe de splash ouverte).
  await page.goto("/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  const nav = page.locator('nav[data-testid="bottom-nav"]').first();
  await nav.waitFor({ state: "attached", timeout: 90_000 });

  // La barre est en HTML natif (boutons role=tab) : filtre par texte direct.
  const tab = (label: string) =>
    nav.locator('[role="tab"]').filter({ hasText: label });
  const moreMenu = page.locator('[data-testid="more-menu"]');
  // Le bouton « Plus » (bouton natif) : on clique sur son libellé visible.
  const plusToggle = nav.getByText("Plus", { exact: true });

  // Réglage par défaut : « Groupes » et « Cultes » sont dans la barre.
  await expect(tab("Groupes")).toBeVisible();
  await expect(tab("Cultes")).toBeVisible();

  // Settings → section « Features & navigation ».
  await page.goto("/settings", { waitUntil: "domcontentloaded", timeout: 20_000 });
  const addSelect = page.locator("#nav-tab-select");
  await expect(addSelect, "la section features doit être visible").toBeVisible({
    timeout: 90_000,
  });

  // 1) Retirer « Cultes » de la barre : le tab disparaît immédiatement.
  await page.getByRole("button", { name: "Retirer Cultes" }).click();
  await expect(tab("Cultes")).toHaveCount(0);

  // 2) Ajouter « Membres » : le tab apparaît dans la barre.
  await addSelect.selectOption({ label: "Membres" });
  await expect(tab("Membres")).toBeVisible();

  // 3) « Membres » est dans la barre : il n'apparaît plus dans le menu « Plus ».
  await plusToggle.click();
  await expect(moreMenu.getByText("Membres", { exact: true })).toHaveCount(0);
  await plusToggle.click();

  // 4) Désactiver « Archives » : elle quitte le menu « Plus ».
  await page.getByRole("switch", { name: "Afficher Archives" }).click();
  await plusToggle.click();
  await expect(moreMenu.getByText("Archives", { exact: true })).toHaveCount(0);
  await plusToggle.click();

  // 5) Réordonner : « Groupes » descend derrière « Membres ».
  await page.getByRole("button", { name: "Descendre Groupes" }).click();
  await expect(page.locator('[data-testid="nav-tab-item"]')).toHaveText([
    "Accueil",
    "Finances",
    "Membres",
    "Groupes",
  ]);

  // 6) Restaurer les réglages par défaut : « Cultes » revient, « Archives »
  //    réapparaît dans le menu « Plus ».
  await page
    .locator('button[aria-label="Restaurer les features par défaut"]')
    .click();
  await expect(tab("Cultes")).toBeVisible();
  await expect(tab("Membres")).toHaveCount(0);
  await plusToggle.click();
  await expect(moreMenu.getByText("Archives", { exact: true })).toBeVisible();
});
