import { test, expect } from "@playwright/test";

test.describe("Groups Feature — Complete Flow", () => {
  test("Create, view, and manage groups", async ({ page }) => {
    test.setTimeout(120000);

    // Login
    await page.goto("/login");
    await expect(page.getByPlaceholder("Ex: Jean")).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder("Ex: Jean").fill("TestGroup");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Choisissez votre rôle" })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Trésorier" }).click();
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

    // Navigate to Groups
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Groupes" }).click();
    await expect(page.getByRole("heading", { name: "Groupes" })).toBeVisible();

    // Click Create button
    await page.getByRole("button", { name: "Créer" }).click();
    await expect(page.getByRole("heading", { name: "Nouveau groupe" })).toBeVisible();

    // Fill form
    await page.locator('input[placeholder*="groupe|nom"]').first().fill("Jeunesse Centrale");
    await page.getByRole("button", { name: "groupe", exact: true }).click();
    await page.locator('textarea').first().fill("Groupe de la jeunesse");
    await page.getByRole("button", { name: "Créer le groupe" }).click();

    // Verify group created
    await expect(page.getByText("Jeunesse Centrale")).toBeVisible();
    console.log("✅ Groupe créé avec succès");

    // Navigate to group detail
    await page.getByText("Jeunesse Centrale").click();
    await expect(page.getByRole("heading", { name: "Jeunesse Centrale" })).toBeVisible();

    // Verify tabs exist
    await expect(page.getByRole("button", { name: "Transactions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Membres" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Historique" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Paramètres" })).toBeVisible();
    console.log("✅ Onglets de détail groupe vérifiés");

    // Navigate back
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("heading", { name: "Groupes" })).toBeVisible();
    console.log("✅ Navigation retour fonctionnelle");
  });

  test("Group actions — edit, archive, delete", async ({ page }) => {
    test.setTimeout(120000);

    // Login
    await page.goto("/login");
    await page.getByPlaceholder("Ex: Jean").fill("TestAction");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByRole("button", { name: "Trésorier" }).click();
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

    // Go to Groups
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Groupes" }).click();
    await expect(page.getByRole("heading", { name: "Groupes" })).toBeVisible();

    // Create a group to test actions
    await page.getByRole("button", { name: "Créer" }).click();
    await page.locator('input[placeholder*="groupe|nom"]').first().fill("Groupe Test Actions");
    await page.getByRole("button", { name: "groupe", exact: true }).click();
    await page.getByRole("button", { name: "Créer le groupe" }).click();
    await expect(page.getByText("Groupe Test Actions")).toBeVisible();

    // Navigate to detail
    await page.getByText("Groupe Test Actions").click();
    await expect(page.getByRole("heading", { name: "Groupe Test Actions" })).toBeVisible();

    // Click on Settings tab
    await page.getByRole("button", { name: "Paramètres" }).click();
    await expect(page.getByText("Modifier le groupe")).toBeVisible();

    // Click Edit
    await page.getByText("Modifier le groupe").click();
    await expect(page.getByRole("heading", { name: "Modifier le groupe" })).toBeVisible();
    console.log("✅ Formulaire d'édition accessible");

    // Go back and click Archive
    await page.getByRole("button", { name: "Retour" }).click();
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Groupes" }).click();
    await page.getByText("Groupe Test Actions").click();
    await page.getByRole("button", { name: "Paramètres" }).click();

    // Click Archive button
    await page.getByText("Archiver le groupe").click();
    await expect(page.getByText("Archiver Groupe Test Actions ?")).toBeVisible();
    console.log("✅ Confirmation d'archivage visible");

    // Cancel archive
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByText("Archiver le groupe")).toBeVisible();
    console.log("✅ Annulation d'archivage fonctionnelle");
  });
});

test.describe("Events Feature — Complete Flow", () => {
  test("Create, view, and manage events", async ({ page }) => {
    test.setTimeout(120000);

    // Login
    await page.goto("/login");
    await page.getByPlaceholder("Ex: Jean").fill("TestEvent");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByRole("button", { name: "Trésorier" }).click();
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

    // Navigate to Events
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Événements" }).click();
    await expect(page.getByRole("heading", { name: "Événements" })).toBeVisible();

    // Click Create
    await page.getByRole("button", { name: "Créer" }).click();
    await expect(page.getByRole("heading", { name: /nouvel événement|créer/i })).toBeVisible();

    // Fill event form
    await page.locator('input[placeholder*="nom|ex:"]').first().fill("Culte de Noël");
    await page.getByRole("button", { name: /sélectionner/i }).first().click();
    await page.getByRole("gridcell", { name: "25" }).click();
    await page.getByRole("button", { name: "Créer l'événement" }).click();

    // Verify event created
    await expect(page.getByText("Culte de Noël")).toBeVisible();
    console.log("✅ Événement créé avec succès");

    // Navigate to event detail
    await page.getByText("Culte de Noël").click();
    await expect(page.getByRole("heading", { name: "Culte de Noël" })).toBeVisible();

    // Verify tabs
    await expect(page.getByRole("button", { name: "Aperçu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Budget" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Transactions" })).toBeVisible();
    console.log("✅ Onglets d'événement vérifiés");

    // Verify status badge
    await expect(page.getByText("Planifié")).toBeVisible();
    console.log("✅ Statut affiché correctement");

    // Test status change
    await page.getByRole("button", { name: "Démarrer" }).click();
    await expect(page.getByText("En cours")).toBeVisible();
    console.log("✅ Changement de statut Planifié → En cours");

    // Navigate back
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("heading", { name: "Événements" })).toBeVisible();
    console.log("✅ Navigation retour fonctionnelle");
  });

  test("Event budget and transactions", async ({ page }) => {
    test.setTimeout(120000);

    // Login
    await page.goto("/login");
    await page.getByPlaceholder("Ex: Jean").fill("TestBudget");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByRole("button", { name: "Trésorier" }).click();
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

    // Create event
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Événements" }).click();
    await page.getByRole("button", { name: "Créer" }).click();
    await page.locator('input[placeholder*="nom|ex:"]').first().fill("Conférence 2025");
    await page.getByRole("button", { name: /sélectionner/i }).first().click();
    await page.getByRole("gridcell", { name: "15" }).click();
    await page.getByRole("button", { name: "Créer l'événement" }).click();

    // Navigate to detail
    await page.getByText("Conférence 2025").click();
    await expect(page.getByRole("heading", { name: "Conférence 2025" })).toBeVisible();

    // Click on Budget tab
    await page.getByRole("button", { name: "Budget" }).click();
    await expect(page.getByText("Aucun poste budgétaire")).toBeVisible();
    console.log("✅ Tab budget visible");

    // Go back and test transactions
    await page.getByRole("button", { name: "Retour" }).click();
    await page.getByText("Conférence 2025").click();
    await page.getByRole("button", { name: "Transactions" }).click();
    await expect(page.getByText("Aucune transaction liée")).toBeVisible();
    console.log("✅ Tab transactions visible");

    // Click add transaction
    await page.getByRole("button", { name: "Ajouter une transaction" }).click();
    await expect(page.getByRole("heading", { name: /nouvelle transaction/i })).toBeVisible();
    console.log("✅ Création transaction depuis événement");

    // Go back to event list
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("heading", { name: "Événements" })).toBeVisible();
  });

  test("Event edit functionality", async ({ page }) => {
    test.setTimeout(120000);

    // Login
    await page.goto("/login");
    await page.getByPlaceholder("Ex: Jean").fill("TestEdit");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByRole("button", { name: "Trésorier" }).click();
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

    // Create event
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Événements" }).click();
    await page.getByRole("button", { name: "Créer" }).click();
    await page.locator('input[placeholder*="nom|ex:"]').first().fill("Event à Modifier");
    await page.getByRole("button", { name: /sélectionner/i }).first().click();
    await page.getByRole("gridcell", { name: "1" }).click();
    await page.getByRole("button", { name: "Créer l'événement" }).click();

    // Navigate to detail
    await page.getByText("Event à Modifier").click();
    await expect(page.getByRole("heading", { name: "Event à Modifier" })).toBeVisible();

    // Click edit button
    await page.getByRole("button", { name: "Modifier" }).click();
    await expect(page.getByRole("heading", { name: "Modifier l'événement" })).toBeVisible();

    // Modify name
    await page.locator('input[placeholder*="nom"]').first().fill("Event Modifié");
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();

    // Verify redirect to detail
    await expect(page.getByRole("heading", { name: "Event Modifié" })).toBeVisible();
    console.log("✅ Modification d'événement réussie");
  });

  test("Event cancellation", async ({ page }) => {
    test.setTimeout(120000);

    // Login
    await page.goto("/login");
    await page.getByPlaceholder("Ex: Jean").fill("TestCancel");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByRole("button", { name: "Trésorier" }).click();
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

    // Create and navigate to event
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Événements" }).click();
    await page.getByRole("button", { name: "Créer" }).click();
    await page.locator('input[placeholder*="nom|ex:"]').first().fill("Event à Annuler");
    await page.getByRole("button", { name: /sélectionner/i }).first().click();
    await page.getByRole("gridcell", { name: "1" }).click();
    await page.getByRole("button", { name: "Créer l'événement" }).click();
    await page.getByText("Event à Annuler").click();

    // Click cancel button
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByText("Annulé")).toBeVisible();
    console.log("✅ Événement annulé avec succès");

    // Navigate back
    await page.getByRole("button", { name: "Retour" }).click();
  });
});

test.describe("Groups and Events Integration", () => {
  test("Transaction from group to event", async ({ page }) => {
    test.setTimeout(120000);

    // Login
    await page.goto("/login");
    await page.getByPlaceholder("Ex: Jean").fill("TestInteg");
    await page.getByRole("button", { name: "Trésorier", exact: true }).click();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByRole("button", { name: "Trésorier" }).click();
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible({ timeout: 30000 });

    // Create group
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Groupes" }).click();
    await page.getByRole("button", { name: "Créer" }).click();
    await page.locator('input[placeholder*="groupe|nom"]').first().fill("Groupe Intégration");
    await page.getByRole("button", { name: "groupe", exact: true }).click();
    await page.getByRole("button", { name: "Créer le groupe" }).click();
    await expect(page.getByText("Groupe Intégration")).toBeVisible();
    console.log("✅ Groupe créé pour intégration");

    // Navigate to event
    await page.getByRole("navigation", { name: /bottom/i }).getByRole("button", { name: "Événements" }).click();
    await page.getByRole("button", { name: "Créer" }).click();
    await page.locator('input[placeholder*="nom|ex:"]').first().fill("Événement Intégration");
    await page.getByRole("button", { name: /sélectionner/i }).first().click();
    await page.getByRole("gridcell", { name: "1" }).click();
    await page.getByRole("button", { name: "Créer l'événement" }).click();
    await page.getByText("Événement Intégration").click();

    // Add transaction linked to event
    await page.getByRole("button", { name: "Transactions" }).click();
    await page.getByRole("button", { name: "Ajouter une transaction" }).click();
    await expect(page.getByRole("heading", { name: /nouvelle transaction/i })).toBeVisible();
    console.log("✅ Transaction depuis événement accessible");

    // Go back
    await page.getByRole("button", { name: "Retour" }).click();
  });
});
