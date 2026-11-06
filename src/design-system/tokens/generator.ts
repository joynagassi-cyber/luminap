/** Générateur partagé par le build et le futur thème custom. Pas chargé au boot. */
import { clampChroma, converter, formatHex, wcagContrast } from "culori";

export type ThemeMode = "dark" | "light";
export interface ThemeSpec {
  id: string;
  label: string;
  accent: string;
  accentVivid?: string;
  neutralHue: number;
  defaultMode: ThemeMode;
  surfaceStyle: "flat" | "glass";
  hero: "tinted" | "solid" | "dark-orb" | "none";
  tabBar: "pill-active" | "soft-active" | "text-active";
  fab: "circle" | "rounded-square";
  radiusScale: 0.9 | 1 | 1.1;
  fontDisplay?: string;
  fontBody?: string;
}

const toOklch = converter("oklch");
const HEX = /^#[\da-f]{6}$/i;
const BLACK = "#000000";
const WHITE = "#ffffff";

function fromOklch(l: number, c: number, h: number): string {
  return formatHex(clampChroma({ mode: "oklch", l, c, h }, "oklch", "rgb"));
}

/** Return a new, opaque six-digit sRGB colour; reject bad input rather than
 * silently manufacturing a palette or emitting unsafe CSS. */
function normalizeHex(value: string): string {
  if (!HEX.test(value)) throw new Error(`Invalid colour: ${value}`);
  return value.toLowerCase();
}

export function createCustomTheme(accent: string): ThemeSpec {
  const safeAccent = normalizeHex(accent);
  const color = toOklch(safeAccent)!;
  return { id: "custom", label: "Personnalisé", accent: safeAccent,
    neutralHue: color.h ?? 260, defaultMode: "dark", surfaceStyle: "flat",
    hero: "solid", tabBar: "pill-active", fab: "circle", radiusScale: 1 };
}

/** Tonal steps for tooling only; components consume semantic tokens. */
export function generatePrimitives(spec: ThemeSpec) {
  const accent = toOklch(normalizeHex(spec.accent))!;
  const neutralSteps = { 0: 1, 50: 0.97, 100: 0.94, 200: 0.87, 300: 0.78,
    400: 0.68, 500: 0.57, 600: 0.47, 700: 0.37, 800: 0.27, 900: 0.18, 950: 0.12 };
  const accentSteps = { 50: 0.97, 100: 0.94, 200: 0.87, 300: 0.78, 400: 0.69,
    500: 0.60, 600: 0.51, 700: 0.42, 800: 0.33, 900: 0.24 };
  return {
    neutral: Object.fromEntries(Object.entries(neutralSteps).map(([step, l]) =>
      [step, fromOklch(l, l === 1 ? 0 : 0.012, spec.neutralHue)])),
    accent: Object.fromEntries(Object.entries(accentSteps).map(([step, l]) =>
      [step, fromOklch(l, accent.c, accent.h ?? spec.neutralHue)])),
  };
}

/** Ensure accent + on-accent >= AA after sRGB conversion and hex rounding. */
export function accessibleAccent(hex: string): { accent: string; onAccent: string } {
  const accent = normalizeHex(hex);
  const blackRatio = wcagContrast(accent, BLACK);
  const whiteRatio = wcagContrast(accent, WHITE);
  // Black or white necessarily has >=4.5:1 against an opaque sRGB color;
  // choose the best after rounding, not a perceived-brightness heuristic.
  return { accent, onAccent: blackRatio >= whiteRatio ? BLACK : WHITE };
}

/** Semantic tokens independent of CSS, usable later by custom at runtime. */
export function generateTokens(spec: ThemeSpec, mode: ThemeMode): Record<string, string> {
  if (mode !== "dark" && mode !== "light") throw new Error("Invalid mode");
  if (!Number.isFinite(spec.neutralHue)) throw new Error("Invalid neutral hue");
  const primitives = generatePrimitives(spec);
  const dark = mode === "dark";
  const n = primitives.neutral;
  const vivid = normalizeHex(spec.accentVivid ?? spec.accent);
  const bg = dark ? fromOklch(0.16, 0.012, spec.neutralHue) : n[50];
  const surface = dark ? fromOklch(0.22, 0.012, spec.neutralHue) : n[0];
  const surface2 = dark ? n[800] : n[100];
  // L'accent sert aussi au texte et aux icônes. Ajuster sa luminosité
  // en OKLCH jusqu'à AA sur les trois surfaces, puis choisir son texte
  // noir/blanc après conversion et arrondi sRGB.
  const sourceAccent = normalizeHex(spec.accent);
  const source = toOklch(sourceAccent)!;
  let adjusted = sourceAccent;
  const surfaces = [bg, surface, surface2];
  const readable = (color: string) => surfaces.every((background) => wcagContrast(color, background) >= 4.5);
  if (!readable(adjusted)) {
    let found = false;
    for (let step = 1; step <= 1000; step++) {
      const l = Math.max(0, Math.min(1, source.l + (dark ? step : -step) / 1000));
      const candidate = fromOklch(l, source.c, source.h ?? spec.neutralHue);
      if (readable(candidate)) { adjusted = candidate; found = true; break; }
    }
    if (!found) throw new Error("Accent cannot meet contrast on theme surfaces");
  }
  const { accent, onAccent } = accessibleAccent(adjusted);
  const fg = dark ? n[0] : n[950];
  const fgMuted = dark ? n[300] : n[700];
  const fgSubtle = dark ? n[400] : n[600];
  const income = dark ? "#4ade80" : "#166534";
  const expense = dark ? "#f87171" : "#b91c1c";
  const warning = dark ? "#fbbf24" : "#92400e";
  const info = dark ? "#93c5fd" : "#1d4ed8";
  const inverse = dark ? n[0] : n[950];
  const inverseFg = dark ? n[950] : n[0];
  const a = toOklch(accent)!;
  const pressed = fromOklch(Math.max(0, a.l - 0.08), a.c, a.h ?? spec.neutralHue);
  const heroBg = spec.hero === "solid" ? accent : spec.hero === "dark-orb" ? n[950] : surface2;
  const heroFg = spec.hero === "solid" ? onAccent : spec.hero === "dark-orb" ? n[0] : fg;
  const t: Record<string, string> = {
    "bg": bg, "surface": surface, "surface-2": surface2, "surface-inverse": inverse,
    "hero-bg": heroBg, "hero-fg": heroFg, "scrim": dark ? "rgba(0, 0, 0, 0.6)" : "rgba(26, 26, 26, 0.35)",
    "fg": fg, "fg-muted": fgMuted, "fg-subtle": fgSubtle, "fg-inverse": inverseFg,
    "on-accent": onAccent, "accent": accent, "accent-pressed": pressed,
    "accent-soft": `color-mix(in srgb, ${accent} 14%, ${surface})`, "accent-vivid": vivid,
    "income": income, "income-soft": `color-mix(in srgb, ${income} 12%, ${surface})`,
    "expense": expense, "expense-soft": `color-mix(in srgb, ${expense} 12%, ${surface})`,
    "warning": warning, "warning-soft": `color-mix(in srgb, ${warning} 14%, ${surface})`,
    "info": info, "info-soft": `color-mix(in srgb, ${info} 14%, ${surface})`,
    "border": dark ? n[800] : n[200], "border-strong": dark ? n[700] : n[300],
    "focus-ring": dark ? n[300] : n[700],
    "chart-1": vivid, "chart-2": income, "chart-3": info, "chart-4": warning,
    "chart-5": "#ec4899", "chart-6": expense, "chart-grid": dark ? n[800] : n[200],
    "chart-muted-bar": dark ? n[700] : n[200],
    "glass-bg": dark ? "rgba(27, 26, 32, 0.85)" : "rgba(255, 255, 255, 0.75)",
    "glass-border": dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
    "glass-blur": "20px",
    "shadow-sm": dark ? "none" : "0 1px 2px rgba(16, 24, 40, 0.04)",
    "shadow-md": dark ? "none" : "0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06)",
    "shadow-lg": dark ? "none" : "0 8px 32px rgba(16, 24, 40, 0.12)",
  };
  for (const [name, size] of Object.entries({ xs: 8, sm: 12, md: 16, lg: 20, xl: 28, "2xl": 32 })) {
    t[`radius-${name}`] = `${size * spec.radiusScale}px`;
  }
  t["radius-pill"] = "999px";
  for (const [name, font] of [["font-display", spec.fontDisplay], ["font-body", spec.fontBody]] as const) {
    if (font && !/^[\w -]+$/.test(font)) throw new Error("Invalid font name");
    t[name] = font ? `"${font}", var(--font-sans)` : "var(--font-sans)";
  }
  return t;
}
