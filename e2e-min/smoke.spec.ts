import { expect, test } from "@playwright/test";

/**
 * Test de fumée minimal — LUMINA (Windows / Chrome local).
 *
 * Ne se connecte PAS (pas de secrets) : vérifie seulement que l'app se charge.
 * `/dashboard` est protégé par un RouteGuard (src/App.tsx) : non connecté,
 * on est redirigé vers `/auth` — cette redirection est acceptée.
 */
test("dashboard s'affiche sans erreur JS non interceptée", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  // "load" peut ne jamais arriver si une ressource tierce (ex. Supabase)
  // reste en suspens (offline, DNS lent) : on attend "domcontentloaded",
  // suffisant pour un test de fumée qui vérifie le mount de React.
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  // Racine réelle de index.html : <div id="root">. Elle contient du contenu
  // dès que React a mounté (page auth, splash ou dashboard après redirection).
  const root = page.locator("#root");
  await expect(root).toBeAttached();
  await expect(root).not.toBeEmpty();

  // L'app n'a pas lancé d'erreur JS non interceptée.
  expect(pageErrors, `Erreurs JS détectées : ${pageErrors.join("\n")}`).toEqual([]);
});
