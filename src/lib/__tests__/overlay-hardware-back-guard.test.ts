// @vitest-environment node
/**
 * Garde de complétude — retour matériel sur les overlays MAISON.
 *
 * PROBLÈME VISÉ
 * -------------
 * Tout overlay maison (`role="dialog"` : feuilles, modales, menus) qui ne
 * s'inscrit PAS à la façade `src/platform/hardwareBack.ts` laisse le bouton
 * retour matériel Android **fermer l'application** au lieu de fermer
 * l'overlay. C'est la même classe de bug natif que R447/R448.
 *
 * CE QUE CETTE GARDE FAIT
 * -----------------------
 * Elle balaie `src/` et exige que tout fichier qui rend un `role="dialog"`
 * référence `useHardwareBack(` (hook) **ou** `registerHardwareBack(` (façade
 * directe). Un nouvel overlay non câblé fait échouer la garde.
 *
 * Non-vacuité : le scan doit trouver un nombre plancher d'overlays ; si le
 * scan se casse (0 trouvé), la garde échoue au lieu de passer à vide.
 *
 * Cf. docs/ui-exceptions.md (« Bouton retour matériel ») et
 * docs/PLATFORM-GOVERNANCE.md §4.3.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const toRel = (abs: string) => relative(root, abs).split(sep).join("/");

const WIRED = /(?:useHardwareBack|registerHardwareBack)\s*\(/;

function overlaysWithoutBack(): string[] {
  const offenders: string[] = [];
  for (const file of walk(join(root, "src"))) {
    const rel = toRel(file);
    if (!rel.endsWith(".tsx")) continue;
    if (rel.includes("__tests__") || rel.includes("/test/") || rel.endsWith(".test.tsx")) continue;
    const code = readFileSync(file, "utf8");
    if (!/role=["']dialog["']/.test(code)) continue;
    if (!WIRED.test(code)) offenders.push(rel);
  }
  return offenders;
}

function overlays(): string[] {
  return walk(join(root, "src"))
    .map(toRel)
    .filter(
      (rel) =>
        rel.endsWith(".tsx") &&
        !rel.includes("__tests__") &&
        !rel.includes("/test/") &&
        !rel.endsWith(".test.tsx") &&
        /role=["']dialog["']/.test(readFileSync(join(root, rel), "utf8")),
    );
}

describe("Retour matériel — overlays maison (garde de complétude)", () => {
  it("tout overlay `role=\"dialog\"` s'inscrit à la façade retour matériel", () => {
    const offenders = overlaysWithoutBack();
    expect(
      offenders,
      "Overlay(s) maison rendant `role=\"dialog\"` sans `useHardwareBack(...)` " +
        "ni `registerHardwareBack(...)` : le bouton retour Android fermera l'app " +
        "au lieu de l'overlay. Ajouter le hook (cf. docs/ui-exceptions.md).",
    ).toEqual([]);
  });

  it("le scan trouve bien des overlays (non-vacuité)", () => {
    // Plancher volontairement bas (la liste réelle est ~15) : garantit que le
    // scan fonctionne sans devenir fragile au moindre ajout/retrait.
    expect(overlays().length).toBeGreaterThanOrEqual(8);
  });
});
