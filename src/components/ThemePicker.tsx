/**
 * Theme picker — les palettes de marque Lumina + les 20 couleurs CSS classiques
 * affichées comme des cercles de couleur attrayants, avec un vrai sélecteur
 * de couleur natif (input type="color") pour une précision hexadécimale.
 *
 * Sélectionner un cercle applique le thème en direct (applyTheme) pour un
 * re-skin immédiat de toute la page, et rapporte le choix au parent.
 */

import React from "react";
import { Check, Palette } from "lucide-react";
import {
  LUMINA_THEMES,
  applyTheme,
  getThemeById,
  type ThemeId,
} from "@/ionic/themes";

interface Props {
  value: ThemeId | null;
  onChange: (id: ThemeId) => void;
  /** Nombre de colonnes du grid (5 ou 10). */
  columns?: 5 | 10;
}

/** Dégradé radiale pour donner du relief à chaque cercle de couleur. */
function circleGradient(primary: string): string {
  const h = primary.replace("#", "");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `radial-gradient(circle at 35% 35%, ${colorMix(primary, 35)} 0%, ${primary} 60%, ${colorMix(primary, -25)} 100%)`;
}

function colorMix(hex: string, pct: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  let r = ((n >> 16) & 255) * (1 + pct / 100);
  let g = ((n >> 8) & 255) * (1 + pct / 100);
  let bb = (n & 255) * (1 + pct / 100);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  bb = Math.min(255, Math.max(0, bb));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(bb))}`;
}

export default function ThemePicker({ value, onChange, columns = 5 }: Props) {
  const active = getThemeById(value ?? undefined);
  const [customColor, setCustomColor] = React.useState(active?.primary ?? "#FF6B00");

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
    applyTheme({
      id: "custom",
      name: "Personnalisé",
      primary: e.target.value,
      light: colorMix(e.target.value, 25),
      dark: colorMix(e.target.value, -25),
      inspiration: "Couleur sur mesure",
    } as never);
    onChange("custom" as ThemeId);
  };

  return (
    <div className="space-y-4">
      {/* ── Sélecteur de couleur précis ── */}
      <div className="flex items-center gap-3 px-2 py-2 bg-surface rounded-xl border border-border">
        <Palette className="w-4 h-4 text-text-tertiary" />
        <label className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Couleur personnalisée
        </label>
        <input
          type="color"
          value={customColor}
          onChange={handleCustomChange}
          className="h-8 w-10 rounded-lg cursor-pointer border-0 bg-transparent focus:ring-0"
        />
        <span className="text-xs text-text-tertiary font-mono">{customColor}</span>
      </div>

      {/* ── Cercles de couleur ── */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            columns === 5 ? "repeat(5, 1fr)" : "repeat(10, 1fr)",
        }}
      >
        {LUMINA_THEMES.map((t) => {
          const selected = t.id === active.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onChange(t.id);
                applyTheme(t);
              }}
              aria-label={t.name}
              aria-pressed={selected}
              className="flex flex-col items-center gap-2 transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:rounded-full"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center relative overflow-hidden"
                style={{
                  background: circleGradient(t.primary),
                  boxShadow: selected
                    ? `0 0 0 4px var(--canvas), 0 4px 12px -2px ${t.primary}`
                    : "0 2px 8px -2px rgba(0,0,0,0.25)",
                  border: selected ? `3px solid var(--canvas)` : "none",
                }}
              >
                {selected && (
                  <Check className="w-5 h-5 text-on-accent drop-shadow-md" />
                )}
              </div>
              <span
                className={`text-[10px] leading-tight text-center font-medium ${
                  selected
                    ? "text-text-primary"
                    : "text-text-tertiary"
                }`}
              >
                {t.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Thème actif ── */}
      <div className="flex items-center justify-between px-2 py-2 bg-surface/50 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full" style={{ background: active.primary }} />
          <div>
            <p className="text-xs font-semibold text-text-primary">
              {active.name}
            </p>
            <p className="text-[10px] text-text-tertiary leading-tight">
              {active.inspiration}
            </p>
          </div>
        </div>
        <Palette className="w-4 h-4 text-text-tertiary cursor-pointer" />
      </div>
    </div>
  );
}


