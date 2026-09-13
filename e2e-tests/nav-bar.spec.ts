import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * Régularité de la barre de navigation (BottomNav) + navigation SPA.
 *
 * La barre et le FAB sont en HTML natif (data-testid="bottom-nav"). On les
 * vérifie sur plusieurs routes via navigation SPA (clic sur les onglets et
 * le menu « Plus »). Pendant les transitions de route, plusieurs instances
 * de nav peuvent coexister quelques instants ; on cible donc toujours la
 * nav VISIBLE (polling) plutôt que `.first()`.
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

/**
 * Attend qu'au moins une nav soit visible (démarrage à froid lent,
 * transitions de route) et renvoie le locateur de la nav visible.
 */
async function visibleNav(page: Page): Promise<Locator> {
  const all = page.locator(NAV);
  await expect
    .poll(
      async () => {
        const n = await all.count();
        for (let i = 0; i < n; i++) {
          if (await all.nth(i).isVisible()) return true;
        }
        return false;
      },
      { timeout: 45_000, message: "la barre de navigation doit être visible" },
    )
    .toBeTruthy();

  const n = await all.count();
  for (let i = 0; i < n; i++) {
    if (await all.nth(i).isVisible()) return all.nth(i);
  }
  return all.first();
}

/** La nav est visible et collée au bord bas de l'écran. */
async function expectNavVisible(page: Page): Promise<void> {
  const nav = await visibleNav(page);
  const box = await nav.boundingBox();
  const { height } = page.viewportSize()!;
  expect(box, "la nav doit avoir une boîte de rendu").not.toBeNull();
  expect(box!.y + box!.height).toBeCloseTo(height, -1);
}

test("la nav est présente sur les routes principales (navigation SPA)", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  // Budget global généreux : démarrage à froid (login + rampe de splash +
  // montage de la nav) pouvant dépasser 180 s sur un serveur lent.
  test.setTimeout(240_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsTestUser(page);

  // Force le dashboard puis la navigation SPA.
  await page.goto("/dashboard", {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await expectNavVisible(page);

  // Onglet « Finances » → /finance (SPA).
  let nav = await visibleNav(page);
  await nav.getByRole("tab", { name: "Finances" }).click();
  await expect(page).toHaveURL(/\/finance/, { timeout: 45_000 });
  await expectNavVisible(page);

  // Menu « Plus » → « Archives » → /archives (SPA).
  nav = await visibleNav(page);
  await nav.getByText("Plus", { exact: true }).click();
  await page
    .locator('[data-testid="more-menu"]')
    .getByText("Archives", { exact: true })
    .click();
  await expect(page).toHaveURL(/\/archives/, { timeout: 45_000 });
  await expectNavVisible(page);

  // Le FAB reste présent et flotte au-dessus de la barre.
  const fab = page.locator('button[aria-label="Transaction"]').first();
  const fbox = await fab.boundingBox();
  const nbox = (await visibleNav(page)).boundingBox();
  if (fbox && nbox) {
    expect(fbox.y, "le FAB doit flotter au-dessus de la barre").toBeLessThan(
      nbox.y,
    );
  }
});
