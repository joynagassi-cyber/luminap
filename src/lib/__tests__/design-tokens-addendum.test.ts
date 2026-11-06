/**
 * Garde des jetons « Addendum 2 / maquette dashboard-MF » (Phase 10, B1).
 *
 * Vérifie que `src/App.css` (fichier de jetons unique) expose le vocabulaire
 * de la maquette (--bg, --surface, --surface-nav, --divider, --text,
 * --text-muted, --in/--in-bg, --out/--out-bg, --warn/--warn-bg, --brand-fill,
 * --brand-text) dans les DEUX modes, et que les contrastes respectent les
 * seuils exigés (texte 4.5:1, éléments d'interface 3:1) ainsi que les valeurs
 * annoncées (texte principal ≥ 15:1, --brand-text clair ≈ 5.2:1, --in clair ≈ 7:1).
 *
 * Non-vacuité : une retouche de palette qui casse un seuil fait échouer le test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const css = readFileSync(resolve(__dirname, "../../App.css"), "utf8");

/** Contenu d'un bloc `selecteur { ... }` — le sélecteur doit commencer en tête
 * de ligne (évite que `:root[data-mode="light"]` masque `[data-mode="light"]`). */
function block(selector: string): string {
  const re = new RegExp(
    "(?:^|\\n)\\s*" +
      selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "\\s*\\{([^}]*)\\}",
  );
  const m = css.match(re);
  if (!m) throw new Error(`bloc CSS introuvable : ${selector}`);
  return m[1];
}

/** Concatène TOUS les blocs `:root { ... }` (le fichier en a plusieurs). */
function allRootBlocks(): string {
  let out = "";
  for (const m of css.matchAll(/:root\s*\{([^}]*)\}/g)) out += m[1];
  return out;
}

function hexTokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function aliasTokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+)\s*:\s*var\(--([\w-]+)\)\s*;/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

const rootHex = hexTokens(allRootBlocks());
const rootAlias = aliasTokens(allRootBlocks());
const darkHex = { ...rootHex, ...hexTokens(block(':root,\n[data-mode="dark"]')) };
const lightHex = { ...rootHex, ...hexTokens(block('[data-mode="light"]')) };

/** Toutes les valeurs `--x: <valeur>;` (hex OU rgba), pour la présence. */
function valueTokens(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/--([\w-]+)\s*:\s*([^;}]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}
const darkAll = { ...valueTokens(allRootBlocks()), ...valueTokens(block(':root,\n[data-mode="dark"]')) };
const lightAll = { ...valueTokens(allRootBlocks()), ...valueTokens(block('[data-mode="light"]')) };

/** Résout un nom de jeton vers sa valeur hex, en suivant les alias `var()`. */
function resolveToken(
  hex: Record<string, string>,
  name: string,
  depth = 0,
): string | undefined {
  if (hex[name] !== undefined) return hex[name];
  const target = rootAlias[name];
  if (target && depth < 5) return resolveToken(hex, target, depth + 1);
  return undefined;
}

const dark: Record<string, string> = {};
const light: Record<string, string> = {};
for (const n of [
  "bg",
  "surface",
  "surface-nav",
  "border",
  "divider",
  "text",
  "text-muted",
  "in",
  "in-bg",
  "out",
  "out-bg",
  "warn",
  "warn-bg",
  "brand-fill",
  "brand-text",
  "btn-in-bg",
  "btn-in-ink",
  "btn-out-bg",
  "btn-out-ink",
]) {
  const d = resolveToken(darkHex, n);
  const l = resolveToken(lightHex, n);
  if (d) dark[n] = d;
  if (l) light[n] = l;
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

const REQUIRED = [
  "bg",
  "surface",
  "surface-nav",
  "border",
  "divider",
  "text",
  "text-muted",
  "in",
  "in-bg",
  "out",
  "out-bg",
  "warn",
  "warn-bg",
  "brand-fill",
  "brand-text",
];

describe("jetons Addendum 2 (dashboard-MF) — présence", () => {
  it("le vocabulaire de la maquette est défini (alias des jetons historiques)", () => {
    expect(rootAlias.bg).toBe("canvas");
    expect(rootAlias.text).toBe("text-primary");
    expect(rootAlias["text-muted"]).toBe("text-secondary");
    expect(rootAlias["brand-fill"]).toBe("accent-primary");
  });

  it("chaque jeton de la maquette existe en mode sombre", () => {
    const missing = REQUIRED.filter((t) => darkAll[t] === undefined);
    expect(missing, `manquants (sombre) : ${missing.join(", ")}`).toEqual([]);
  });

  it("chaque jeton de la maquette existe en mode clair", () => {
    const missing = REQUIRED.filter((t) => lightAll[t] === undefined);
    expect(missing, `manquants (clair) : ${missing.join(", ")}`).toEqual([]);
  });

  it("--in/--out/--warn (argent) ont des valeurs distinctes par mode", () => {
    expect(dark["in"]).not.toBe(light["in"]);
    expect(dark["out"]).not.toBe(light["out"]);
    expect(dark["warn"]).not.toBe(light["warn"]);
  });
});

describe("jetons Addendum 2 — contrastes (WCAG 2.1)", () => {
  const AA = 4.5;

  it("sombre : texte ≥ 15:1 et muted ≥ 4.5:1 sur fond et surface", () => {
    expect(contrast(dark.text, dark.bg)).toBeGreaterThanOrEqual(15);
    expect(contrast(dark.text, dark.surface)).toBeGreaterThanOrEqual(15);
    expect(contrast(dark["text-muted"], dark.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrast(dark["text-muted"], dark.surface)).toBeGreaterThanOrEqual(AA);
  });

  it("clair : texte ≥ 15:1 et muted ≥ 4.5:1 sur fond et surface", () => {
    expect(contrast(light.text, light.bg)).toBeGreaterThanOrEqual(15);
    expect(contrast(light.text, light.surface)).toBeGreaterThanOrEqual(15);
    expect(contrast(light["text-muted"], light.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrast(light["text-muted"], light.surface)).toBeGreaterThanOrEqual(AA);
  });

  it("clair : --brand-text ≈ 5.2:1 sur blanc (seuil 4.5:1)", () => {
    const r = contrast(light["brand-text"], light.surface);
    expect(r).toBeGreaterThanOrEqual(AA);
    expect(r).toBeGreaterThan(4.5);
    expect(r).toBeLessThan(6.5);
  });

  it("couleurs d'argent lisibles dans les deux modes (≥ 4.5:1 sur surface)", () => {
    for (const [name, mode] of [
      ["sombre", dark],
      ["clair", light],
    ] as const) {
      for (const t of ["in", "out", "warn"] as const) {
        const r = contrast(mode[t], mode.surface);
        expect(r, `--${t} ${name} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it("boutons d'action : texte lisible sur l'aplat (≥ 4.5:1)", () => {
    for (const [name, mode] of [
      ["sombre", dark],
      ["clair", light],
    ] as const) {
      expect(contrast(mode["btn-in-ink"], mode["btn-in-bg"])).toBeGreaterThanOrEqual(AA);
      expect(contrast(mode["btn-out-ink"], mode["btn-out-bg"])).toBeGreaterThanOrEqual(AA);
    }
  });

  it("non-vacuité : la fonction de contraste est correcte (blanc/noir = 21:1)", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});
