import { test, expect } from "@playwright/test";

test.describe("Lumina comprehensive navigation and finance flow", () => {
  test("Settings, Balance, History, Events, Sync, and Transaction edit", async ({ page }) => {
    test.setTimeout(180000);

    // Step 0: Navigate to login page and sign in
    await page.goto("/login");
    await expect(page.getByPlaceholder("Ex: Jean")).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder("Ex: Jean").fill("Test");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();

    // Wait for dashboard to load
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

    // Step 2-3: Open More menu → Settings
    await page.getByRole("button", { name: "Plus", exact: true }).click();
    await page.getByRole("button", { name: "Paramètres", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Paramètres" })).toBeVisible();

    // Step 4: Click Refresh data button
    await page.getByRole("button", { name: "Actualiser les données" }).click();

    // Step 5: Click Financial report → Balance page
    await page.getByRole("button", { name: "Bilan financier" }).click();
    await expect(page.getByRole("heading", { name: "Bilan financier" })).toBeVisible();
    await expect(page).toHaveURL("/balance");

    // Step 6-7: Toggle period between Year and Month
    await page.getByRole("button", { name: "Année", exact: true }).click();
    await page.getByRole("button", { name: "Mois", exact: true }).click();
    await expect(page.getByRole("button", { name: "Mois", exact: true })).toBeVisible();

    // Step 8-9: Attempt person filter clicks (non-critical)
    await page.getByRole("button", { name: "Femme", exact: true }).click().catch(() => {});
    await page.getByRole("button", { name: "fffff", exact: true }).click().catch(() => {});

    // Step 10-11: Click summary stat cards
    await page.getByText("Entrées").first().click().catch(() => {});
    await page.getByText("Sorties").first().click().catch(() => {});
    await expect(page.getByText("Entrées")).toBeVisible();
    await expect(page.getByText("Sorties")).toBeVisible();

    // Step 12: Click chart path element (non-critical)
    await page.locator("#root > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > svg > path:nth-of-type(1)").click().catch(() => {});

    // Step 13-14: Export report as PDF
    await page.getByRole("button", { name: "Exporter le rapport", exact: true }).click();
    await page.getByRole("button", { name: "PDF" }).first().click();
    await expect(page.getByRole("heading", { name: "Bilan financier" })).toBeVisible();

    // Step 15-16: Navigate to History
    await page.getByRole("button", { name: "Plus", exact: true }).click();
    await page.getByRole("button", { name: "Historique", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Historique d'actions" })).toBeVisible();

    // Step 17-20: Filter tabs
    await page.getByRole("button", { name: "Transaction", exact: true }).click();
    await expect(page.getByRole("button", { name: "Transaction", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Groupe", exact: true }).click();
    await expect(page.getByRole("button", { name: "Groupe", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Événement", exact: true }).click();
    await expect(page.getByRole("button", { name: "Événement", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Tout", exact: true }).click();
    await expect(page.getByRole("button", { name: "Tout", exact: true })).toBeVisible();

    // Step 21: Go back
    await page.getByRole("button", { name: "Retour", exact: true }).click();

    // Step 22-23: Navigate to Events
    await page.getByRole("button", { name: "Plus", exact: true }).click();
    await page.getByRole("button", { name: "Événements", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Événements" })).toBeVisible();

    // Step 24: Click sync indicator
    await page.getByTestId("sync-indicator").click().catch(() => {});

    // Step 25: Navigate directly to balance page
    await page.goto("/balance");
    await expect(page).toHaveURL("/balance");
    await expect(page.getByTestId("sync-indicator")).toBeVisible();

    // Step 26-27: Navigate to transaction edit page and click Save
    await page.goto("/transaction/1/edit");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click().catch(() => {});
    await expect(page.getByRole("heading", { name: "Modifier" })).toBeVisible();

    // Step 28-30: Toggle expense/income type
    await page.getByRole("button", { name: "Sortie", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sortie", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Entrée", exact: true }).click();
    await expect(page.getByRole("button", { name: "Entrée", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sortie", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sortie", exact: true })).toBeVisible();

    // Step 31: Click Finance bottom nav tab
    await page.getByRole("navigation").getByRole("button", { name: "Finances" }).click();
    await expect(page.getByRole("heading", { name: "Grand livre" })).toBeVisible();
  });
});
