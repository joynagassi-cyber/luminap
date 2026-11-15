/**
 * Contraste WCAG 2.1 — calcul réel, pas heuristique.
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
 *      luminance relatif que définit WCAG.
 *
 * Conséquence mesurée sur les 10 accents du catalogue : quatre d'entre eux,
 * dont l'accent PAR DÉFAUT (#FF6B00), n'atteignaient pas 4,5:1 avec du texte
 * blanc (2,86:1 pour « Orange Fire »). Tout texte posé sur un bouton plein, un
 * FAB ou un onglet actif était sous le seuil AA.
 *
 * On remplace donc le choix figé par un calcul, exécuté au moment où le thème
 * est appliqué : pour chaque accent, on retient la couleur de texte qui offre
 * le meilleur rapport de contraste. C'est déterministe, testable, et cela
 * couvre automatiquement tout accent ajouté plus tard.
 *
 * Le calcul suit WCAG 2.1 §1.4.3 (relative luminance), sans arrondi
 * intermédiaire, afin que les valeurs publiées dans les commentaires et celles
 * vérifiées par les tests soient identiques.
 */

/** Seuil WCAG AA pour du texte courant. */
export const AA_TEXT = 4.5;

/** Seuil WCAG AA pour les composants d'interface et le texte large. */
export const AA_LARGE = 3;

/** Décompose `#rrggbb` (ou `#rgb`) en canaux 0–255. */
export function parseHex(hex: string): [number, number, number] | null {
  if (typeof hex !== "string") return null;
  const h = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$/.test(h) && !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Luminance relative (WCAG 2.1, §1.4.3).
 * Chaque canal est linéarisé avant pondération — c'est cette étape que les
 * heuristiques type YIQ sautent, et c'est elle qui rend le résultat correct.
 */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste entre deux couleurs (1 à 21). Symétrique. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Couleurs candidates pour du texte posé sur un fond de marque. */
export const INK_CANDIDATES = {
  white: "#ffffff",
  /** Noir franc : le plus haut contraste possible sur fond clair. */
  black: "#000000",
} as const;

/**
 * Couleur de texte à poser sur `background`, avec le rapport obtenu.
 *
 * Choix : la meilleure des deux candidates, jamais un seuil arbitraire. On
 * renvoie aussi le ratio pour que l'appelant puisse alerter si même le
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
 * doit être refusé par les tests, pas découvrir le problème en production.
 */
export function hasAccessibleInk(background: string, threshold = AA_TEXT): boolean {
  return inkOn(background).ratio >= threshold;
}
