// @vitest-environment node
/**
 * Garde — fuite d'URL d'objet (`URL.createObjectURL`).
 *
 * PROBLÈME VISÉ (classe R447/R448/R175 — capacité navigateur mal gérée)
 * ---------------------------------------------------------------------
 * `URL.createObjectURL(blob)` alloue une URL qui **retient le blob en mémoire
 * jusqu'à `URL.revokeObjectURL`**. Appelée dans un attribut JSX (`src={…}`),
 * elle est recréée à CHAQUE render (donc à chaque frappe d'un formulaire) sans
 * jamais être révoquée → fuite mémoire qui s'accumule dans la WebView d'une app
 * mobile longue durée. Constaté en vrai dans `TransactionNew.tsx` (aperçus de
 * preuves de dépense), corrigé par `useMemo` + `useEffect` de révocation.
 *
 * RÈGLE
 * -----
 * `URL.createObjectURL` est interdit dans un attribut JSX (`src=`/`href=`) :
 * l'URL doit être créée une fois (mémo) et révoquée au démontage.
 *
 * Non-vacuité : réintroduire `src={URL.createObjectURL(p)}` fait échouer la garde.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const SRC = join(root, "src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") return [];
      return walk(full);
    }
    return [full];
  });
}

describe("pas de fuite d'URL d'objet en attribut JSX", () => {
  it("`URL.createObjectURL` n'est jamais appelé dans un attribut JSX", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC).filter((f) => /\.tsx?$/.test(f))) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/(src|href)=\{[^}]*URL\.createObjectURL/.test(line)) {
            offenders.push(
              `${file.replace(`${root}/`, "")}:${i + 1} → ${line.trim()}`,
            );
          }
        });
    }
    expect(
      offenders,
      "Créer l'URL une fois (`useMemo`) et la révoquer (`URL.revokeObjectURL`) " +
        "au démontage, au lieu de l'appeler dans un attribut JSX :",
    ).toEqual([]);
  });
});
