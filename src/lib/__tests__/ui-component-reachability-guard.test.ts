// @vitest-environment node
/**
 * Garde de réachabilité — aucun composant UI mort.
 *
 * PROBLÈME VISÉ
 * -------------
 * `src/components/ui/` a hébergé ~45 composants shadcn, dont 40 inutilisés
 * (0 import en production). Parmi eux, des overlays Radix (`dialog`, `sheet`,
 * `drawer`, `alert-dialog`) qui posent `role="dialog"` au RUNTIME : ils
 * échappaient au scan littéral de `overlay-hardware-back-guard.test.ts` (qui ne
 * voit que les `role="dialog"` écrits dans la source). C'est un angle mort réel
 * de cette garde — un overlay Radix importé plus tard fermerait l'app au retour
 * matériel sans que rien ne le signale.
 *
 * CE QUE CETTE GARDE FAIT
 * -----------------------
 * Elle construit le graphe d'imports de `src/` et exige que **tout** fichier de
 * `src/components/ui/` soit atteignable depuis le code de PRODUCTION (hors
 * tests). Un composant importé uniquement par un test, ou jamais importé, est
 * considéré MORT → la garde échoue.
 *
 * CHOIX : les racines excluent les fichiers de test. Un composant utilisé
 * uniquement par un test n'est pas utilisé par l'app.
 *
 * Non-vacuité : le scan doit trouver un nombre plancher de racines et de
 * composants UI ; si le scan se casse, la garde échoue au lieu de passer à vide.
 *
 * Cf. docs/PLATFORM-GOVERNANCE.md §4.3 et `overlay-hardware-back-guard.test.ts`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, sep, dirname, resolve } from "node:path";

const root = process.cwd();
const SRC = join(root, "src");
const UI_DIR = join(SRC, "components", "ui");

const toRel = (abs: string) => relative(root, abs).split(sep).join("/");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const isTest = (rel: string) =>
  rel.includes("__tests__") ||
  rel.includes("/test/") ||
  /\.test\.[tj]sx?$/.test(rel);

const isCode = (rel: string) => /\.(ts|tsx)$/.test(rel);

const IMPORT_RE = /from\s+["']([^"']+)["']/g;

/** Resolve a specifier to an absolute source file, or null. */
function resolveSpec(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  return candidates.find((c) => existsSync(c) && isCode(c)) ?? null;
}

function importsOf(file: string): string[] {
  const code = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of code.matchAll(IMPORT_RE)) {
    const resolved = resolveSpec(file, m[1]);
    if (resolved) out.push(resolved);
  }
  return out;
}

describe("Composants UI — garde de réachabilité (aucun mort)", () => {
  it("tout composant `src/components/ui/` est importé par du code de production", () => {
    const all = walk(SRC).filter((f) => isCode(f));
    const uiFiles = all.filter((f) => f.startsWith(UI_DIR + sep));
    // Racines = code de PRODUCTION uniquement (on exclut tests ET composants ui).
    const roots = all.filter(
      (f) => !f.startsWith(UI_DIR + sep) && !isTest(toRel(f)),
    );

    const seen = new Set<string>();
    const queue = [...roots];
    while (queue.length) {
      const file = queue.pop()!;
      for (const dep of importsOf(file)) {
        if (!seen.has(dep)) {
          seen.add(dep);
          queue.push(dep);
        }
      }
    }

    const dead = uiFiles.filter((f) => !seen.has(f)).map(toRel);
    expect(
      dead,
      "Composant(s) UI sans import en production (code mort). Les supprimer, " +
        "ou — s'il s'agit d'un overlay Radix qui pose `role=\"dialog\"` au " +
        "runtime — le câbler (`useHardwareBack`) et l'importer réellement. " +
        "Cf. docs/PLATFORM-GOVERNANCE.md §4.3.",
    ).toEqual([]);
  });

  it("le scan trouve bien des racines et des composants UI (non-vacuité)", () => {
    const all = walk(SRC).filter((f) => isCode(f));
    const uiCount = all.filter((f) => f.startsWith(UI_DIR + sep)).length;
    const rootCount = all.filter(
      (f) => !f.startsWith(UI_DIR + sep) && !isTest(toRel(f)),
    ).length;
    expect(uiCount).toBeGreaterThanOrEqual(1);
    expect(rootCount).toBeGreaterThanOrEqual(50);
  });
});
