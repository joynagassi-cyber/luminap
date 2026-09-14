import { test, expect, type Page } from "@playwright/test";

/**
 * Arborescence fédérative — diagramme React Flow (/admin/federation/tree).
 *
 * Fume de charge : la page se rend sans crash (écran « Impossible
 * d'afficher cette page » absent) et expose le titre + l'action de retour.
 * Les assertions sont déterministes quel que soit le nombre d'organisations
 * visibles pour l'utilisateur (état vide → message dédié, sinon diagramme).
 */

const TEST_EMAIL = process.env.DYAD_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DYAD_TEST_USER_PASSWORD;

async function openApp(page: Page): Promise<void> {
  // Bypasse l'onboarding local pour tomber directement sur le contenu.
  await page.addInitScript(() => {
    localStorage.setItem("lumina-onboarded", "true");
    localStorage.setItem("lumina-role", "CENTRAL_ADMIN");
  });

  if (TEST_EMAIL && TEST_PASSWORD) {
    await page.goto("/auth", { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.getByPlaceholder("jean@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/(dashboard|splash)/, { timeout: 60_000 });
  }
}

test.describe("Arborescence fédérative (diagramme)", () => {
  test("la page se rend sans crash et expose le titre + retour", async ({
    page,
  }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "test-user non provisionné (variables d'env absentes)",
    );
    test.setTimeout(200_000);
    await page.setViewportSize({ width: 390, height: 844 });

    await openApp(page);
    await page.goto("/admin/federation/tree", {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    // Pas d'écran de crash (boundary LazyRoute).
    await expect(page.getByText("Impossible d'afficher cette page")).toHaveCount(0);

    // Le titre de section + l'action de retour vers la gestion.
    const title = page.getByText("Arborescence des organisations");
    await expect(title, "le titre de l'arborescence").toBeVisible({
      timeout: 90_000,
    });
    const back = page.getByRole("button", { name: "Gérer la fédération" });
    await expect(back, "l'action de retour").toBeVisible();

    // Le conteneur du diagramme est présent (état vide inclus).
    await expect(page.getByTestId("federation-tree")).toBeVisible();
  });
});
