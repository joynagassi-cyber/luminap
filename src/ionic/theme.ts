/**
 * Lumina Ionic Theme Configuration
 *
 * Maps Lumina CSS design tokens to Ionic CSS variables. Dark mode by
 * default; the light mode is a parallel palette.
 *
 * Since src/ionic/theme.css already points every `--ion-*` neutral at the
 * semantic CSS tokens (`var(--canvas)`, `var(--surface)`…), switching
 * `[data-theme]` on <html> flips the whole Ionic surface automatically.
 * The JS layer below only re-sets the vars that theme.css cannot express
 * as CSS vars (the `-rgb` triplets and the `ion-theme`/`color-theme`
 * attributes) and stays idempotent / SSR-safe.
 */

import type { ThemeMode } from "./themes";

// Lumina design tokens — dark mode (default).
const LUMINA_TOKENS = {
  canvas: "#0F0F10",
  surface: "#1A1A1C",
  surfaceHover: "#232326",
  surfaceActive: "#2C2C30",
  border: "#2C2C30",
  textPrimary: "#F4F4F5",
  textSecondary: "#A1A1AA",
  textTertiary: "#71717A",
  textPlaceholder: "#535353",
  in: "#4ADE80",
  out: "#F87171",
  warn: "#FBBF24",
  accentPrimary: "#FF6B00",
  accentLight: "#FF8533",
  accentDark: "#CC5500",
} as const;

type ModeTokens = { [K in keyof typeof LUMINA_TOKENS]: string };

/** Lumina design tokens — light mode. Seuls les neutres + l'argent changent
 *  de valeur ; l'accent suit le thème d'organisation (jamais le mode). */
const LUMINA_LIGHT_TOKENS: ModeTokens = {
  ...LUMINA_TOKENS,
  canvas: "#F7F7F8",
  surface: "#FFFFFF",
  surfaceHover: "#EEF0F2",
  surfaceActive: "#E4E6E9",
  border: "#E4E4E7",
  textPrimary: "#18181B",
  textSecondary: "#52525B",
  textTertiary: "#8A8F96",
  textPlaceholder: "#9AA0A8",
  in: "#166534",
  out: "#B91C1C",
  warn: "#92400E",
};

const MODE_TOKENS: Record<"dark" | "light", ModeTokens> = {
  dark: LUMINA_TOKENS,
  light: LUMINA_LIGHT_TOKENS,
};

function hexToRgbTriplets(hexes: string[]): string {
  return hexes
    .map((hex) => {
      const h = hex.replace("#", "");
      const n = parseInt(h, 16);
      return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
    })
    .join(" ");
}

/**
 * Apply the mode-specific Ionic variables (rgb triplets + theme attributes).
 * Idempotent, SSR-safe no-op when `document` is unavailable.
 */
export function applyIonicThemeMode(mode: ThemeMode = "dark"): void {
  if (typeof document === "undefined") return;
  const t = MODE_TOKENS[mode];
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  root.setAttribute("ion-theme", mode);
  root.setAttribute("color-theme", mode);

  set("--ion-color-secondary", t.surfaceHover);
  set("--ion-color-secondary-rgb", hexToRgbTriplets([t.surfaceHover]));
  set("--ion-color-tertiary", t.surfaceActive);
  set("--ion-color-tertiary-rgb", hexToRgbTriplets([t.surfaceActive]));
  set("--ion-color-medium", t.textTertiary);
  set("--ion-color-medium-rgb", hexToRgbTriplets([t.textTertiary]));
  set("--ion-color-light", t.surface);
  set("--ion-color-light-rgb", hexToRgbTriplets([t.surface]));

  set("--ion-background-color", t.canvas);
  set("--ion-background-color-rgb", hexToRgbTriplets([t.canvas]));
  set("--ion-text-color", t.textPrimary);
  set("--ion-text-color-rgb", hexToRgbTriplets([t.textPrimary]));
}

export function setupLuminaTheme(mode?: ThemeMode): void {
  // Les couleurs statiques (accent, success/warning/danger) vivent en CSS
  // (theme.css) et sont poussées par applyTheme (accent) / les tokens
  // App.css (neutres). Il ne reste qu'à lier les variables au mode courant.
  applyIonicThemeMode(mode);

  // Safe area insets — used by Capacitor on mobile
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--ion-safe-area-top", "env(safe-area-inset-top, 0px)");
  root.style.setProperty(
    "--ion-safe-area-bottom",
    "env(safe-area-inset-bottom, 0px)",
  );
  root.style.setProperty(
    "--ion-safe-area-left",
    "env(safe-area-inset-left, 0px)",
  );
  root.style.setProperty(
    "--ion-safe-area-right",
    "env(safe-area-inset-right, 0px)",
  );
}

export { LUMINA_TOKENS, LUMINA_LIGHT_TOKENS };
export type LuminaTokens = ModeTokens;
