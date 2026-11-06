/**
 * LuTabBar — composite P3 (spec §6 « LuTabBar »).
 *
 * Barre flottante en HTML natif (contrainte projet : BottomNav reste en
 * HTML natif, pas ion-tab-bar) : marges latérales 12 + safe-area bas,
 * hauteur 64, rayon 32, surface + --lu-shadow-lg. 4–5 onglets.
 * Inactif : icône --lu-fg-muted. Actif selon `activeStyle` :
 *  - pill-active  : pastille pleine accent 64×44 rayon 22, icône --lu-on-accent ;
 *  - soft-active  : pastille --lu-accent-soft, icône + label accent ;
 *  - text-active  : icône + label --lu-fg.
 * Labels 10–11/500.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";

export type LuTabBarActiveStyle = "pill-active" | "soft-active" | "text-active";

export interface LuTab {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface LuTabBarProps {
  tabs: LuTab[];
  active: string;
  onSelect: (id: string) => void;
  activeStyle?: LuTabBarActiveStyle;
}

export function LuTabBar({ tabs, active, onSelect, activeStyle = "pill-active" }: LuTabBarProps) {
  return (
    <nav
      aria-label="Navigation principale"
      data-testid="lu-tab-bar"
      data-active-style={activeStyle}
      className="fixed inset-x-3 bottom-0 z-40 flex h-16 items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: "var(--lu-surface)",
        borderRadius: "var(--lu-radius-2xl)",
        boxShadow: "var(--lu-shadow-lg)",
        border: "1px solid var(--lu-border)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const color = isActive
          ? activeStyle === "pill-active"
            ? "var(--lu-on-accent)"
            : activeStyle === "soft-active"
              ? "var(--lu-accent)"
              : "var(--lu-fg)"
          : "var(--lu-fg-muted)";
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect(tab.id)}
            className="flex min-w-0 items-center justify-center gap-1.5 rounded-[var(--lu-radius-pill)] px-3 py-2 focus-visible:outline focus-visible:outline-2"
            style={{
              height: 44,
              minWidth: isActive && activeStyle === "pill-active" ? 64 : undefined,
              background: isActive
                ? activeStyle === "pill-active"
                  ? "var(--lu-accent)"
                  : activeStyle === "soft-active"
                    ? "var(--lu-accent-soft)"
                    : "transparent"
                : "transparent",
              borderRadius: isActive && activeStyle === "pill-active" ? "var(--lu-radius-lg)" : "var(--lu-radius-pill)",
              color,
              outlineColor: "var(--lu-focus-ring)",
            }}
          >
            <span className="shrink-0" aria-hidden>{tab.icon}</span>
            {activeStyle !== "pill-active" || !isActive ? (
              <span className="truncate text-[11px] font-medium">{tab.label}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export default LuTabBar;
