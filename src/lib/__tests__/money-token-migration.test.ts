/**
 * Garde de la migration des jetons d'ARGENT (Addendum 2, B1).
 *
 * Les jetons financiers historiques `--data-income` / `--data-expense` /
 * `--data-expense-hover` / `--data-pending` ont été remplacés par le vocabulaire
 * de la maquette dashboard-MF : `--in` / `--out` / `--out-hover` / `--warn`.
 *
 * La garde échoue si l'un des anciens noms réapparaît dans le code (src, tests,
 * cypress, tailwind, SVG) : c'est la classe de défaut « renommage partiel » où
 * un fichier oublié garde une couleur morte (var() non résolue = transparent).
 *
 * Non-vacuité : réintroduire `var(--data-income)` dans n'importe quel fichier
 * scanné fait échouer le test (vérifié par mutation — voir le receipt).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(__dirname, "../../..");

const BANNED = [
  "--data-income",
  "--data-expense-hover",
  "--data-expense",
  "--data-pending",
];

const SCAN_ROOTS = ["src", "cypress", "public"];
const SCAN_FILES = ["tailwind.config.ts", "index.html"];
const EXT = /\.(ts|tsx|css|svg|html|json)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, out);
    } else if (EXT.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function scannedFiles(): string[] {
  const files = SCAN_ROOTS.flatMap((r) => walk(join(ROOT, r)));
  for (const f of SCAN_FILES) files.push(join(ROOT, f));
  // La garde elle-même cite les noms bannis : on l'exclut du scan.
  return files.filter((f) => !f.endsWith("money-token-migration.test.ts"));
}

describe("migration des jetons d'argent (B1)", () => {
  it("aucun ancien jeton --data-{income,expense,expense-hover,pending} ne subsiste", () => {
    const hits: string[] = [];
    for (const file of scannedFiles()) {
      const src = readFileSync(file, "utf8");
      for (const banned of BANNED) {
        if (src.includes(banned)) {
          hits.push(`${file.replace(ROOT + "/", "")} → ${banned}`);
        }
      }
    }
    expect(hits, `jetons obsolètes :\n${hits.join("\n")}`).toEqual([]);
  });

  it("App.css définit les jetons canoniques dans les deux modes", () => {
    const css = readFileSync(join(ROOT, "src/App.css"), "utf8");
    for (const t of ["--in:", "--out:", "--out-hover:", "--warn:"]) {
      expect(css, `jeton manquant : ${t}`).toContain(t);
    }
    // Présents dans le bloc sombre ET le bloc clair.
    expect(css.match(/--in:/g)?.length).toBeGreaterThanOrEqual(2);
    expect(css.match(/--out:/g)?.length).toBeGreaterThanOrEqual(2);
    expect(css.match(/--warn:/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("tailwind mappe income/expense/pending vers --in/--out/--warn", () => {
    const tw = readFileSync(join(ROOT, "tailwind.config.ts"), "utf8");
    expect(tw).toContain('income: "var(--in)"');
    expect(tw).toContain('expense: "var(--out)"');
    expect(tw).toContain('pending: "var(--warn)"');
  });

  it("non-vacuité : la détection repère bien une chaîne bannie", () => {
    const probe = "background: var(--data-income);";
    expect(BANNED.some((b) => probe.includes(b))).toBe(true);
  });
});
