import { test, expect } from "@playwright/test";

test("dashboard to finance nav works", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder("Ex: Jean")).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder("Ex: Jean").fill("Test");
  await page.getByRole("button", { name: "Trésorier", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  // Role selection page
  await expect(page.getByRole("heading", { name: "Choisissez votre rôle" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Trésorier" }).click();

  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 15000 });

  // Click Finance bottom nav tab
  await page.getByRole("navigation").getByRole("button", { name: "Finances" }).click();
  await expect(page.getByRole("heading", { name: "Grand livre" })).toBeVisible();
});
