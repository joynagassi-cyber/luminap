import type { ThemeSpec } from "./generator.ts";

/** Seul thème de preuve prévu en P1 ; le catalogue historique reste intact. */
export const VIOLET: ThemeSpec = {
  id: "violet", label: "Violet", accent: "#7C4DFF", accentVivid: "#8A5CFF",
  neutralHue: 295, defaultMode: "dark", surfaceStyle: "flat", hero: "solid",
  tabBar: "pill-active", fab: "circle", radiusScale: 1,
};
