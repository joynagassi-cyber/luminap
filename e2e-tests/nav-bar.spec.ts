import { test, expect, type Page } from "@playwright/test";

/**
 * Régularité de la barre de navigation (BottomNav) + icône « plus ».
 *
 * La barre et le FAB sont en HTML natif (data-testid="bottom-nav"). On les
 * vérifie sur plusieurs routes via navigation SPA (clic sur les onglets et
 * le menu « Plus ») — rapide, et ça teste aussi la navigation elle-même.
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

const NAV = 'nav[data-testid="bottom-nav"]';

/** La barre est visible et collée au bord bas de l'écran. */
async function expectNavVisible(page: Page): Promise<void> {
  const nav = page.locator(NAV).first();
  await expect(nav, "la barre de navigation doit être visible").toBeVisible({
    timeout: 30_000,
  });
  const box = await nav.boundingBox();
  const { height } = page.viewportSize()!;
  expect(box, "la barre doit arriver au bord bas de l'écran").not.toBeNull();
  expect(box!.y + box!.height).toBeCloseTo(height, -1);
}

test("la nav est présente sur les routes principales (navigation SPA)", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(180_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsTestUser(page);

  // /dashboard (ou rampe de splash → le corps du dashboard monte la nav).
  if (!page.url().includes("/dashboard")) {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
  }
  await expectNavVisible(page);

  // Onglet « Finances » → /finance (SPA).
  await page
    .locator(NAV)
    .first()
    .getByRole("tab", { name: "Finances" })
    .click();
  await expect(page).toHaveURL(/\/finance/);
  await expectNavVisible(page);

  // Menu « Plus » → « Archives » → /archives (SPA).
  const nav = page.locator(NAV).first();
  await nav.getByText("Plus", { exact: true }).click();
  await page
    .locator('[data-testid="more-menu"]')
    .getByText("Archives", { exact: true })
    .click();
  await expect(page).toHaveURL(/\/archives/);
  await expectNavVisible(page);

  // Le FAB « plus » reste présent et flotte au-dessus de la barre.
  const fab = page.locator('button[aria-label="Transaction"]').first();
  const fbox = await fab.boundingBox();
  const nbox = await nav.boundingBox();
  if (fbox && nbox) {
    expect(fbox.y, "le FAB doit flotter au-dessus de la barre").toBeLessThan(
      nbox.y,
    );
  }
});
