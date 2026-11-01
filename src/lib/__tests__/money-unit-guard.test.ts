// @vitest-environment node
/**
 * Garde anti-récurrence — unité « FCFA » affichée en double.
 *
 * `formatCurrencyCompact()` / `formatMoney()` / `formatCentsToFCFA()` rendent
 * DÉJÀ la devise (« 50 000 FCFA »), contrairement à `formatCurrencyFull()` /
 * `formatCentsFull()` (chiffres nus). Ajouter « F » ou « FCFA » après un appel
 * à un helper qui l'inclut produit « 50 000 FCFA F » à l'écran.
 *
 * Bug réel mesuré : le passage au format d'affichage paramétrable a fait
 * basculer `formatCurrencyCompact` du format nu (« 50K ») au format complet
 * avec devise, sans retirer le suffixe « F » de ~20 sites → régression visible
 * sur tous les écrans finance. Cette garde échoue sur toute NOUVELLE occurrence
 * dans `src/` (hors tests).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = [
  join(ROOT, "src", "lib"),
  join(ROOT, "src", "capabilities"),
  join(ROOT, "src", "pages"),
  join(ROOT, "src", "components"),
];

// Helpers qui incluent la devise dans leur sortie.
const UNIT_BEARING = "formatCurrencyCompact|formatMoney|formatCentsToFCFA";
// Appel suivi immédiatement d'une unité « F » / « FCFA » (texte JSX ou gabarit).
const FORBIDDEN = new RegExp(
  `(?:${UNIT_BEARING})\\([^)]*\\)\\}\\s*(?:FCFA|F)\\b`,
);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/__tests__/.test(full)) out.push(full);
  }
  return out;
}

describe("Garde — devise « FCFA » non dupliquée après un helper qui l'inclut", () => {
  it("aucune occurrence de « …)} F » / « …)} FCFA » après un helper à devise", () => {
    const offenders: string[] = [];
    for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (FORBIDDEN.test(line)) {
          offenders.push(`${relative(ROOT, file)}:${i + 1} ${line.trim()}`);
        }
      });
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("la garde détecte bien une occurrence (non-vacuité)", () => {
    // Si le motif cessait de matcher, le test précédent passerait à vide.
    expect(FORBIDDEN.test("x {formatCurrencyCompact(a)} F")).toBe(true);
    expect(FORBIDDEN.test("x {formatMoney(a)} FCFA")).toBe(true);
    expect(FORBIDDEN.test("x {formatCentsToFCFA(a)} F")).toBe(true);
    // Contre-exemples légitimes : helper SANS devise, ou pas d'unité.
    expect(FORBIDDEN.test("x {formatCurrencyFull(a)} F")).toBe(false);
    expect(FORBIDDEN.test("x {formatCurrencyCompact(a)}")).toBe(false);
  });
});
