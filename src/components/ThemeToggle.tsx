import { Moon, Sun } from "lucide-react";
import { useThemeModeStore } from "@/store/useThemeModeStore";

/**
 * Bascule Sombre / Clair — le choix est persisté (localStorage
 * `lumina-theme-mode`) et appliqué immédiatement à toute l'application
 * (tokens CSS de src/App.css + variables Ionic). Sombre par défaut.
 */
export default function ThemeToggle() {
  const mode = useThemeModeStore((s) => s.mode);
  const setMode = useThemeModeStore((s) => s.setMode);
  const light = mode === "light";

  return (
    <div
      data-testid="theme-mode-toggle"
      role="switch"
      aria-checked={light}
      aria-label="Mode clair"
      onClick={() => setMode(light ? "dark" : "light")}
      className="flex items-center gap-3 cursor-pointer select-none transition-all active:scale-95"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      <Moon
        className="w-4 h-4 flex-shrink-0"
        style={{
          color: light ? "var(--text-tertiary)" : "var(--accent-primary)",
        }}
      />
      <span
        className="flex-1 text-sm font-medium"
        style={{
          color: light ? "var(--text-tertiary)" : "var(--text-primary)",
        }}
      >
        Sombre
      </span>
      {/* Piste + curseur du switch */}
      <span
        aria-hidden
        className="w-11 h-6 rounded-full relative flex-shrink-0 transition-colors"
        style={{
          backgroundColor: light ? "var(--accent-primary)" : "var(--surface-active)",
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
          style={{ left: light ? "22px" : "2px" }}
        />
      </span>
      <span
        className="text-sm font-medium flex-1 text-right"
        style={{
          color: light ? "var(--text-primary)" : "var(--text-tertiary)",
        }}
      >
        Clair
      </span>
      <Sun
        className="w-4 h-4 flex-shrink-0"
        style={{
          color: light ? "var(--accent-primary)" : "var(--text-tertiary)",
        }}
      />
    </div>
  );
}
