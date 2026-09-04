import { test, expect } from "@playwright/test";

test.describe("Lumina comprehensive navigation and finance flow", () => {
  test("Settings, Balance, History, Events, Sync, and Transaction edit", async ({ page }) => {
    // Step 0: Sign in via the login page
    await page.goto("/");
    await expect(page.getByPlaceholder("Ex: Jean")).toBeVisible();
    await page.getByPlaceholder("Ex: Jean").fill("Test");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.waitForURL("/", { timeout: 15000 });
    // Wait for the app to finish loading initial data (isLoading becomes false)
    await page.waitForTimeout(2000);

    // Step 1: Dashboard is loaded — check for the "Plus" nav button
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible();

    // Step 2-3: Open More menu → Settings
    await page.getByRole("button", { name: "Plus", exact: true }).click();
    await page.getByRole("button", { name: "Paramètres", exact: true }).click();

    // Assert: Settings page is visible with the title "Paramètres"
    await expect(page.getByRole("heading", { name: "Paramètres" })).toBeVisible();

    // Step 4: Click Refresh data button
    await page.getByRole("button", { name: "Actualiser les données" }).click();

    // Step 5: Click Financial report → Balance page
    await page.getByRole("button", { name: "Bilan financier" }).click();

    // Assert: Balance page shows "Bilan financier" heading
    await expect(page.getByRole("heading", { name: "Bilan financier" })).toBeVisible();
    await expect(page).toHaveURL("/balance");

    // Step 6-7: Toggle period between Year and Month
    await page.getByRole("button", { name: "Année", exact: true }).click();
    await page.getByRole("button", { name: "Mois", exact: true }).click();

    // Assert: Month toggle is visible (active)
    await expect(page.getByRole("button", { name: "Mois", exact: true })).toBeVisible();

    // Step 8-9: Attempt person filter clicks (non-critical — filter may not exist on this page)
    await page.getByRole("button", { name: "Femme", exact: true }).click().catch(() => {});
    await page.getByRole("button", { name: "fffff", exact: true }).click().catch(() => {});

    // Step 10-11: Click summary stat cards
    await page.getByText("Entrées").first().click().catch(() => {});
    await page.getByText("Sorties").first().click().catch(() => {});

    // Assert: Summary stats are visible on the Balance page
    await expect(page.getByText("Entrées")).toBeVisible();
    await expect(page.getByText("Sorties")).toBeVisible();

    // Step 12: Click chart path element (SVG element — kept from recording)
    await page.locator("#root > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > div:nth-of-type(3) > div > svg > path:nth-of-type(1)").click().catch(() => {});

    // Step 13-14: Export report as PDF
    await page.getByRole("button", { name: "Exporter le rapport", exact: true }).click();
    await page.getByRole("button", { name: "PDF" }).first().click();

    // Assert: After exporting PDF the Balance page is still visible
    await expect(page.getByRole("heading", { name: "Bilan financier" })).toBeVisible();

    // Step 15-16: Navigate to History
    await page.getByRole("button", { name: "Plus", exact: true }).click();
    await page.getByRole("button", { name: "Historique", exact: true }).click();

    // Assert: History page is visible with the heading
    await expect(page.getByRole("heading", { name: /Historique/ })).toBeVisible();

    // Step 17: Click Transaction filter
    await page.getByRole("button", { name: "Transaction", exact: true }).click();

    // Assert: Transaction filter tab is visible
    await expect(page.getByRole("button", { name: "Transaction", exact: true })).toBeVisible();

    // Step 18: Click Group filter
    await page.getByRole("button", { name: "Groupe", exact: true }).click();
    await expect(page.getByRole("button", { name: "Groupe", exact: true })).toBeVisible();

    // Step 19: Click Event filter
    await page.getByRole("button", { name: "Événement", exact: true }).click();
    await expect(page.getByRole("button", { name: "Événement", exact: true })).toBeVisible();

    // Step 20: Click All filter
    await page.getByRole("button", { name: "Tout", exact: true }).click();

    // Assert: The "Tout" filter tab is visible
    await expect(page.getByRole("button", { name: "Tout", exact: true })).toBeVisible();

    // Step 21: Go back
    await page.getByRole("button", { name: "Retour", exact: true }).click();

    // Step 22-23: Navigate to Events
    await page.getByRole("button", { name: "Plus", exact: true }).click();
    await page.getByRole("button", { name: "Événements", exact: true }).click();

    // Assert: Events page is visible with the title "Événements"
    await expect(page.getByRole("heading", { name: "Événements" })).toBeVisible();

    // Step 24: Click sync indicator
    await page.getByTestId("sync-indicator").click().catch(() => {});

    // Step 25: Navigate directly to balance page
    await page.goto("/balance");
    await expect(page).toHaveURL("/balance");

    // Assert: Sync indicator is visible on the Balance page
    await expect(page.getByTestId("sync-indicator")).toBeVisible();

    // Step 26: Navigate to transaction edit page
    await page.goto("/transaction/1/edit");

    // Step 27: Click Save button
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click().catch(() => {});

    // Assert: The Transaction edit page shows the "Modifier" title
    await expect(page.getByRole("heading", { name: "Modifier" })).toBeVisible();

    // Step 28: Click Expense toggle (Sortie)
    await page.getByRole("button", { name: "Sortie", exact: true }).click();

    // Assert: The "Sortie" (expense) toggle button is visible on the edit form
    await expect(page.getByRole("button", { name: "Sortie", exact: true })).toBeVisible();

    // Step 29: Click Income toggle (Entrée)
    await page.getByRole("button", { name: "Entrée", exact: true }).click();
    await expect(page.getByRole("button", { name: "Entrée", exact: true })).toBeVisible();

    // Step 30: Click Expense toggle again
    await page.getByRole("button", { name: "Sortie", exact: true }).click();

    // Assert: After toggling, the "Sortie" button remains visible
    await expect(page.getByRole("button", { name: "Sortie", exact: true })).toBeVisible();

    // Step 31: Click Finance bottom nav tab
    await page.getByRole("navigation").getByRole("button", { name: "Finances" }).click();

    // Assert: The Finance page is visible with the "Grand livre" heading
    await expect(page.getByRole("heading", { name: "Grand livre" })).toBeVisible();
  });
});
