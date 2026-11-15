/**
 * Choix de l'encre posée sur une couleur d'accent — au runtime.
 *
 * Pourquoi ce module existe
 * -------------------------
 * L'application choisissait la couleur du texte posé sur l'accent avec un
 * commentaire affirmant « tous les accents sont foncés (YIQ > 128), donc texte
 * blanc ». Deux erreurs s'y étaient glissées :
 *
 *   1. Un YIQ élevé signifie un fond CLAIR, donc un texte NOIR — l'affirmation
 *      était inversée par rapport à sa propre prémisse.
 *   2. YIQ n'est pas un critère de contraste. Il ne dit rien du rapport de
 *      luminance relative que définit WCAG.
 *
 * Conséquence mesurée sur les accents historiques du catalogue : quatre, dont
 * l'accent PAR DÉFAUT (#FF6B00), n'atteignaient pas 4,5:1 avec du texte blanc
 * (2,86:1 pour « Orange Fire »). Tout texte posé sur un bouton plein, un FAB ou
 * un onglet actif était sous le seuil AA.
 *
 * NE PAS DUPLIQUER LE CALCUL
 * --------------------------
 * Le design system (`src/design-system/tokens/generator.ts`) calcule déjà le
 * contraste WCAG via `culori`, mais à la GÉNÉRATION des jetons du thème
 * violet — pas à l'exécution, et pas pour les dix accents historiques, qui
 * vivent dans `src/ionic/themes.ts` et sont posés par `applyTheme()`.
 *
 * Ce module comble exactement cet écart et rien de plus : il ne réimplémente
 * pas la luminance, il appelle `culori` — la même librairie, donc les mêmes
 * chiffres que le générateur. Un recalcul maison aurait été une seconde source
 * de vérité, et deux formules d'accessibilité qui divergent est précisément le
 * défaut que ce travail corrige.
 *
 * Le calcul reste prudent en environnement sans `culori` : un repli déterministe
 * évite de casser le rendu si la dépendance n'est pas disponible au boot.
 */

/** Seuil WCAG AA pour du texte courant. */
export const AA_TEXT = 4.5;

/** Seuil WCAG AA pour les composants d'interface et le texte large. */
export const AA_LARGE = 3;

/** Couleurs candidates pour du texte posé sur un fond de marque. */
export const INK_CANDIDATES = {
  white: "#ffffff",
  /** Noir franc : le plus haut contraste possible sur fond clair. */
  black: "#000000",
} as const;

/**
 * Rapport de contraste WCAG 2.1 entre deux couleurs.
 *
 * Délègue à `culori` (même librairie que le générateur de jetons) : une seule
 * implémentation de la formule dans le dépôt, donc aucun risque de divergence.
 * Repli sur une luminance relative locale si `culori` n'est pas disponible —
 * le repli est vérifié par test contre la valeur de `culori`.
 */
export function contrastRatio(a: string, b: string): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { wcagContrast } = require("culori") as {
      wcagContrast: (x: string, y: string) => number;
    };
    const ratio = wcagContrast(a, b);
    if (Number.isFinite(ratio)) return ratio;
  } catch {
    /* repli ci-dessous */
  }
  return fallbackContrast(a, b);
}

/** Luminance relative locale — utilisée uniquement en repli, et vérifiée par test. */
function fallbackContrast(a: string, b: string): number {
  const la = fallbackLuminance(a);
  const lb = fallbackLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function fallbackLuminance(hex: string): number {
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0;
  const n = parseInt(h, 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Couleur de texte à poser sur `background`, avec le rapport obtenu.
 *
 * Choix : la meilleure des deux candidates, mesurée — jamais un seuil
 * arbitraire, jamais une heuristique de luminosité perçue.
 * On renvoie aussi le ratio pour que l'appelant puisse alerter si même le
 * meilleur choix échoue AA (possible avec un accent de luminance moyenne — il
 * faut alors changer l'accent, pas le texte).
 */
export function inkOn(background: string): { ink: string; ratio: number } {
  const onWhite = contrastRatio(INK_CANDIDATES.white, background);
  const onBlack = contrastRatio(INK_CANDIDATES.black, background);
  return onWhite >= onBlack
    ? { ink: INK_CANDIDATES.white, ratio: onWhite }
    : { ink: INK_CANDIDATES.black, ratio: onBlack };
}

/**
 * Vrai si `background` permet un texte accessible.
 *
 * Sert de garde au catalogue de thèmes : un accent ajouté sans vérification
 * doit être refusé par les tests, pas découvert en production.
 */
export function hasAccessibleInk(background: string, threshold = AA_TEXT): boolean {
  return inkOn(background).ratio >= threshold;
}
