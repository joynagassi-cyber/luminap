// @vitest-environment node
/**
 * Garde anti-fuite — la surface de diagnostic PowerSync doit rester DEV-only.
 *
 * `publishDevDiagnostics()` (`src/lib/powersync/index.ts`) expose sur `window`
 * des handles de production : `__psDb`, `__psConnector`, `__psSupabaseClient`
 * (le **client Supabase**, capable d'écritures via la session de l'utilisateur)
 * et `__psFlushCrudUpload` (qui pousse la file d'upload). Ces globals aident
 * les specs Cypress, mais s'ils étaient exposés en **build de production**, un
 * script de la page (ou une extension) pourrait piloter la base et contourner
 * l'UI. La seule protection est la garde `if (!import.meta.env.DEV) return;` en
 * tête de fonction — une ligne facile à perdre lors d'un refactor.
 *
 * Cette garde statique verrouille :
 *   1. la présence de la garde `DEV` AVANT toute écriture sur `window` ;
 *   2. que les globals sensibles sont bien définis dans cette fonction ;
 *   3. qu'aucun autre site du source n'écrit ces globals hors DEV.
 *
 * Statique (lecture du source) : aucun navigateur requis.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");
const POWERSYNC_INDEX = join(SRC, "lib", "powersync", "index.ts");

/** Globals de diagnostic qui ne doivent jamais fuir en production. */
const DIAGNOSTIC_GLOBALS = [
  "__psDb",
  "__psConnector",
  "__psSupabaseClient",
  "__psFlushCrudUpload",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === "__tests__") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

describe("Sécurité — surface de diagnostic PowerSync strictement DEV-only", () => {
  it("`publishDevDiagnostics` retourne tôt hors DEV, AVANT toute écriture window", () => {
    const src = readFileSync(POWERSYNC_INDEX, "utf8");

    const devGuardIdx = src.indexOf("if (!import.meta.env.DEV) return;");
    expect(
      devGuardIdx,
      "garde `if (!import.meta.env.DEV) return;` introuvable dans publishDevDiagnostics",
    ).toBeGreaterThan(-1);

    // Non-vacuité : les globals sensibles doivent bien être définis ici.
    for (const g of DIAGNOSTIC_GLOBALS) {
      const idx = src.indexOf(`win.${g} =`);
      expect(idx, `global ${g} non défini dans le source — garde vacue`).toBeGreaterThan(-1);
      // La définition doit venir APRÈS le retour anticipé hors DEV.
      expect(
        idx,
        `${g} est écrit AVANT la garde DEV (fuite possible en production)`,
      ).toBeGreaterThan(devGuardIdx);
    }
  });

  it("aucun autre site du source n'écrit ces globals sans être protégé par DEV", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (file === POWERSYNC_INDEX) continue;
      const src = readFileSync(file, "utf8");
      for (const g of DIAGNOSTIC_GLOBALS) {
        if (new RegExp(`\\bwin(?:dow)?\\.${g}\\s*=`).test(src)) {
          offenders.push(`${relative(process.cwd(), file)} (${g})`);
        }
      }
    }
    expect(
      offenders,
      `globals de diagnostic écrits hors du point d'entrée DEV protégé : ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
