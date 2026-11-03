/**
 * C-01 — `capacitor.config.ts` ne doit configurer AUCUN plugin non installé.
 *
 * Défaut d'origine (constaté sur `f29ebf5`) : les sections `plugins.SplashScreen`
 * et `plugins.OneSignal` décrivaient des plugins absents de `package.json`. La
 * configuration était ignorée en silence, et l'équipe croyait durablement que
 * l'écran de démarrage et le push étaient pilotés depuis ce fichier.
 *
 * Le contrôle est ici (et non dans un job CI dédié) pour qu'il s'exécute avec
 * `pnpm test` : un plugin fantôme casse la suite, pas seulement la revue.
 * Le script utilisable à la main reste `node scripts/check-native-plugins.mjs`.
 *
 * NON-VACUITÉ : ajouter `SplashScreen: { … }` dans `capacitor.config.ts` sans
 * installer `@capacitor/splash-screen` ⇒ le test échoue (vérifié).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Bloc `plugins: { … }` de la config (accolades équilibrées). */
function pluginsBlock(src: string): string {
  const start = src.indexOf("plugins:");
  if (start === -1) return "";
  const open = src.indexOf("{", start);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return "";
}

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("capacitor.config.ts ↔ package.json", () => {
  it("aucun plugin configuré n'est absent des dépendances", () => {
    const configSrc = readFileSync(join(root, "capacitor.config.ts"), "utf8");
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const block = stripComments(pluginsBlock(configSrc));
    const configured = [...block.matchAll(/^\s{4}([A-Za-z0-9_]+)\s*:/gm)].map(
      (m) => m[1],
    );
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const installed = new Set(
      deps
        .filter((d) => d.startsWith("@capacitor/"))
        .map((d) => d.replace("@capacitor/", "")),
    );
    const missing = configured.filter(
      (name) =>
        !installed.has(
          name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
        ),
    );
    expect(missing).toEqual([]);
  });

  it("le script de garde (utilisable en CI) est d'accord avec le test", () => {
    // Sortie 0 = aucun plugin fantôme. Un échec ici signifie que le script et
    // la vérification ci-dessus ont divergé : les deux doivent rester alignés.
    const out = execFileSync(
      process.execPath,
      [join(root, "scripts", "check-native-plugins.mjs")],
      { encoding: "utf8" },
    );
    expect(out).toContain("OK");
  });
});
