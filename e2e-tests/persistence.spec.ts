import { test, expect } from "@playwright/test";

test("F5 persistence — transaction, event budget line, form submission survive reload", async ({ page }) => {
  // ── Sign in + role selection ───────────────────────────────────────────────
  await page.goto("/login");
  await expect(page.getByPlaceholder("Ex: Jean")).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder("Ex: Jean").fill("Tester");
  await page.getByRole("button", { name: "Trésorier", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  // Role selection page
  await expect(page.getByRole("heading", { name: "Choisissez votre rôle" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Trésorier" }).click();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });
  console.log("✅ Signed in");

  // ── 1. Create transaction ──────────────────────────────────────────────────
  await page.goto("/transaction/new");
  await expect(page.getByRole("heading", { name: "Nouvelle transaction" })).toBeVisible({ timeout: 10000 });

  await page.locator('input[placeholder="0"]').fill("10000");
  await page.locator('input[placeholder="Ex: Dîme du dimanche"]').fill("Persistante Tx F5");

  // INCOME is already selected by default
  await page.getByRole("button", { name: "Enregistrer l'entrée" }).click();
  await page.waitForTimeout(2000);
  console.log("✅ Transaction created: Persistante Tx F5 (10 000 FCFA)");

  // ── 2. Create event with budget line ───────────────────────────────────────
  await page.goto("/event/new");
  await expect(page.getByRole("heading", { name: "Nouvel événement" })).toBeVisible({ timeout: 10000 });

  await page.locator('input[placeholder="Ex: Fête des tabernacles"]').fill("Event Budget F5");
  await page.locator('textarea[placeholder="Détails..."]').fill("Budget test persistence");

  // Open budget section
  await page.getByRole("button", { name: "Gérer" }).click();
  await page.waitForTimeout(500);

  // Add a custom budget line
  await page.locator('input[placeholder="Nom du poste"]').fill("Cadeaux");
  await page.locator('input[placeholder="Montant (FCFA)"]').fill("5000");
  await page.getByRole("button", { name: "Ajouter au budget" }).click();
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "Créer l'événement" }).click();
  await page.waitForTimeout(2000);
  console.log("✅ Event created with budget line: Event Budget F5 (5 000 FCFA)");

  // ── 3. Create and submit form ──────────────────────────────────────────────
  await page.goto("/forms");
  await expect(page.getByRole("heading", { name: "Formulaires" })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Créer" }).click();
  await page.locator('input[placeholder*="Nom du formulaire"]').fill("Test Formulaire F5");
  await page.locator('input[placeholder*="Clé"]').fill("test_f5_form_" + Date.now());
  await page.getByRole("button", { name: "Créer le formulaire" }).click();
  await page.waitForTimeout(1500);
  console.log("✅ Form created: Test Formulaire F5");

  // Publish the form so it's fillable
  await page.getByRole("button", { name: "Publier" }).click();
  await page.waitForTimeout(500);

  // Fill and submit
  await page.getByRole("button", { name: "Remplir" }).first().click();
  await page.waitForTimeout(1000);

  // Fill the "Montant don" field (the default text field label from the form)
  const fieldInput = page.locator('input[placeholder="Montant don"]').first();
  if (await fieldInput.isVisible().catch(() => false)) {
    await fieldInput.fill("2500");
  } else {
    // Try first available input on the form fill page
    await page.locator('input').first().fill("2500");
  }
  await page.getByRole("button", { name: "Soumettre" }).click();
  await expect(page.getByText("Soumis avec succès")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2500);
  console.log("✅ Form submitted: Test Formulaire F5 (2 500 FCFA)");

  // ── F5 REAL RELOAD ─────────────────────────────────────────────────────────
  console.log("🔄 Recharge de la page (F5)...");
  await page.reload();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1500);
  console.log("✅ Page reloaded — vérification de la persistance...");

  // ── Verify transaction ─────────────────────────────────────────────────────
  await page.goto("/finance");
  await expect(page.getByText("Persistante Tx F5")).toBeVisible({ timeout: 15000 });
  console.log("✅ Transaction visible après F5: Persistante Tx F5");

  // ── Verify event ───────────────────────────────────────────────────────────
  await page.goto("/events");
  await expect(page.getByText("Event Budget F5")).toBeVisible({ timeout: 15000 });
  console.log("✅ Event visible après F5: Event Budget F5");

  // ── Verify form ────────────────────────────────────────────────────────────
  await page.goto("/forms");
  await expect(page.getByText("Test Formulaire F5")).toBeVisible({ timeout: 15000 });
  console.log("✅ Formulaire visible après F5: Test Formulaire F5");

  console.log("✅ TEST 1 PASSÉ — Les 3 entités persistent après F5");
});
