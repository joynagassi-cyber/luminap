/**
 * Garde de contraste des tokens de design (contrat Phase 10 — a11y/design).
 *
 * Le catalogue de tokens vit dans `src/App.css` (`:root` / `[data-theme="dark"]`
 * puis `[data-theme="light"]`). On lit cette source de vérité et on vérifie le
 * ratio de contraste WCAG 2.1 des combinaisons *texte sur fond* qui doivent
 * rester lisibles : le texte principal et le texte secondaire, sur le canvas
 * et sur les surfaces, dans les deux modes.
 *
 * Seuil : 4.5:1 (WCAG 2.1 AA, texte normal). Ces quatre paires sont celles sur
 * lesquelles repose la lecture courante de l'app ; elles passent largement
 * aujourd'hui et ce test échoue si une retouche de palette les casse.
 *
 * Écart assumé (documenté dans le receipt) : `--text-tertiary` et
 * `--text-placeholder` sont des teintes d'indice (placeholders, légendes) et
 * descendent sous 4.5:1 par choix esthétique du mode sombre/clair ; ils ne sont
 * donc PAS verrouillés ici pour ne pas figer une régression connue. Idem pour
 * les couleurs de données (revenu/dépense), qui ne portent jamais seules
 * l'information (le signe +/− la porte aussi).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const cssPath = resolve(__dirname, "../../App.css");

/** Extrait un bloc `selecteur { ... }` en tolérant les espaces. */
function block(css: string, selector: string): string {
  const re = new RegExp(
    selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}",
  );
  const m = css.match(re);
  if (!m) throw new Error(`bloc CSS introuvable : ${selector}`);
  return m[1];
}

/** Lit les tokens `--x: #hex;` d'un bloc (en suivant les `var(--x)`). */
function tokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(cssPath, "utf8");
const dark = tokens(block(css, ':root,\n[data-theme="dark"]'));
const light = tokens(block(css, '[data-theme="light"]'));

const AA_NORMAL = 4.5;
const PAIRS: [string, string][] = [
  ["text-primary", "canvas"],
  ["text-primary", "surface"],
  ["text-secondary", "canvas"],
  ["text-secondary", "surface"],
];

describe("contraste des tokens de design (WCAG 2.1 AA, texte normal)", () => {
  it("les tokens requis existent dans les deux modes", () => {
    for (const mode of [dark, light]) {
      for (const [fg, bg] of PAIRS) {
        expect(mode[fg], `token --${fg} manquant`).toBeDefined();
        expect(mode[bg], `token --${bg} manquant`).toBeDefined();
      }
    }
  });

  for (const [modeName, mode] of [
    ["sombre", dark],
    ["clair", light],
  ] as const) {
    for (const [fg, bg] of PAIRS) {
      it(`mode ${modeName} : --${fg} sur --${bg} ≥ ${AA_NORMAL}:1`, () => {
        const ratio = contrast(mode[fg], mode[bg]);
        expect(
          ratio,
          `--${fg} (${mode[fg]}) sur --${bg} (${mode[bg]}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_NORMAL);
      });
    }
  }

  it("la fonction de contraste est correcte (blanc sur noir = 21:1)", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});
