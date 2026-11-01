/**
 * Script CI — vérifie que le Labo Design et ses IDs de seed sont EXCLUS du
 * bundle de production.
 *
 * Usage : pnpm verify:labo-build
 *
 * Lit tous les fichiers générés dans `dist/` (HTML + assets JS) et échoue
 * (code de sortie 1) si une signature unique du Labo est détectée.
 *
 * Signatures recherchées :
 *  - les IDs de seed (ex. "labo-seed-5000-transactions") — chaînes littérales uniques à seed.ts
 *  - "PanneauLabo", "LaboToggle", "useLabo" — noms de composants/hook du Labo
 *
 * Ceci garantit que le panneau Labo (réservé au développement) ne part
 * JAMAIS en production, comme exigé par la contrainte de sécurité.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = join(process.cwd(), "dist");

// IDs de seed — chaînes littérales uniques au générateur Labo.
const SEED_IDS = [
  "labo-seed-org-neuve",
  "labo-seed-org-normale",
  "labo-seed-5000-tx",
  "labo-seed-noms-longs",
  "labo-seed-montant-geant",
];

// Noms de symboles du Labo qui n'apparaissent que si le code est bundlé.
const LABO_SYMBOLS = ["PanneauLabo", "LaboToggle", "useLabo", "LaboDesign"];

const PATTERNS = [
  ...SEED_IDS.map((id) => new RegExp(id, "i")),
  ...LABO_SYMBOLS.map((sym) => new RegExp(sym)),
];

function walk(dir) {
  let results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function main() {
  if (!existsSync(DIST_DIR)) {
    console.error(
      "[verify-labo-excluded] ❌ dossier dist/ introuvable. Lancez `pnpm build` avant.",
    );
    process.exit(1);
  }

  const files = walk(DIST_DIR).filter((f) => f.endsWith(".html") || f.endsWith(".js"));

  let leaks = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      for (const pattern of PATTERNS) {
        if (pattern.test(content)) {
          console.error(
            `[verify-labo-excluded] ❌ FUITE DÉTECTÉE dans ${file} : signature "${pattern}" présente dans le bundle de production.`,
          );
          leaks += 1;
        }
      }
    } catch (err) {
      console.warn(`[verify-labo-excluded] ⚠️  impossible de lire ${file}: ${err.message}`);
    }
  }

  if (leaks > 0) {
    console.error(
      `\n[verify-labo-excluded] ❌ ${leaks} fuite(s) du Labo détectée(s) dans le build de production. Le Labo ne doit JAMAIS partir en prod.`,
    );
    process.exit(1);
  }

  console.log(
    `[verify-labo-excluded] ✅ ${files.length} fichier(s) vérifié(s) — aucune référence au Labo dans le build de production.`,
  );
}

main();
