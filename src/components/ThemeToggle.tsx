import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeModeStore } from "@/store/useThemeModeStore";
import { withThemeTransition } from "@/design-system/theme/transition";
import type { ThemeMode } from "@/ionic/themes";

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "system", label: "Système", Icon: Monitor },
  { mode: "light", label: "Clair", Icon: Sun },
  { mode: "dark", label: "Sombre", Icon: Moon },
];

/**
 * Sélecteur de mode d'affichage — Système / Clair / Sombre (addendum B2).
 * « Système » (défaut) suit le réglage de l'OS ; le choix est persisté
 * (localStorage `lumina-theme-mode`) et appliqué immédiatement à toute
 * l'application (tokens CSS de src/App.css + variables Ionic).
 */
export default function ThemeToggle() {
  const mode = useThemeModeStore((s) => s.mode);
  const setMode = useThemeModeStore((s) => s.setMode);

  return (
    <div
      data-testid="theme-mode-toggle"
      role="radiogroup"
      aria-label="Mode d'affichage"
      className="flex gap-1 p-1 rounded-xl"
      style={{
        backgroundColor: "var(--surface-hover)",
        border: "1px solid var(--border)",
      }}
    >
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => withThemeTransition(() => setMode(m))}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all active:scale-95"
            style={{
              minHeight: 44,
              color: active ? "var(--brand-text)" : "var(--text-muted)",
              backgroundColor: active ? "var(--surface)" : "transparent",
              boxShadow: active ? "var(--shadow-card)" : "none",
            }}
          >
            <Icon className="w-4 h-4 flex-shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
