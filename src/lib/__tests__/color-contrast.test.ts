/**
 * Contraste des jetons de couleur — garde de catalogue.
 *
 * Ce fichier verrouille une DÉCISION, pas une implémentation : tout texte posé
 * sur un accent doit atteindre le seuil WCAG AA (4,5:1). Il échoue si un accent
 * est ajouté ou modifié sans que son encre reste lisible.
 *
 * Non-vacuité démontrée : avec l'ancienne règle (`--on-accent: #ffffff` figé),
 * quatre accents sur dix échouent — les assertions ci-dessous les nomment.
 * C'est exactement le défaut que le calcul au runtime corrige.
 */
import { describe, it, expect } from "vitest";
import {
  parseHex,
  relativeLuminance,
  contrastRatio,
  inkOn,
  hasAccessibleInk,
  AA_TEXT,
  AA_LARGE,
} from "@/lib/colorContrast";
import { LUMINA_THEMES } from "@/ionic/themes";

describe("colorContrast — primitives WCAG 2.1", () => {
  it("décompose les hex courts et longs", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("#FF6B00")).toEqual([255, 107, 0]);
    expect(parseHex("nope")).toBeNull();
    expect(parseHex("#12345")).toBeNull();
  });

  it("donne les luminances de référence WCAG", () => {
    // Valeurs de référence : blanc = 1, noir = 0.
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("retrouve des rapports de contraste connus", () => {
    // Noir sur blanc = 21:1, borne haute de l'échelle.
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    // Symétrie : l'ordre des arguments ne change rien.
    expect(contrastRatio("#FF6B00", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#FF6B00"),
      5,
    );
    // Valeur publiée dans docs/design/LUMINAP-UI-UX-ROADMAP.md §2.3.
    expect(contrastRatio("#ffffff", "#FF6B00")).toBeCloseTo(2.86, 1);
  });
});

describe("colorContrast — choix de l'encre sur un accent", () => {
  it("choisit le noir sur un accent clair (orange par défaut)", () => {
    const { ink, ratio } = inkOn("#FF6B00");
    expect(ink).toBe("#000000");
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("choisit le blanc sur un accent foncé", () => {
    const { ink } = inkOn("#4F46E5");
    expect(ink).toBe("#ffffff");
  });

  it("signale un accent pour lequel AUCUNE encre n'atteint AA", () => {
    // Rouge « moyen » : trop clair pour du blanc, trop sombre pour du noir.
    // Le choix doit rester déterministe, mais la garde doit refuser l'accent.
    const { ratio } = inkOn("#DC2626");
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE);
    expect(hasAccessibleInk("#DC2626")).toBe(ratio >= AA_TEXT);
  });
});

describe("catalogue de thèmes — aucun accent illisible", () => {
  // L'assertion centrale de ce fichier. Elle parcourt le catalogue RÉEL :
  // ajouter un thème sans vérifier son contraste fait échouer ce test.
  it.each(LUMINA_THEMES.map((t) => [t.name, t.primary] as const))(
    "« %s » (%s) : texte sur accent ≥ 4,5:1",
    (_name, primary) => {
      const { ink, ratio } = inkOn(primary);
      expect(
        ratio,
        `Accent ${primary} : meilleure encre = ${ink} à ${ratio.toFixed(2)}:1, ` +
          `sous le seuil AA (${AA_TEXT}:1). Choisir un accent plus sombre ou plus clair.`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

  it("couvre bien les 10 thèmes (garde contre un catalogue vide)", () => {
    expect(LUMINA_THEMES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("jetons de texte — lisibilité dans les deux modes", () => {
  /**
   * Valeurs lues dans src/App.css. Si quelqu'un les assombrit ou les éclaircit
   * sans mesurer, ces assertions le lui disent avant la production.
   */
  const DARK = { canvas: "#0f0f10", surface: "#1a1a1c", tertiary: "#8b8b93" };
  const LIGHT = { canvas: "#f7f7f8", surface: "#ffffff", tertiary: "#6b7280" };

  it("mode sombre : --text-tertiary ≥ 4,5:1 sur les deux fonds", () => {
    expect(contrastRatio(DARK.tertiary, DARK.canvas)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(DARK.tertiary, DARK.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("mode clair : --text-tertiary ≥ 4,5:1 sur les deux fonds", () => {
    expect(contrastRatio(LIGHT.tertiary, LIGHT.canvas)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(LIGHT.tertiary, LIGHT.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("conserve une hiérarchie : tertiary reste sous secondary", () => {
    // Sans cet écart, le correctif de contraste aplatirait la hiérarchie
    // visuelle — le risque identifié dans la feuille de route (lot 1).
    const secondaryDark = "#a1a1aa";
    const secondaryLight = "#52525b";
    expect(relativeLuminance(DARK.tertiary)).toBeLessThan(relativeLuminance(secondaryDark));
    expect(relativeLuminance(LIGHT.tertiary)).toBeGreaterThan(relativeLuminance(secondaryLight));
  });
});
