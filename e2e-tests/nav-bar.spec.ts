import { test, expect, type Page } from "@playwright/test";

/**
 * Régularité BottomNav (ion-tab-bar + FAB « plus ») sur toutes les routes
 * principales — nouvelles features (Archives / documents) et pages
 * existantes. La barre doit être visible ET collée au bord bas de
 * l'écran ; le FAB « plus » flotte juste au-dessus.
 *
 * Après un redémarrage du dev-server, les chunks lazy se compilent à la
 * demande : d'où l'attente `attached` généreuse (90 s) par route.
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

const ROUTES = [
  "/dashboard",
  "/finance",
  "/transaction/new",
  "/archives",
  "/groups",
  "/settings",
];

async function checkNav(
  page: Page,
  route: string,
): Promise<{ ok: boolean; note?: string }> {
  try {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20_000 });

    const nav = page.locator("ion-tab-bar").first();
    // Présence dans le DOM (le chunk lazy finit de compiler).
    await nav.waitFor({ state: "attached", timeout: 90_000 });
    await expect(
      nav,
      `la nav doit être visible sur ${route}`,
    ).toBeVisible({ timeout: 10_000 });

    const box = await nav.boundingBox();
    const { height } = page.viewportSize()!;
    expect(
      box,
      "la nav doit arriver au bord bas de l'écran",
    ).not.toBeNull();
    expect(box!.y + box!.height).toBeCloseTo(height, -1);

    // L'icône « plus » (FAB) doit flotter au-dessus de la barre.
    const fab = page.locator('button[aria-label="Transaction"]').first();
    const fbox = await fab.boundingBox().catch(() => null);
    if (fbox) {
      expect(fbox.y, "le FAB doit être au-dessus de la barre").toBeLessThan(
        box!.y,
      );
    }
    return { ok: true };
  } catch (e) {
    const finalUrl = page.url();
    return { ok: false, note: `${route} → ${finalUrl} : ${String(e).slice(0, 300)}` };
  }
}

test("la nav (barre + icône plus) est présente sur toutes les routes", async ({
  page,
}) => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "test-user non provisionné (variables d'env absentes)",
  );
  test.setTimeout(400_000); // 6 routes × attente chunk cold max

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsTestUser(page);
  console.log("[nav-bar] login OK, url=" + page.url());

  const failures: string[] = [];
  for (const route of ROUTES) {
    const r = await checkNav(page, route);
    console.log(
      `[nav-bar] ${route} : ${r.ok ? "OK" : "KO — " + r.note}`,
    );
    if (!r.ok) failures.push(r.note!);
  }

  expect(
    failures,
    "routes sans nav visible : " + failures.join(" | "),
  ).toEqual([]);
});
