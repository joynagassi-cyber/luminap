#!/usr/bin/env node
/**
 * collect-screenshots — range les captures Cypress pour le tutoriel.
 *
 * Cypress écrit dans `cypress/screenshots/<spec>/<id>.png`. L'application sert
 * `public/` à la racine, donc le tutoriel attend `public/captures/<id>.png`.
 * Ce script fait le pont, et surtout il **dit ce qui manque** : une capture
 * absente est un trou dans le tutoriel, et un trou silencieux est un piège.
 *
 * Aucun secret manipulé : ce script ne lit que des fichiers.
 *
 * Usage :
 *   node --experimental-strip-types scripts/collect-screenshots.mjs
 *   node --experimental-strip-types scripts/collect-screenshots.mjs --check
 *     --check : ne copie rien, vérifie seulement la couverture.
 */
import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join, basename, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC_DIR = join(ROOT, "cypress", "screenshots");
const OUT_DIR = join(ROOT, "public", "captures");
const checkOnly = process.argv.includes("--check");

const { SCREEN_MANIFEST } = await import(
  new URL("../src/lib/screenManifest.ts", import.meta.url).pathname
);

/** Tous les .png sous un dossier, récursivement. */
function findPngs(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findPngs(full));
    else if (entry.toLowerCase().endsWith(".png")) out.push(full);
  }
  return out;
}

const expected = new Map(SCREEN_MANIFEST.map((s) => [s.id, s]));
const found = new Map();

for (const file of findPngs(SRC_DIR)) {
  const id = basename(file, ".png");
  // Si plusieurs captures portent le même id (run précédent), la plus récente
  // gagne : c'est celle qui correspond au dernier état de l'app.
  const prev = found.get(id);
  if (!prev || statSync(file).mtimeMs > statSync(prev).mtimeMs) found.set(id, file);
}

const known = [...found.keys()].filter((id) => expected.has(id));
const orphans = [...found.keys()].filter((id) => !expected.has(id));
const missing = [...expected.keys()].filter((id) => !found.has(id));

if (!checkOnly) {
  mkdirSync(OUT_DIR, { recursive: true });
  // On repart d'un dossier propre : une capture d'un écran supprimé du
  // manifeste ne doit pas survivre et réapparaître dans le tutoriel.
  for (const f of readdirSync(OUT_DIR)) {
    if (f.endsWith(".png")) rmSync(join(OUT_DIR, f));
  }
  for (const id of known) {
    copyFileSync(found.get(id), join(OUT_DIR, `${id}.png`));
  }
}

const pct = Math.round((known.length / expected.size) * 100);

console.log(`\nCaptures — ${known.length}/${expected.size} écrans (${pct} %)`);
console.log(`Sortie : ${relative(ROOT, OUT_DIR)}${checkOnly ? " (vérification seule)" : ""}\n`);

if (missing.length) {
  console.log(`Manquants (${missing.length}) :`);
  for (const id of missing) {
    console.log(`  · ${id.padEnd(24)} ${expected.get(id).route}`);
  }
  console.log(
    "\n  → relancer : pnpm capture:screens\n" +
      "  → un écran dynamique n'est jamais capturable ici (voir DYNAMIC_SCREENS).\n",
  );
}

if (orphans.length) {
  console.log(`Orphelins (${orphans.length}) — PNG sans entrée dans le manifeste :`);
  for (const id of orphans) console.log(`  · ${id}`);
  console.log("  → soit l'écran a été retiré, soit l'id du manifeste a changé.\n");
}

process.exit(missing.length ? 1 : 0);
