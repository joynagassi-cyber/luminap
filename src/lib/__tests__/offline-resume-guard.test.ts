// @vitest-environment node
/**
 * Garde anti-régression — reprise hors ligne au RETOUR AU PREMIER PLAN.
 *
 * Demande produit : « quand je quitte l'app et que je reviens, le compte ne
 * doit pas se déconnecter » + la sync doit reprendre. Deux maillons doivent
 * rester câblés, faute de quoi la reprise redevient silencieusement inerte :
 *
 *   1. `resumePowerSync()` (src/lib/powersync/index.ts) — relance la
 *      connexion de sync si elle est tombée (le SDK ne reconnecte pas un
 *      `connect()` répété sans `disconnect()` préalable).
 *   2. `AppLifecycleBridge` (src/App.tsx) — écoute `appStateChange` (natif)
 *      ET `visibilitychange` (web) et appelle `authService.resumeSession()`
 *      + `resumePowerSync()`.
 *
 * Statique (lecture du source) : verrouille le CÂBLAGE, là où un refactor
 * pourrait le retirer sans qu'aucun test comportemental ne s'en aperçoive.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const POWERSYNC_INDEX = join(process.cwd(), "src", "lib", "powersync", "index.ts");
const APP = join(process.cwd(), "src", "App.tsx");

describe("Reprise hors ligne — câblage du retour au premier plan", () => {
  it("`resumePowerSync` re-mire la session et ne reconnecte que si déconnecté", () => {
    const src = readFileSync(POWERSYNC_INDEX, "utf8");
    expect(src).toMatch(/export async function resumePowerSync\(/);
    const body = src.slice(src.indexOf("export async function resumePowerSync("));
    expect(body).toMatch(/mirrorAppSessionIntoConnector\(\)/);
    // Garde anti-déconnexion d'une connexion saine (retour d'onglet web).
    expect(body).toMatch(/if \(_db\.connected \|\| _db\.connecting\) return;/);
    expect(body).toMatch(/_db\.connect\(_connector\)/);
    // Ne doit PAS couper une connexion vivante.
    expect(body).not.toMatch(/_db\.disconnect\(\)/);
  });

  it("`AppLifecycleBridge` est monté et écoute appStateChange + visibilitychange", () => {
    const src = readFileSync(APP, "utf8");
    expect(src).toMatch(/<AppLifecycleBridge\s*\/>/);
    expect(src).toMatch(/"appStateChange"/);
    expect(src).toMatch(/"visibilitychange"/);
    expect(src).toMatch(/authService\.resumeSession\(\)/);
    expect(src).toMatch(/resumePowerSync\(\)/);
  });
});
