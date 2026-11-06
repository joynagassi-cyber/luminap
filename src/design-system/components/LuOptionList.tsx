/**
 * LuOptionList — primitive P2 (spec §6 « LuSelect », mode ≤ 5 options).
 *
 * Liste verticale : conteneur `--lu-surface-2`, rayon 20, padding 6 ;
 * item hauteur 44, rayon 16, texte 15 muted ; sélectionné = surface
 * « blanche » (clair) / surface-inverse (sombre) + `--lu-shadow-sm` + 600.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { useInversePair } from "./inverse";

export interface LuOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface LuOptionListProps {
  options: LuOption[];
  value: string;
  onSelect: (value: string) => void;
  "aria-label"?: string;
}

export function LuOptionList({ options, value, onSelect, "aria-label": ariaLabel = "Options" }: LuOptionListProps) {
  const inverse = useInversePair();
  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      data-testid="lu-option-list"
      className="w-full p-1.5"
      style={{ background: "var(--lu-surface-2)", borderRadius: "var(--lu-radius-lg)" }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            data-selected={selected || undefined}
            onClick={() => onSelect(option.value)}
            className="flex h-11 w-full items-center gap-2.5 rounded-[var(--lu-radius-md)] px-3 text-left text-[15px] transition-transform active:scale-[.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: selected ? inverse.bg : "transparent",
              color: selected ? inverse.fg : "var(--lu-fg-muted)",
              fontWeight: selected ? 600 : 400,
              boxShadow: selected ? "var(--lu-shadow-sm)" : "none",
              outlineColor: "var(--lu-focus-ring)",
            }}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {selected && <Check size={16} aria-hidden style={{ color: inverse.fg }} />}
          </button>
        );
      })}
    </div>
  );
}

export default LuOptionList;
