/**
 * LuChip — primitive P2 (spec §6 « LuChip »).
 *
 * Hauteur 32, pill, icône 16 optionnelle. Non sélectionné : surface +
 * bordure 1px. Sélectionné : fond accent + --lu-on-accent.
 * Usage : catégories, comptes/caisses, filtres (rangée à défilement
 * horizontal avec snap — voir l'entrée Design Lab).
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface LuChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
}

export function LuChip({
  selected = false,
  icon,
  disabled,
  children,
  style,
  className = "",
  ...rest
}: LuChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={[
        "inline-flex h-8 shrink-0 snap-start items-center gap-1.5 rounded-[var(--lu-radius-pill)] border px-3 text-[13px] font-semibold transition-transform",
        "active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      ].join(" ")}
      style={{
        background: selected ? "var(--lu-accent)" : "var(--lu-surface)",
        color: selected ? "var(--lu-on-accent)" : "var(--lu-fg-muted)",
        borderColor: selected ? "var(--lu-accent)" : "var(--lu-border)",
        outlineColor: "var(--lu-focus-ring)",
        ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Rangée de chips à défilement horizontal avec snap (usage filtres). */
export function LuChipRow({ children }: { children: ReactNode }) {
  return (
    <div
      className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1"
      style={{ scrollbarWidth: "none" }}
    >
      {children}
    </div>
  );
}

export default LuChip;
