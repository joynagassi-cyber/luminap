/**
 * Lumina — Theme catalog.
 *
 * Each theme is a 3-stop palette (primary / light / dark) harmonised on a dark
 * canvas. Administrators pick one during onboarding (or in Settings later);
 * `applyTheme` pushes it into both the Ionic CSS vars and the Lumina design
 * tokens so every consumer — the router, the dashboard, BottomNav, PDF
 * exports — sees the chosen colour.
 *
 * The runtime switch is idempotent and safe in SSR: `applyTheme` no-ops when
 * there is no `document` (server / SSR preflight).
 */

export type ThemeId =
  | "fire"
  | "spirit"
  | "action"
  | "trust"
  | "emerald"
  | "care"
  | "know"
  | "feminine"
  | "tech"
  | "luxury";

export interface LuminaTheme {
  id: ThemeId;
  name: string;
  primary: string;
  light: string;
  dark: string;
  /** Short FR description — shown in the picker so admins understand the tone. */
  inspiration: string;
}

export const LUMINA_THEMES: readonly LuminaTheme[] = [
  {
    id: "fire",
    name: "Orange Fire",
    primary: "#FF6B00",
    light: "#FF8533",
    dark: "#CC5500",
    inspiration: "Communautés dynamiques, énergie, feu de l'Esprit",
  },
  {
    id: "spirit",
    name: "Violet Spirit",
    primary: "#7C3AED",
    light: "#A78BFA",
    dark: "#4C1D95",
    inspiration: "Mystique, royauté, spiritualité contemporaine",
  },
  {
    id: "action",
    name: "Rouge Action",
    primary: "#DC2626",
    light: "#FCA5A5",
    dark: "#991B1B",
    inspiration: "ONG, urgence, courage, engagement",
  },
  {
    id: "trust",
    name: "Bleu Confiance",
    primary: "#2563EB",
    light: "#93C5FD",
    dark: "#1E40AF",
    inspiration: "Corporate, fintech, stabilité",
  },
  {
    id: "emerald",
    name: "Vert Émeraude",
    primary: "#10B981",
    light: "#6EE7B7",
    dark: "#065F46",
    inspiration: "Croissance, nature, initiatives durables",
  },
  {
    id: "care",
    name: "Teal Soin",
    primary: "#0D9488",
    light: "#5EEAD4",
    dark: "#064E3B",
    inspiration: "Santé, apaisement, solidarité",
  },
  {
    id: "know",
    name: "Jaune Savoir",
    primary: "#D97706",
    light: "#FCD34D",
    dark: "#92400E",
    inspiration: "Écoles, formation, intellectualité",
  },
  {
    id: "feminine",
    name: "Rose Élan",
    primary: "#DB2777",
    light: "#F9A8D4",
    dark: "#9D174D",
    inspiration: "Vitalité, empathie, élégance",
  },
  {
    id: "tech",
    name: "Indigo Tech",
    primary: "#4F46E5",
    light: "#A5B4FC",
    dark: "#1E1B4B",
    inspiration: "Innovation, profondeur, startups",
  },
  {
    id: "luxury",
    name: "Noir & Or Luxe",
    primary: "#B45309",
    light: "#FDE68A",
    dark: "#78350F",
    inspiration: "Prestige, fondations, institutions",
  },
] as const;

export const DEFAULT_THEME_ID: ThemeId = "fire";

const STORAGE_KEY = "lumina-theme";

export function getThemeById(id: ThemeId | string | null | undefined): LuminaTheme {
  if (!id) return LUMINA_THEMES[0];
  const found = LUMINA_THEMES.find((t) => t.id === id);
  return found ?? LUMINA_THEMES[0];
}

export function getStoredThemeId(): ThemeId | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY) as ThemeId | null;
}

export function persistThemeId(id: ThemeId): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
}

export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/**
 * Push the theme into every CSS variable surface — Ionic vars and the Lumina
 * design tokens from src/App.css / src/globals.css.
 *
 * Idempotent. No-op when called in SSR (no `document`) or when the theme
 * object is invalid.
 */
export function applyTheme(theme?: LuminaTheme): void {
  if (typeof document === "undefined") return;
  const t = theme ?? getThemeById(getStoredThemeId());
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  // ── Ionic layer ──────────────────────────────────────────────────────────
  set("--ion-color-primary", t.primary);
  set("--ion-color-primary-rgb", hexToRgb(t.primary));
  set("--ion-tab-bar-color-selected", t.primary);

  // ── Lumina design tokens (App.css :root) ────────────────────────────────
  set("--accent-primary", t.primary);
  set("--accent-light", t.light);
  set("--accent-dark", t.dark);

  // ── shadcn-ish tokens in globals.css ────────────────────────────────────
  set("--primary", t.primary);
  set("--accent", t.primary);
  set("--ring", t.primary);

  persistThemeId(t.id);
}

/** Convenience: read the stored theme and apply it (safe on first paint). */
export function applyStoredTheme(): void {
  applyTheme(getThemeById(getStoredThemeId()));
}
