import { test, expect, type Page } from "@playwright/test";

/**
 * Régularité UI post-fix :
 *  1. la nav bar (ion-tab-bar) est visible et collée en bas du viewport ;
 *  2. le header est unique (un seul ion-header) et tous ses boutons sont
 *     labellisés (plus de bandeau « vide » ni de boutons inexpliqués).
 *
 * Connexion avec le test-user provisionné (process.env.DYAD_TEST_USER_*).
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

async function loginAsTestUser(page: Page): Promise<void> {
  // Short-circuit de l'onboarding (legacy flags lus par AuthPage).
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "TREASURIER");
  });

  await page.goto("/auth");
  await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL!);
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(dashboard|splash)/, { timeout: 60_000 });
}

test.describe("Régularité nav bar + header", () => {
  test("la nav bar est visible et en bas de l'écran", async ({ page }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "test-user non provisionné (variables d'env absentes)",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/dashboard");

    const nav = page.locator('nav[data-testid="bottom-nav"]').first();
    await expect(nav).toBeVisible({ timeout: 20_000 });

    // Collé en bas du viewport (pas décalé sous le pli).
    const box = await nav.boundingBox();
    const { height } = page.viewportSize()!;
    expect(
      box,
      "la nav doit arriver au bord bas de l'écran",
    ).not.toBeNull();
    expect(box!.y + box!.height).toBeCloseTo(height, -1);
  });

  test("le header est unique et tous ses boutons sont labellisés", async ({
    page,
  }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "test-user non provisionné (variables d'env absentes)",
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsTestUser(page);
    await page.goto("/dashboard");

    // Attendre que le corps du dashboard soit monté (la nav n'existe que dans
    // le rendu principal, pas dans la rampe de splash).
    await expect(
      page.locator('nav[data-testid="bottom-nav"]'),
    ).toBeVisible({ timeout: 20_000 });

    const headers = page.locator("ion-header");
    const headerCount = await headers.count();

    const buttons = await page
      .locator("ion-header button, ion-header ion-button")
      .evaluateAll((els) =>
        els.map((el) => ({
          text: (el.textContent || "").trim(),
          ariaLabel: el.getAttribute("aria-label"),
          hasIcon: !!el.querySelector("svg, ion-icon, img"),
        })),
      );

    expect(
      headerCount,
      `le dashboard doit avoir un seul header, détectés: ${headerCount}`,
    ).toBe(1);

    const unlabeled = buttons.filter(
      (b) => !b.ariaLabel && !b.text && !b.hasIcon,
    );
    expect(
      unlabeled.length,
      `boutons non labellisés: ${JSON.stringify(unlabeled, null, 2)}`,
    ).toBe(0);
  });
});
