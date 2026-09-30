import { expect, test } from "@playwright/test";

/**
 * Diagnostic de charge SANS LLM : mesure le temps jusqu'à ce que #root
 * contienne du contenu sur /auth, et liste les requêtes sans réponse
 * (domaine + chemin, sans query) après 20 s.
 *
 * waitUntil: "commit" est le plus lâche — il ne bloque PAS sur l'événement
 * "load" (le bug du test de fumée historique). On mesure ensuite, côté
 * test, le temps réel de mount React et les requêtes pires.
 */
test("diagnostic de charge /auth (sans LLM)", async ({ page, context }) => {
  const t0 = Date.now();
  const pending: string[] = [];
  const responses: { url: string; ms: number }[] = [];

  page.on("request", (req) => {
    pending.push(req.url());
  });
  page.on("response", (res) => {
    const idx = pending.lastIndexOf(res.url());
    if (idx !== -1) pending.splice(idx, 1);
    responses.push({ url: res.url(), ms: res.headers()["date"] ? 0 : 0 });
  });

  const tGotoStart = Date.now();
  await page.goto("/auth", { waitUntil: "commit" });
  const tCommit = Date.now() - tGotoStart;

  const root = page.locator("#root");
  let tMount = -1;
  try {
    await root.waitFor({ state: "attached", timeout: 30000 });
    // Le contenu réel (text ou children non vides)
    await expect(root).not.toBeEmpty({ timeout: 30000 });
    tMount = Date.now() - tGotoStart;
  } catch (e) {
    // En cas d'échec on garde la mesure de commit + la liste de pends
    console.log(`[diag] root pas rempli sous 60 s : ${e}`);
  }

  // Attendre 20 s pour que les requêtes lentes/absentes se manifestent
  const tList = Date.now() - tGotoStart;
  console.log(
    `[diag] t0=${t0} commit=${tCommit}ms rootContenu=${tMount}ms elapsed=${tList}ms`,
  );
  if (pending.length > 0) {
    console.log(`[diag] ${pending.length} requête(s) sans réponse après ${Math.round(tList / 1000)} s :`);
    for (const u of pending.slice(0, 30)) {
      try {
        const url = new URL(u);
        console.log(`  - ${url.host}${url.pathname}`);
      } catch {
        console.log(`  - ${u.slice(0, 120)}`);
      }
    }
  } else {
    console.log(`[diag] aucune requête pends sur ${Math.round(tList / 1000)} s`);
  }

  // Assertion de base : #root contient du contenu
  await expect(root).not.toBeEmpty();
});
