import { test, expect } from "@playwright/test";

test("cloud sync — account and custom field reach Supabase", async ({ page }) => {
  // Block Supabase requests to simulate offline cloud
  await page.route("**/hhgovvrnalibhgpakswi.supabase.co/**", route => route.abort("networkerror"));
  console.log("✅ Supabase blocked");

  // Sign in
  await page.goto("/login");
  await expect(page.getByPlaceholder("Ex: Jean")).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder("Ex: Jean").fill("TestSync");
  await page.getByRole("button", { name: "Trésorier", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });
  console.log("✅ Signed in");

  // Create group (account)
  await page.goto("/groups");
  await page.getByRole("heading", { name: "Groupes" }).waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Créer" }).click();
  await page.locator('input[placeholder*="jeunesse"]').fill("TestSync Account");
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await expect(page.getByText("TestSync Account")).toBeVisible();
  console.log("✅ Group created offline");

  // Create custom field
  await page.goto("/custom-fields");
  await page.getByRole("heading", { name: "Champs personnalisés" }).waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Créer" }).click();
  await page.locator('input[placeholder="Label *"]').fill("TestSync Custom Field");
  await page.locator('input[placeholder="montant_estime"]').fill("test_sync_cf");
  await page.getByRole("button", { name: "Créer le champ" }).click();
  await expect(page.getByText("TestSync Custom Field")).toBeVisible();
  console.log("✅ Custom field created offline");

  // Come back online
  await page.unroute("**/hhgovvrnalibhgpakswi.supabase.co/**");
  console.log("✅ Supabase unblocked");

  // Wait for sync
  console.log("⏳ Waiting for sync...");
  await page.waitForTimeout(35000);

  // Query Supabase
  const results = await page.evaluate(async () => {
    const { supabase } = await import("/src/integrations/supabase/client.ts");
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts").select("*").eq("name", "TestSync Account").limit(5);
    const { data: cfs, error: cfError } = await supabase
      .from("custom_field_definitions").select("*").eq("label", "TestSync Custom Field").limit(5);
    return {
      accounts: accounts ?? [], accountsError: accountsError?.message ?? null,
      customFields: cfs ?? [], cfError: cfError?.message ?? null,
    };
  });

  console.log("Results:", JSON.stringify(results, null, 2));

  expect(results.accountsError).toBeNull();
  expect(results.accounts.length).toBeGreaterThan(0);
  expect(results.cfError).toBeNull();
  expect(results.customFields.length).toBeGreaterThan(0);
  expect(results.accounts[0].name).toBe("TestSync Account");
  expect(results.accounts[0].owner_type).toBe("GROUP");
  expect(results.customFields[0].label).toBe("TestSync Custom Field");

  console.log("✅ Account in Supabase:", JSON.stringify(results.accounts[0], null, 2));
  console.log("✅ Custom field in Supabase:", JSON.stringify(results.customFields[0], null, 2));
  console.log("✅ Test PASSED: Cloud sync working");
});
