/**
 * P1 lot 5 — Test de contraste étendu (spec §8) : pour chaque thème publié
 * (registre THEME_SPECS) × mode (dark/light) + `custom` (génération à partir
 * d'un hex arbitraire), les paires documentées doivent atteindre WCAG AA
 * 4.5:1. Échec = CI rouge.
 *
 * Paires verrouillées (spec §8) : fg/bg, fg-muted/surface, on-accent/accent,
 * income/surface, expense/surface — plus hero-fg/hero-bg (le hero plein est la
 * grande surface d'accent de la spec).
 *
 * Le catalogue historique des 10 accents (src/ionic/themes.ts) est audité
 * séparément : il est « porté à l'identique » en P1, donc on ne change pas ses
 * couleurs, mais on verrouille l'écart connu (blanc sur accent < AA pour
 * certains) pour interdire toute dérive et préparer l'unification P4/P5.
 */
import { describe, expect, it } from "vitest";
import { clampChroma, converter, formatHex, wcagContrast } from "culori";
import {
  createCustomTheme,
  generateTokens,
  type ThemeSpec,
} from "@/design-system/tokens/generator";
import { THEME_SPECS } from "@/design-system/tokens/themes";
import { LUMINA_THEMES } from "@/ionic/themes";

/** Paires texte/fond exigées à 4.5:1 (WCAG 2.1 AA, texte normal). */
const AA_PAIRS: [string, string][] = [
  ["fg", "bg"],
  ["fg-muted", "surface"],
  ["on-accent", "accent"],
  ["income", "surface"],
  ["expense", "surface"],
  ["hero-fg", "hero-bg"],
];
const AA = 4.5;

function expectAa(spec: ThemeSpec, mode: "dark" | "light") {
  const tokens = generateTokens(spec, mode);
  for (const [fg, bg] of AA_PAIRS) {
    const ratio = wcagContrast(tokens[fg], tokens[bg]);
    expect(
      ratio,
      `${spec.id} ${mode} : ${fg}/${bg} = ${tokens[fg]} sur ${tokens[bg]} (${ratio.toFixed(2)}:1)`,
    ).toBeGreaterThanOrEqual(AA);
  }
}

describe("P1 lot 5 — contraste AA de chaque thème publié × mode", () => {
  // Le gate P1 exige à terme 6 thèmes × 2 modes = 12 combinaisons ; le test
  // itère le registre, donc chaque nouveau ThemeSpec y est automatiquement
  // verrouillé.
  for (const spec of THEME_SPECS) {
    for (const mode of ["dark", "light"] as const) {
      it(`${spec.id} (${spec.accent}) ${mode} : toutes les paires ≥ 4.5:1`, () => {
        expectAa(spec, mode);
      });
    }
  }
});

describe("P1 lot 5 — thème `custom` : génération + ajustement AA automatique", () => {
  const toOklch = converter("oklch");
  // Grille hue × luminosité couvrant la roue chromatique (y compris les
  // cas limites clair/sombre) : l'accent custom vient d'une saisie admin.
  const samples: string[] = [];
  for (let h = 0; h < 360; h += 30) {
    for (const l of [0.45, 0.6, 0.75, 0.9]) {
      samples.push(formatHex(clampChroma({ mode: "oklch", l, c: 0.15, h }, "oklch", "rgb")));
    }
  }
  samples.push("#000000", "#ffffff", "#808080", "#ff0055");

  it("tout hex valide génère un thème custom AA dans les deux modes", () => {
    for (const hex of samples) {
      const spec = createCustomTheme(hex);
      expectAa(spec, "dark");
      expectAa(spec, "light");
    }
  });

  it("le choix noir/blanc de on-accent maximise le contraste réel", () => {
    for (const hex of samples) {
      const { accent, onAccent } = (() => {
        // accessibleAccent via le thème custom : on-accent doit être le
        // meilleur des deux, après quantification hex.
        const tokens = generateTokens(createCustomTheme(hex), "dark");
        return { accent: tokens["accent"], onAccent: tokens["on-accent"] };
      })();
      const other = onAccent === "#000000" ? "#ffffff" : "#000000";
      expect(wcagContrast(accent, onAccent)).toBeGreaterThanOrEqual(AA);
      expect(wcagContrast(accent, onAccent)).toBeGreaterThanOrEqual(wcagContrast(accent, other));
      expect(toOklch(accent)).toBeTruthy();
    }
  });

  it("les hex invalides sont rejetés (pas de CSS fabriqué)", () => {
    for (const invalid of ["red", "#fff", "#ffffffff", "#gggggg", "", "#123456;"]) {
      expect(() => createCustomTheme(invalid)).toThrow();
    }
  });
});

describe("P1 lot 5 — audit du catalogue historique (porté à l'identique en P1)", () => {
  // --on-accent historique vaut #ffffff (src/App.css). Quatre accents ne
  // passent pas AA avec du blanc ; c'est l'écart documenté (tokens/README),
  // à corriger lors de l'unification des catalogues (P4/P5), pas en P1 pour
  // ne pas changer l'apparence du thème actuel.
  const KNOWN_SUB_AA_WITH_WHITE = new Set(["fire", "emerald", "care", "know"]);

  it("chaque accent historique atteint AA avec noir OU blanc (correctif disponible)", () => {
    for (const theme of LUMINA_THEMES) {
      const best = Math.max(
        wcagContrast(theme.primary, "#ffffff"),
        wcagContrast(theme.primary, "#000000"),
      );
      expect(best, `${theme.id} ${theme.primary}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("l'écart connu blanc-sur-accent est exactement celui documenté (pas de dérive)", () => {
    const subAa = LUMINA_THEMES.filter(
      (t) => wcagContrast(t.primary, "#ffffff") < AA,
    ).map((t) => t.id);
    expect(new Set(subAa)).toEqual(KNOWN_SUB_AA_WITH_WHITE);
  });
});
