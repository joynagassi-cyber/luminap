/**
 * Lumina Ionic Theme Configuration
 *
 * Maps existing Lumina CSS design tokens to Ionic CSS variables.
 * Dark mode by default. Safe-area insets handled via CSS env().
 */

// Lumina design tokens — must match src/globals.css
const LUMINA_TOKENS = {
  canvas: "#121212",
  surface: "#212121",
  surfaceHover: "#282828",
  surfaceActive: "#333333",
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

export function setupLuminaTheme(): void {
  const root = document.documentElement;

  // Map Ionic CSS variables to Lumina tokens
  const setVar = (ionicVar: string, luminaToken: string) => {
    root.style.setProperty(`--ion-color-${ionicVar}`, luminaToken);
  };

  // Core colors
  setVar("primary", LUMINA_TOKENS.accentPrimary);
  setVar("primary-rgb", "255,107,0");
  setVar("secondary", LUMINA_TOKENS.surfaceHover);
  setVar("secondary-rgb", "40,40,40");
  setVar("tertiary", LUMINA_TOKENS.surfaceActive);
  setVar("tertiary-rgb", "51,51,51");
  setVar("success", LUMINA_TOKENS.dataIncome);
  setVar("success-rgb", "29,185,84");
  setVar("warning", LUMINA_TOKENS.dataPending);
  setVar("warning-rgb", "255,184,0");
  setVar("danger", LUMINA_TOKENS.dataExpense);
  setVar("danger-rgb", "229,19,50");
  setVar("medium", LUMINA_TOKENS.textTertiary);
  setVar("medium-rgb", "128,128,128");
  setVar("light", LUMINA_TOKENS.surface);
  setVar("light-rgb", "33,33,33");

  // Dark mode defaults
  root.setAttribute("ion-theme", "dark");
  root.setAttribute("color-theme", "dark");

  // Ionic dark palette overrides
  root.style.setProperty("--ion-background-color", LUMINA_TOKENS.canvas);
  root.style.setProperty("--ion-text-color", LUMINA_TOKENS.textPrimary);
  root.style.setProperty("--ion-toolbar-background", LUMINA_TOKENS.surface);
  root.style.setProperty("--ion-toolbar-color", LUMINA_TOKENS.textPrimary);
  root.style.setProperty("--ion-item-background", LUMINA_TOKENS.surface);
  root.style.setProperty("--ion-item-color", LUMINA_TOKENS.textPrimary);
  root.style.setProperty("--ion-card-background", LUMINA_TOKENS.surface);
  root.style.setProperty("--ion-card-color", LUMINA_TOKENS.textPrimary);
  root.style.setProperty("--ion-modal-background", LUMINA_TOKENS.surface);
  root.style.setProperty("--ion-modal-color", LUMINA_TOKENS.textPrimary);
  root.style.setProperty("--ion-tab-bar-background", LUMINA_TOKENS.surface);
  root.style.setProperty("--ion-tab-bar-color", LUMINA_TOKENS.textTertiary);
  root.style.setProperty(
    "--ion-tab-bar-color-selected",
    LUMINA_TOKENS.accentPrimary,
  );

  // Safe area insets — used by Capacitor on mobile
  root.style.setProperty(
    "--ion-safe-area-top",
    "env(safe-area-inset-top, 0px)",
  );
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

  // Typography
  root.style.setProperty(
    "--ion-font-family",
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  );
  root.style.setProperty("--ion-text-color-step", "0.2222");
  root.style.setProperty("--ion-background-color-step", "0.04");
}

export { LUMINA_TOKENS };
export type LuminaTokens = typeof LUMINA_TOKENS;
