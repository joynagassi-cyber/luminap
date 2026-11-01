/**
 * Garde anti-récurrence — conversion de montant par suppression des non-chiffres.
 *
 * Anti-pattern mesuré : `Number(x.replace(/[^\d]/g, "")) * 100`. En retirant
 * TOUT caractère non numérique, il détruit la virgule décimale FR :
 * « 1500,50 » → « 150050 » → 15005000 centimes (au lieu de 150050). La
 * source de vérité est `parseAmountToCents` (`@/lib/amountInput`).
 *
 * La garde échoue sur toute occurrence dans `src/` (hors tests).
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
  join(ROOT, "src", "updater"),
];

// Suppression de tous les non-chiffres puis conversion en nombre…
const STRIP = /replace\(\s*\/\[\^\\d\]\/g\s*,\s*""\s*\)/;
// …et le produit par 100 (passage en centimes) qui suit la même expression.
const FORBIDDEN = new RegExp(
  `Number\\([^)]*${STRIP.source}[^)]*\\)[^\\n]*\\*\\s*100`,
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

describe("Garde — conversion montant sans détruire la décimale", () => {
  it("aucun `Number(x.replace(/[^\\d]/g,'')) * 100` dans src/", () => {
    const offenders: string[] = [];
    for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (FORBIDDEN.test(line)) {
            offenders.push(`${relative(ROOT, file)}:${i + 1} ${line.trim()}`);
          }
        });
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("la garde détecte bien l'anti-pattern (non-vacuité)", () => {
    expect(
      FORBIDDEN.test(
        'target_amount_cents: Math.round((Number(input.target.replace(/[^\\d]/g, "")) || 0) * 100),',
      ),
    ).toBe(true);
    // Contre-exemples légitimes : parseAmountToCents, ou simple nettoyage.
    expect(FORBIDDEN.test("const cents = parseAmountToCents(input.target);")).toBe(
      false,
    );
    expect(FORBIDDEN.test('const digits = x.replace(/[^\\d]/g, "");')).toBe(false);
  });
});
