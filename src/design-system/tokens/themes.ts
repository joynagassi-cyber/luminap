import type { ThemeSpec } from "./generator.ts";

/** Seul thème de preuve prévu en P1 ; le catalogue historique reste intact. */
export const VIOLET: ThemeSpec = {
  id: "violet", label: "Violet", accent: "#7C4DFF", accentVivid: "#8A5CFF",
  neutralHue: 295, defaultMode: "dark", surfaceStyle: "flat", hero: "solid",
  tabBar: "pill-active", fab: "circle", radiusScale: 1,
};

/**
 * Registre des thèmes publiés par le générateur. Le test de contraste AA
 * (P1 lot 5) itère ce registre × les deux modes : tout thème ajouté ici doit
 * passer 4.5:1 sur les paires documentées, sinon la CI casse (un thème qui
 * échoue n'est pas publié — spec §0.3).
 */
export const THEME_SPECS: readonly ThemeSpec[] = [VIOLET];
