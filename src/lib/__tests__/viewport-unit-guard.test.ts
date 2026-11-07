// @vitest-environment node
/**
 * Garde — unités viewport (`100dvh`).
 *
 * PROBLÈME VISÉ (classe R447/R448/R175)
 * ------------------------------------
 * Sur mobile/WebView, `100vh` correspond à la hauteur du viewport **le plus
 * grand** (barres d'URL/toolbar incluses) : il **dépasse** le viewport visible
 * et empêche d'atteindre le bas de page. La hauteur correcte est `100dvh`
 * (dynamic viewport). La règle est documentée dans `src/globals.css`, mais
 * `#root` (App.css), `body` (globals.css) et le fallback de `App.tsx` étaient
 * restés en `100vh` — incohérence réelle.
 *
 * RÈGLE
 * -----
 *  - CSS : toute déclaration `100vh` doit être **immédiatement suivie** d'un
 *    repli `100dvh` (les WebView anciennes ignorent `dvh` et gardent `vh`).
 *  - Inline (`.tsx`/`.ts`) : `100vh` interdit (pas de double-déclaration
 *    possible dans un objet de style) → utiliser `100dvh`.
 *
 * Non-vacuité : retirer le repli `100dvh`, ou écrire `minHeight: "100vh"`,
 * fait échouer la garde.
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

const files = walk(SRC);
const rel = (p: string) => p.replace(`${root}/`, "");
const stripCssComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** Fichiers CSS scannés : les `.css` de `src` + le style pré-paint d'index.html. */
function cssSources(): { name: string; content: string }[] {
  const sources = files
    .filter((f) => f.endsWith(".css"))
    .map((f) => ({ name: rel(f), content: readFileSync(f, "utf8") }));
  sources.push({ name: "index.html", content: readFileSync(join(root, "index.html"), "utf8") });
  return sources;
}

describe("unités viewport — 100dvh obligatoire (WebView Android)", () => {
  it("chaque déclaration CSS `100vh` est suivie d'un repli `100dvh`", () => {
    const offenders: string[] = [];
    for (const { name, content } of cssSources()) {
      const lines = stripCssComments(content).split("\n");
      lines.forEach((line, i) => {
        if (!/\b100vh\b/.test(line) || /100dvh/.test(line)) return;
        const next = lines[i + 1] ?? "";
        if (!/100dvh/.test(next)) {
          offenders.push(`${name}:${i + 1} → ${line.trim()}`);
        }
      });
    }
    expect(
      offenders,
      "Ajouter un repli `100dvh` sur la ligne juste après chaque `100vh`.",
    ).toEqual([]);
  });

  it("aucun style inline n'utilise `100vh` (utiliser `100dvh`)", () => {
    const offenders: string[] = [];
    for (const file of files.filter((f) => /\.tsx?$/.test(f))) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/["'`][^"'`]*\b100vh\b[^"'`]*["'`]/.test(line)) {
            offenders.push(`${rel(file)}:${i + 1} → ${line.trim()}`);
          }
        });
    }
    expect(offenders, "Remplacer `100vh` par `100dvh` dans les styles inline.").toEqual(
      [],
    );
  });
});
