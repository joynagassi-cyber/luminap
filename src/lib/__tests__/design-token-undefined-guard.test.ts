/**
 * Garde des jetons de design INDÉFINIS (intégrité du vocabulaire).
 *
 * Classe de défaut visée : un `var(--X)` référence un jeton qui n'est défini
 * nulle part dans `src`. Sans repli, la déclaration CSS est invalide et la
 * propriété retombe sur sa valeur initiale (souvent `transparent` / héritée) :
 * un texte ou une icône disparaît silencieusement. Avec repli, le jeton
 * « fantôme » masque l'écart mais fige une valeur qui ne suit plus le thème.
 * Les deux cas sont comptés comme des références non définies.
 *
 * Les jetons injectés au runtime par des dépendances (Radix, primitives
 * shadcn/ui) ne sont pas déclarés dans le dépôt : ils sont exclus par préfixe.
 *
 * Non-vacuité : `detectUndefined` doit signaler un jeton fabriqué ; sinon le
 * test « auto-vérification » échoue.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const SRC = resolve(__dirname, "../..");
const EXT = /\.(ts|tsx|css)$/;

/** Jetons fournis par une dépendance au runtime, absents du dépôt. */
const RUNTIME_PREFIXES = ["radix-", "sidebar-", "tw-"];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === "__tests__")
        continue;
      walk(p, out);
    } else if (EXT.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function isRuntimeToken(token: string): boolean {
  return RUNTIME_PREFIXES.some((p) => token.startsWith(p));
}

/** Jetons définis (`--x:`) et référencés (`var(--x`) dans un ensemble de fichiers. */
function collect(files: string[]) {
  const defined = new Set<string>();
  const referenced = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/--([\w-]+)\s*:/g)) defined.add(m[1]);
    for (const m of src.matchAll(/var\(\s*--([\w-]+)/g)) referenced.add(m[1]);
  }
  return { defined, referenced };
}

function detectUndefined(
  defined: Set<string>,
  referenced: Set<string>,
): string[] {
  return [...referenced]
    .filter((t) => !defined.has(t) && !isRuntimeToken(t))
    .sort();
}

describe("intégrité des jetons de design (références définies)", () => {
  it("aucun var(--X) applicatif ne référence un jeton non défini", () => {
    const files = walk(SRC);
    const { defined, referenced } = collect(files);
    const ghosts = detectUndefined(defined, referenced);
    expect(
      ghosts,
      `jetons référencés mais jamais définis :\n${ghosts.map((g) => `  --${g}`).join("\n")}`,
    ).toEqual([]);
  });

  it("non-vacuité : un jeton fantôme est bien détecté", () => {
    const defined = new Set(["canvas"]);
    const referenced = new Set(["canvas", "ghost-token"]);
    expect(detectUndefined(defined, referenced)).toEqual(["ghost-token"]);
  });

  it("non-vacuité : un jeton de dépendance (radix-) n'est pas signalé", () => {
    const defined = new Set<string>();
    const referenced = new Set(["radix-select-trigger-width"]);
    expect(detectUndefined(defined, referenced)).toEqual([]);
  });
});
