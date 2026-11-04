#!/usr/bin/env node
/**
 * C-01 — Garde-fou : AUCUN plugin ne doit être configuré dans
 * `capacitor.config.ts` sans être installé (`package.json`).
 *
 * Pourquoi : la config décrivait `plugins.SplashScreen` et `plugins.OneSignal`
 * alors qu'aucun des deux n'était installé. La configuration était ignorée en
 * silence, et l'équipe croyait que le splash et le push étaient pilotés depuis
 * ce fichier.
 *
 * Le script lit la config via le CLI Capacitor n'est pas nécessaire : on
 * importe le fichier TS compilé à la volée par `esbuild` ? Non — on évite toute
 * dépendance : le fichier est lu et les clés de `plugins` sont extraites par
 * expression régulière bornée à l'objet `plugins: { … }`.
 *
 * Usage : node scripts/check-native-plugins.mjs   (code 1 si un plugin manque)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configSrc = readFileSync(join(root, "capacitor.config.ts"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

// Bloc `plugins: { ... }` : on s'arrête à la première accolade fermante au
// même niveau (les blocs imbriqués sont comptés).
function extractPluginsBlock(src) {
  const start = src.indexOf("plugins:");
  if (start === -1) return "";
  const open = src.indexOf("{", start);
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return "";
}

/** Retire les commentaires pour ne pas lire une clé citée dans une explication. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const block = stripComments(extractPluginsBlock(configSrc));
// Clés de premier niveau du bloc : `Nom: {` ou `Nom: value`.
const configured = [...block.matchAll(/^\s{4}([A-Za-z0-9_]+)\s*:/gm)].map(
  (m) => m[1],
);

const installed = new Set(
  Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).map((dep) =>
    dep.replace(/^@capacitor\//, ""),
  ),
);

// Un plugin est « installé » s'il existe une dépendance `@capacitor/<nom>`
// dont la casse (kebab) correspond au nom de config (PascalCase).
function isInstalled(pluginName) {
  const kebab = pluginName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
  return installed.has(kebab);
}

const missing = configured.filter((name) => !isInstalled(name));

if (missing.length > 0) {
  console.error(
    `[check-native-plugins] Plugin(s) configuré(s) mais NON installé(s) : ${missing.join(", ")}`,
  );
  console.error(
    "  → installer le plugin (@capacitor/…) ou retirer sa section de capacitor.config.ts",
  );
  process.exit(1);
}

console.log(
  `[check-native-plugins] OK — ${configured.length} plugin(s) configuré(s), tous installés${
    configured.length ? ` (${configured.join(", ")})` : ""
  }.`,
);
