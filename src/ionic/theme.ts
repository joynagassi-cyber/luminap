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
  canvas: "#121212",
  surface: "#212121",
  surfaceHover: "#282828",
  surfaceActive: "#333333",
  border: "#282828",
  textPrimary: "#FFFFFF",
  textSecondary: "#B3B3B3",
  textTertiary: "#808080",
  textPlaceholder: "#535353",
  dataIncome: "#1DB954",
  dataExpense: "#E51332",
  dataPending: "#FFB800",
  accentPrimary: "#FF6B00",
  accentLight: "#FF8533",
  accentDark: "#CC5500",
} as const;

type ModeTokens = { [K in keyof typeof LUMINA_TOKENS]: string };

/** Lumina design tokens — light mode. Les couleurs financières + accent sont inchangées. */
const LUMINA_LIGHT_TOKENS: ModeTokens = {
  ...LUMINA_TOKENS,
  canvas: "#F5F6F8",
  surface: "#FFFFFF",
  surfaceHover: "#EEF0F2",
  surfaceActive: "#E4E6E9",
  border: "#E3E5E8",
  textPrimary: "#1A1A1A",
  textSecondary: "#555A60",
  textTertiary: "#8A8F96",
  textPlaceholder: "#9AA0A8",
};

const MODE_TOKENS: Record<ThemeMode, ModeTokens> = {
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
