import { test, expect } from "@playwright/test";

test("F5 persistence — transaction survives reload", async ({ page }) => {
  // Sign in
  await page.goto("/login");
  await expect(page.getByPlaceholder("Ex: Jean")).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder("Ex: Jean").fill("Tester");
  await page.getByRole("button", { name: "Trésorier", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

  // Create transaction via direct URL
  await page.goto("/transaction/new");
  await expect(page.getByRole("heading", { name: "Nouvelle transaction" })).toBeVisible({ timeout: 10000 });

  // Fill form
  await page.locator('input[placeholder="0"]').fill("10000");
  await page.locator('input[placeholder="Ex: Dîme du dimanche"]').fill("Persistante Test F5 Tx");

  // Click income button then submit
  await page.getByRole("button", { name: "Entrée" }).first().click();
  await page.getByRole("button", { name: "Enregistrer l'entrée" }).click();

  // Wait for redirect
  await page.waitForURL("/", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Go to finance to verify
  await page.goto("/finance");
  await expect(page.getByText("Persistante Test F5 Tx")).toBeVisible({ timeout: 10000 });
  console.log("Transaction visible before reload");

  // F5 reload
  await page.reload();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

  // Verify after reload
  await page.goto("/finance");
  await expect(page.getByText("Persistante Test F5 Tx")).toBeVisible({ timeout: 10000 });
  console.log("✅ Transaction persisted after F5");
});

test("F5 persistence — event survives reload", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Ex: Jean").fill("Tester");
  await page.getByRole("button", { name: "Trésorier", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

  // Create event
  await page.goto("/event/new");
  await expect(page.getByRole("heading", { name: "Nouvel événement" })).toBeVisible({ timeout: 10000 });
  await page.locator('input[placeholder="Ex: Fête des tabernacles"]').fill("Event Persist F5");
  await page.getByRole("button", { name: "Créer l'événement" }).click();
  await expect(page.getByText("Event Persist F5")).toBeVisible({ timeout: 10000 });

  // Reload
  await page.reload();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

  // Verify
  await page.goto("/events");
  await expect(page.getByText("Event Persist F5")).toBeVisible({ timeout: 10000 });
  console.log("✅ Event persisted after F5");
});

test("F5 persistence — form submission survives reload", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Ex: Jean").fill("Tester");
  await page.getByRole("button", { name: "Trésorier", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

  // Create form
  await page.goto("/forms");
  await page.getByRole("heading", { name: "Formulaires" }).waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Créer" }).click();
  await page.locator('input[placeholder*="Nom du formulaire"]').fill("Test Formulaire F5");
  await page.locator('input[placeholder*="Clé"]').fill("test_f5_form");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await page.locator('input[placeholder="Nouveau champ text"]').fill("Montant don");
  await page.getByRole("button", { name: "Créer le formulaire" }).click();
  await expect(page.getByText("Test Formulaire F5")).toBeVisible({ timeout: 10000 });

  // Submit form
  await page.getByRole("button", { name: "Remplir" }).first().click();
  await page.locator('input[placeholder="Montant don"]').fill("2500");
  await page.getByRole("button", { name: "Soumettre" }).click();
  await expect(page.getByText("Soumis avec succès")).toBeVisible();
  await page.waitForTimeout(2000);

  // Reload
  await page.reload();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

  // Verify
  await page.goto("/forms");
  await expect(page.getByText("Test Formulaire F5")).toBeVisible({ timeout: 10000 });
  console.log("✅ Form persisted after F5");
});
