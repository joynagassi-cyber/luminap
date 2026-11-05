import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { wcagContrast } from "culori";
import { accessibleAccent, createCustomTheme, generatePrimitives, generateTokens } from "@/design-system/tokens/generator";
import { VIOLET } from "@/design-system/tokens/themes";
import { renderBridgeTs, renderThemeCss } from "../../../scripts/generate-design-tokens.mjs";
import { LUMINA_TOKENS, LUMINA_LIGHT_TOKENS } from "@/ionic/theme";

const root = new URL("../../design-system/tokens/", import.meta.url);
const pairs: [string, string, number][] = [
  ["fg", "bg", 4.5], ["fg", "surface", 4.5], ["fg", "surface-2", 4.5],
  ["fg-muted", "bg", 4.5], ["fg-muted", "surface", 4.5], ["fg-muted", "surface-2", 4.5],
  ["fg-subtle", "bg", 3], ["fg-subtle", "surface", 3], ["fg-subtle", "surface-2", 3],
  ["fg-inverse", "surface-inverse", 4.5], ["hero-fg", "hero-bg", 4.5],
  ["on-accent", "accent", 4.5], ["accent", "bg", 4.5], ["accent", "surface", 4.5], ["accent", "surface-2", 4.5], ["income", "surface", 4.5], ["expense", "surface", 4.5],
  ["income", "surface-2", 4.5], ["expense", "surface-2", 4.5],
  ["warning", "surface-2", 4.5], ["info", "surface-2", 4.5], ["focus-ring", "surface", 3],
];

describe("génération déterministe des jetons", () => {
  it("le CSS versionné correspond exactement au générateur", () => {
    expect(readFileSync(new URL("themes.generated.css", root), "utf8")).toBe(renderThemeCss([VIOLET]));
    expect(readFileSync(new URL("bridge.generated.ts", root), "utf8")).toBe(renderBridgeTs(VIOLET));
    expect(() => renderThemeCss([{ ...VIOLET, id: 'bad"] { color:red; }' }])).toThrow();
  });
  it("chaque jeton sémantique généré existe comme alias pour le thème actuel", () => {
    const css = readFileSync(new URL("semantic.css", root), "utf8");
    for (const key of Object.keys(generateTokens(VIOLET, "dark"))) {
      expect(css, `--lu-${key}`).toMatch(new RegExp(`--lu-${key}\\s*:`));
    }
  });
  it("produit les échelles internes en sRGB et applique radiusScale", () => {
    const primitives = generatePrimitives(VIOLET);
    expect(Object.keys(primitives.accent)).toEqual(["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"]);
    expect(Object.keys(primitives.neutral)).toEqual(["0", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"]);
    for (const color of [...Object.values(primitives.accent), ...Object.values(primitives.neutral)]) expect(color).toMatch(/^#[0-9a-f]{6}$/);
    const tokens = generateTokens({ ...VIOLET, radiusScale: 1.1 }, "light");
    expect(tokens["radius-md"]).toBe("17.6px");
    expect(tokens["radius-pill"]).toBe("999px");
  });
  it("valide les entrées custom au lieu de générer du CSS invalide", () => {
    for (const invalid of ["red", "#fff", "#ffffff00", "#zzzzzz", "#fff; color:red", ""]) {
      expect(() => createCustomTheme(invalid)).toThrow();
    }
    expect(() => generateTokens({ ...VIOLET, fontBody: 'Inter";color:red' }, "dark")).toThrow();
  });
  it.each(["dark", "light"] as const)("violet %s : accent pressé compatible avec son texte", (mode) => {
    const t = generateTokens(VIOLET, mode);
    expect(wcagContrast(t["on-accent"], t["accent-pressed"])).toBeGreaterThanOrEqual(4.5);
  });
  it("le choix noir/blanc est vérifié après quantification et passe AA", () => {
    for (let value = 0; value <= 0xffffff; value += 7919) {
      const color = `#${value.toString(16).padStart(6, "0")}`;
      const { accent, onAccent } = accessibleAccent(color);
      expect(wcagContrast(accent, onAccent), color).toBeGreaterThanOrEqual(4.5);
      expect(wcagContrast(accent, onAccent)).toBeGreaterThanOrEqual(wcagContrast(accent, onAccent === "#000000" ? "#ffffff" : "#000000"));
    }
  });
});

describe("contrastes des thèmes générés (avant publication)", () => {
  const specs = [VIOLET, ...["#000000", "#ffffff", "#ff6b00", "#7c4dff", "#00ff00", "#808080", "#ff0055"].map(createCustomTheme)];
  for (const spec of specs) for (const mode of ["dark", "light"] as const) {
    it(`${spec.id} ${spec.accent} ${mode} : toutes les paires documentées`, () => {
      const tokens = generateTokens(spec, mode);
      for (const [fg, bg, min] of pairs) {
        expect(wcagContrast(tokens[fg], tokens[bg]), `${fg}/${bg} (${tokens[fg]} / ${tokens[bg]})`).toBeGreaterThanOrEqual(min);
      }
    });
  }
});

describe("C6 sur le thème historique", () => {
  for (const [mode, tokens] of [["dark", LUMINA_TOKENS], ["light", LUMINA_LIGHT_TOKENS]] as const) {
    it(`${mode} : texte tertiaire ≥ 3:1 sur les surfaces`, () => {
      for (const bg of [tokens.canvas, tokens.surface, tokens.surfaceHover, tokens.surfaceActive]) {
        expect(wcagContrast(tokens.textTertiary, bg), `${tokens.textTertiary} / ${bg}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
