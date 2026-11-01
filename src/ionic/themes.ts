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

import { applyIonicThemeMode } from "./theme";

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
  | "luxury"
  | "black"
  | "blue"
  | "brown"
  | "cyan"
  | "gold"
  | "gray"
  | "green"
  | "lime"
  | "magenta"
  | "maroon"
  | "navy"
  | "olive"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "silver"
  | "teal"
  | "white"
  | "yellow";

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
  // ── Palettes de marque Lumina (dégradés harmonisés) ─────────────────────
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
  // ── 20 couleurs CSS classiques (nom, HEX, dégradé auto) ──────────────────
  {
    id: "black",
    name: "Noir",
    primary: "#000000",
    light: "#4D4D4D",
    dark: "#000000",
    inspiration: "Classique, sobre, intemporel",
  },
  {
    id: "blue",
    name: "Bleu",
    primary: "#0000FF",
    light: "#4D4DFF",
    dark: "#0000CC",
    inspiration: "Sérénité, confiance, ciel",
  },
  {
    id: "brown",
    name: "Marron",
    primary: "#A52A2A",
    light: "#BF6565",
    dark: "#832222",
    inspiration: "Terre, stabilité, authenticité",
  },
  {
    id: "cyan",
    name: "Cyan",
    primary: "#00FFFF",
    light: "#66FFFF",
    dark: "#00CCCC",
    inspiration: "Eau, fraîcheur, clarté",
  },
  {
    id: "gold",
    name: "Or",
    primary: "#FFD700",
    light: "#FFE04D",
    dark: "#CCAC00",
    inspiration: "Prestige, excellence, lumière",
  },
  {
    id: "gray",
    name: "Gris",
    primary: "#808080",
    light: "#A6A6A6",
    dark: "#666666",
    inspiration: "Neutre, moderne, équilibré",
  },
  {
    id: "green",
    name: "Vert",
    primary: "#008000",
    light: "#4DBA4D",
    dark: "#006600",
    inspiration: "Croissance, vie, renouveau",
  },
  {
    id: "lime",
    name: "Lime",
    primary: "#00FF00",
    light: "#66FF66",
    dark: "#00CC00",
    inspiration: "Vitamine, jeunesse, énergie",
  },
  {
    id: "magenta",
    name: "Magenta",
    primary: "#FF00FF",
    light: "#FF66FF",
    dark: "#CC00CC",
    inspiration: "Audace, créativité, modernité",
  },
  {
    id: "maroon",
    name: "Grenat",
    primary: "#800000",
    light: "#BF4D4D",
    dark: "#660000",
    inspiration: "Passion, profondeur, solennité",
  },
  {
    id: "navy",
    name: "Bleu marine",
    primary: "#000080",
    light: "#4D4DBF",
    dark: "#000066",
    inspiration: "Autorité, tradition, institution",
  },
  {
    id: "olive",
    name: "Olive",
    primary: "#808000",
    light: "#BFBF4D",
    dark: "#666600",
    inspiration: "Sagesse, récolte, calme",
  },
  {
    id: "orange",
    name: "Orange",
    primary: "#FFA500",
    light: "#FFB84D",
    dark: "#CC8400",
    inspiration: "Chaleur, accueil, dynamisme",
  },
  {
    id: "pink",
    name: "Rose",
    primary: "#FFC0CB",
    light: "#FFD9E3",
    dark: "#CC9AA2",
    inspiration: "Douceur, bienveillance, accueil",
  },
  {
    id: "purple",
    name: "Violet",
    primary: "#800080",
    light: "#BF4DBF",
    dark: "#660066",
    inspiration: "Spiritualité, royauté, imagination",
  },
  {
    id: "red",
    name: "Rouge",
    primary: "#FF0000",
    light: "#FF4D4D",
    dark: "#CC0000",
    inspiration: "Urgence, courage, amour",
  },
  {
    id: "silver",
    name: "Argent",
    primary: "#C0C0C0",
    light: "#D9D9D9",
    dark: "#999999",
    inspiration: "Pureté, technologie, modernité",
  },
  {
    id: "teal",
    name: "Sarcelle",
    primary: "#008080",
    light: "#4DBFBF",
    dark: "#006666",
    inspiration: "Équilibre, apaisement, santé",
  },
  {
    id: "white",
    name: "Blanc",
    primary: "#FFFFFF",
    light: "#FFFFFF",
    dark: "#E0E0E0",
    inspiration: "Lumière, pureté, simplicité",
  },
  {
    id: "yellow",
    name: "Jaune",
    primary: "#FFFF00",
    light: "#FFFF4D",
    dark: "#CCCC00",
    inspiration: "Joie, clarté, optimisme",
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
  // Gardé : lecture de boot (cf. `persistThemeId`) — un `getItem` qui lève
  // (stockage indisponible) ne doit pas interrompre le démarrage.
  try {
    return localStorage.getItem(STORAGE_KEY) as ThemeId | null;
  } catch {
    return null;
  }
}

export function persistThemeId(id: ThemeId): void {
  if (typeof localStorage === "undefined") return;
  // Best-effort : un stockage indisponible (mode privé, quota plein) ne doit
  // JAMAIS interrompre le boot — `applyStoredTheme` est appelé avant le
  // montage React, une exception ici laisserait un écran noir silencieux.
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* thème appliqué en mémoire ; persistance perdue, sans conséquence */
  }
}

export function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/**
 * Push the brand accent into every CSS variable surface — Ionic vars and
 * the Lumina design tokens from src/App.css.
 *
 * The accent is INDEPENDANT du mode clair/sombre : il est invariant.
 * Idempotent. No-op when called in SSR (no `document`).
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

  // ── shadcn-ish tokens (consommés par tailwind.config.ts) ───────────────
  set("--primary", t.primary);
  set("--accent", t.primary);
  set("--ring", t.primary);

  persistThemeId(t.id);
}

// ── Theme mode (dark / light) ───────────────────────────────────────────────
//
// Orthogonal to the brand accent above: the accent is invariant between
// modes, only the neutral surfaces / texts / borders flip. The mode is
// applied on <html> via `data-theme` (tokens live in src/App.css),
// mirrored onto the Ionic vars that cannot be CSS vars (src/ionic/theme.ts),
// and persisted in localStorage.

export type ThemeMode = "system" | "dark" | "light";

export const THEME_MODE_STORAGE_KEY = "lumina-theme-mode";

/** Choix persisté. Défaut « system » (addendum B2 : suivre le réglage de l'OS). */
export function getStoredThemeMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  try {
    const v = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

export function persistThemeMode(mode: ThemeMode): void {
  if (typeof localStorage === "undefined") return;
  // Best-effort (cf. `persistThemeId`) : ne jamais lever au boot.
  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    /* mode appliqué en mémoire ; persistance perdue, sans conséquence */
  }
}

/**
 * Résout « system » vers la préférence de l'OS. Sans `matchMedia` (SSR, tests
 * jsdom), on retombe sur sombre — le défaut historique de Lumina.
 */
export function resolveThemeMode(mode: ThemeMode): "dark" | "light" {
  if (mode === "dark" || mode === "light") return mode;
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch {
      return "dark";
    }
  }
  return "dark";
}

let systemListenerBound = false;

/** En mode « system », suivre en direct les changements du réglage de l'OS. */
function bindSystemListener(): void {
  if (systemListenerBound) return;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }
  try {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (getStoredThemeMode() === "system") {
          applyThemeMode("system", { persist: false });
        }
      });
    systemListenerBound = true;
  } catch {
    /* environnement sans addEventListener : repli statique, sans écoute */
  }
}

/**
 * Apply the light/dark mode: sets `data-theme` on <html> to the *resolved*
 * mode (system → OS preference), pushes the mode-specific Ionic vars, persists
 * the *choice*. Idempotent and SSR-safe.
 */
export function applyThemeMode(
  mode?: ThemeMode,
  opts?: { persist?: boolean },
): void {
  if (typeof document === "undefined") return;
  const choice: ThemeMode = mode ?? getStoredThemeMode();
  const resolved = resolveThemeMode(choice);
  document.documentElement.dataset.theme = resolved;
  applyIonicThemeMode(resolved);
  if (opts?.persist !== false) persistThemeMode(choice);
  if (choice === "system") bindSystemListener();
}

/** Convenience: read the stored mode and apply it (safe on first paint). */
export function applyStoredThemeMode(): void {
  applyThemeMode(getStoredThemeMode());
}

/** Convenience: read the stored theme and apply it (safe on first paint). */
export function applyStoredTheme(): void {
  applyTheme(getThemeById(getStoredThemeId()));
}
