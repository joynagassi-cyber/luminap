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

  // 180 s : un démarrage à froid (re-optimisation des dépendances Vite,
  // qui bloque la première navigation) peut prendre plusieurs minutes ;
  // le budget global du test reste de 360 s.
  await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 180_000 });
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
  // 360 s : couvre le démarrage + les 3 navigations SPA (Finances /
  // Accueil / Archives) dont la dernière a été ajoutée (régression Accueil).
  test.setTimeout(360_000);

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

  // Régression : l'onglet « Accueil » mène directement à /dashboard,
  // et non à /splash (le /splash noir de chargement). Depuis /finance,
  // cliquer « Accueil » doit donc ramener sur /dashboard.
  nav = await visibleNav(page);
  await nav.getByRole("tab", { name: "Accueil" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 45_000 });
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
  const nbox = await (await visibleNav(page)).boundingBox();
  if (fbox && nbox) {
    expect(fbox.y, "le FAB doit flotter au-dessus de la barre").toBeLessThan(
      nbox.y,
    );
  }
});

test("état persisté corrompu : la nav retombe sur les onglets par défaut et le menu « Plus » reste actionnable", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(360_000);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsTestUser(page);

  // Premier passage en état propre : l'app persiste `lumina-features`
  // (navTabs + visible) dans le localStorage du navigateur.
  await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await visibleNav(page);

  const persisted = await page.evaluate(() =>
    localStorage.getItem("lumina-features"),
  );
  if (persisted) {
    // Corrompt le réglage : onglets inconnus (obsolètes) + toutes les
    // features désactivées. Un rechargement doit retrouver une barre
    // utilisable (défauts) et un « Plus » qui ne reste pas mort.
    await page.evaluate((raw) => {
      const obj = JSON.parse(raw) as {
        navTabs?: string[];
        visible?: Record<string, boolean>;
      };
      const allOff: Record<string, boolean> = {};
      for (const k in obj.visible) allOff[k] = false;
      localStorage.setItem(
        "lumina-features",
        JSON.stringify({ navTabs: ["unknown-legacy-tab"], visible: allOff }),
      );
    }, persisted);
  }

  // Rechargement complet : le réglage corrompu est relu au démarrage.
  await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const nav = await visibleNav(page);

  // 1) Barre retombée sur les onglets valides par défaut (pas une barre vide).
  await expect(nav.getByRole("tab", { name: "Accueil" })).toBeVisible();
  await expect(nav.getByRole("tab", { name: "Finances" })).toBeVisible();

  // 2) Menu « Plus » vide → item actionnable vers Paramètres (jamais d'écran mort).
  await nav.getByText("Plus", { exact: true }).click();
  const menu = page.locator('[data-testid="more-menu"]');
  await expect(menu.getByText(/Aucune feature activée/)).toBeVisible();
  await menu
    .getByRole("button", { name: "Gérer les features dans Paramètres" })
    .click();
  await expect(page).toHaveURL(/\/settings/, { timeout: 45_000 });
});
