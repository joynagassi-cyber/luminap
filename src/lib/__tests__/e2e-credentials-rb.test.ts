/**
 * Garde R-B — plus de mot de passe E2E en clair dans le dépôt.
 *
 * CLASSE DE DÉFAUT : `E2e-Lumina!1` était commité dans un dépôt PUBLIC
 * (`cypress/support/orgCreds.ts`, `cypress.config.ts`, `cypress/run.{sh,mjs}`,
 * `scripts/rls-isolation-check.sh`) et servait de **mot de passe réel** pour le
 * compte `lumina-org-e2e@lumina.dev`. La purge R-A avait ramené les comptes
 * porteurs de 93 à 2, mais le secret restait exploitable.
 *
 * Correctif : mots de passe ROTÉS en base (bcrypt) puis retirés du dépôt ; ils
 * sont désormais lus depuis `CYPRESS_ORG_PASSWORD` /
 * `CYPRESS_ORG_UNCONFIGURED_PASSWORD` (env ou `.env.local` gitignoré).
 *
 * Cette garde empêche toute réintroduction du littéral.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, join } from "path";

const root = resolve(__dirname, "../../..");

const FORBIDDEN = ["E2e-Lumina!1", "E2e-Unconfigured!1"];
// Répertoires/fichiers de code à scanner (pas la doc, qui CITE les motifs).
const SCAN_DIRS = ["cypress", "scripts"];
const SCAN_FILES = ["cypress.config.ts"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "screenshots" || entry === "videos")
      continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|mjs|cjs|js|sh|json|yml|yaml)$/.test(entry)) out.push(p);
  }
  return out;
}

describe("R-B — aucun mot de passe E2E en clair dans le dépôt", () => {
  const files = [
    ...SCAN_DIRS.flatMap((d) =>
      existsSync(resolve(root, d)) ? walk(resolve(root, d)) : [],
    ),
    ...SCAN_FILES.map((f) => resolve(root, f)),
  ];

  it("le littéral divulgué est absent de tout le code versionné", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const bad of FORBIDDEN) {
        if (src.includes(bad)) offenders.push(`${f} → ${bad}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("les mots de passe viennent de l'environnement (pas de défaut en dur)", () => {
    const cfg = readFileSync(resolve(root, "cypress.config.ts"), "utf8");
    expect(cfg).toMatch(/process\.env\.CYPRESS_ORG_PASSWORD/);
    expect(cfg).toMatch(/process\.env\.CYPRESS_ORG_UNCONFIGURED_PASSWORD/);
    // Défaut = chaîne vide (jamais un mot de passe).
    expect(cfg).toMatch(/ORG_PASSWORD:\s*process\.env\.CYPRESS_ORG_PASSWORD\s*\|\|\s*""/);
    expect(cfg).toMatch(
      /ORG_UNCONFIGURED_PASSWORD:\s*\n?\s*process\.env\.CYPRESS_ORG_UNCONFIGURED_PASSWORD\s*\|\|\s*""/,
    );

    const creds = readFileSync(resolve(root, "cypress/support/orgCreds.ts"), "utf8");
    expect(creds).toMatch(/password:\s*''/);
  });

  it("`.env.local` est gitignoré (les secrets ne sont jamais committés)", () => {
    const gi = readFileSync(resolve(root, ".gitignore"), "utf8");
    expect(gi).toMatch(/^\.env\.local\s*$/m);
  });
});
