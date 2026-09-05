import { test, expect } from "@playwright/test";

test("cloud sync — account and custom field reach Supabase", async ({ page }) => {
  const now = Date.now();
  const accountName = "TestSync Account " + now;
  const cfLabel = "TestSync Custom Field " + now;
  const cfKey = "test_sync_cf_" + now;

  // ── Block Supabase requests to simulate offline ────────────────────────────
  await page.route("**/hhgovvrnalibhgpakswi.supabase.co/**", route => route.abort("networkerror"));
  console.log("✅ Supabase bloqué — mode hors ligne activé");

  // ── Sign in + role selection ───────────────────────────────────────────────
  await page.goto("/login");
  await expect(page.getByPlaceholder("Ex: Jean")).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder("Ex: Jean").fill("TestSync" + now);
  await page.getByRole("button", { name: "Trésorier", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Choisissez votre rôle" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Trésorier" }).click();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });
  console.log("✅ Connecté (hors ligne)");

  // ── Create group (account) ─────────────────────────────────────────────────
  await page.goto("/groups");
  await expect(page.getByRole("heading", { name: "Groupes" })).toBeVisible({ timeout: 10000 });

  const createBtn = page.getByRole("button", { name: "Créer" });
  await expect(createBtn).toBeVisible();
  await createBtn.click();
  await page.waitForTimeout(500);

  // Fill group name in the modal
  await page.locator('input[placeholder*="groupe|nom"]').first().fill(accountName);
  await page.getByRole("button", { name: /créer le groupe/i }).click();
  await page.waitForTimeout(1500);
  console.log("✅ Compte créé hors ligne: " + accountName);

  // ── Create custom field ────────────────────────────────────────────────────
  await page.goto("/custom-fields");
  await expect(page.getByRole("heading", { name: "Champs personnalisés" })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Créer" }).click();
  await page.waitForTimeout(500);

  // Fill label
  const labelInput = page.locator('input[placeholder*="Label|montant_estime|ex"]').first();
  if (await labelInput.isVisible().catch(() => false)) {
    await labelInput.fill(cfLabel);
  } else {
    await page.locator('.fixed input').first().fill(cfLabel);
  }
  // Fill key
  const keyInput = page.locator('input[placeholder*="montant_estime|clé"]').first();
  if (await keyInput.isVisible().catch(() => false)) {
    await keyInput.fill(cfKey);
  } else {
    await page.locator('.fixed input').nth(1).fill(cfKey);
  }

  await page.getByRole("button", { name: /créer le champ/i }).click();
  await page.waitForTimeout(1500);
  console.log("✅ Champ personnalisé créé hors ligne: " + cfLabel);

  // ── Come back online ───────────────────────────────────────────────────────
  await page.unroute("**/hhgovvrnalibhgpakswi.supabase.co/**");
  console.log("✅ Supabase débloqué — mode en ligne activé");

  // ── Wait for sync cycle (sync runs every 30s) ──────────────────────────────
  console.log("⏳ En attente de la synchronisation cloud (35s)...");
  await page.waitForTimeout(35000);

  // ── Query Supabase directly from the browser ───────────────────────────────
  console.log("🔍 Interrogation de Supabase...");
  const results = await page.evaluate(async ({ name, key }) => {
    const { supabase } = await import("/src/integrations/supabase/client.ts");

    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, name, owner_type, status")
      .eq("name", name)
      .limit(5);

    const { data: cfs, error: cfError } = await supabase
      .from("custom_field_definitions")
      .select("id, label, key, entity_type")
      .eq("key", key)
      .limit(5);

    return {
      accounts: accounts ?? [],
      accountsError: accountsError?.message ?? null,
      customFields: cfs ?? [],
      cfError: cfError?.message ?? null,
    };
  }, { name: accountName, key: cfKey });

  console.log("📊 Résultats Supabase:", JSON.stringify(results, null, 2));

  // ── Assertions ─────────────────────────────────────────────────────────────
  expect(results.accountsError).toBeNull();
  expect(results.accounts.length).toBeGreaterThan(0);
  expect(results.cfError).toBeNull();
  expect(results.customFields.length).toBeGreaterThan(0);
  expect(results.accounts[0].name).toContain("TestSync Account");
  expect(results.accounts[0].owner_type).toBe("GROUP");

  console.log("✅ Compte dans Supabase:", JSON.stringify(results.accounts[0], null, 2));
  console.log("✅ Champ personnalisé dans Supabase:", JSON.stringify(results.customFields[0], null, 2));
  console.log("✅ TEST 2 PASSÉ — Sync cloud fonctionnel");
});
