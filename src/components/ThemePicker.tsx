/**
 * Theme picker — the 10 Lumina brand palettes as tappable swatches.
 *
 * Selecting a swatch applies the theme to the live document (via
 * `applyTheme`) so the user sees the whole page re-skin immediately, and
 * reports the choice back to the parent for persistence.
 */

import { Check } from "lucide-react";
import {
  LUMINA_THEMES,
  applyTheme,
  getThemeById,
  type ThemeId,
} from "@/ionic/themes";

interface Props {
  value: ThemeId | null;
  onChange: (id: ThemeId) => void;
  /** Compact layout for tighter spaces (grid of 5). */
  columns?: 5 | 10;
}

export default function ThemePicker({ value, onChange, columns = 5 }: Props) {
  const active = getThemeById(value ?? undefined);
  return (
    <div>
      <div
        className="grid gap-2.5"
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
              className="relative flex flex-col items-center gap-1.5 transition-all active:scale-90"
            >
              <div
                className="w-full aspect-square rounded-full flex items-center justify-center"
                style={{
                  background: t.primary,
                  boxShadow: selected
                    ? `0 0 0 3px #121212, 0 0 0 5px ${t.primary}`
                    : "none",
                }}
              >
                {selected && <Check className="w-5 h-5 text-white" />}
              </div>
              {columns === 5 && (
                <span
                  className="text-[10px] leading-tight text-center"
                  style={{ color: selected ? t.primary : "#808080" }}
                >
                  {t.name.split(" ")[0]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 px-1">
        <p className="text-xs text-[#808080]">
          {active.name} — {active.inspiration}
        </p>
      </div>
    </div>
  );
}
