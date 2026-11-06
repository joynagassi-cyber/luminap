/**
 * LuSegmented — primitive P2 (spec §6 « LuSegmented »).
 *
 * Conteneur `--lu-surface-2` pill, hauteur 44, padding 4 ; indicateur
 * `--lu-surface-inverse` + `--lu-shadow-sm`, transition 200 ms, positionné
 * par index (segments de largeur égale). Variantes `plain`, `signed`
 * (▲/▼ colorés income/expense), `bar`. L'état sélectionné est une CLASSE
 * sur l'hôte + `aria-selected` (leçon #417 : jamais un état React externe).
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";

export interface LuSegmentedOption {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Variante `signed` : colore l'icône ▲/▼ en income/expense. */
  tone?: "income" | "expense";
}

export interface LuSegmentedProps {
  options: LuSegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  variant?: "plain" | "signed" | "bar";
  "aria-label"?: string;
}

export function LuSegmented({
  options,
  value,
  onChange,
  variant = "plain",
  "aria-label": ariaLabel = "Choix",
}: LuSegmentedProps) {
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const widthPct = 100 / options.length;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative flex h-11 w-full rounded-[var(--lu-radius-pill)] p-1"
      style={{ background: "var(--lu-surface-2)" }}
      data-testid="lu-segmented"
    >
      {/* Indicateur animé (positionné par index, transition 200 ms — spec §6). */}
      <span
        aria-hidden
        className="absolute top-1 h-[calc(100%-8px)] rounded-[var(--lu-radius-pill)] transition-transform duration-200"
        style={{
          width: `${widthPct}%`,
          left: 4,
          transform: `translateX(${selectedIndex * 100}%)`,
          background: "var(--lu-surface-inverse)",
          boxShadow: "var(--lu-shadow-sm)",
        }}
      />
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            data-selected={selected || undefined}
            className={`lu-segmented-option${selected ? " lu-segmented-option--selected" : ""} relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-[var(--lu-radius-pill)] text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
            style={{
              color: selected ? "var(--lu-fg-inverse)" : "var(--lu-fg-muted)",
              outlineColor: "var(--lu-focus-ring)",
            }}
            onClick={() => onChange(option.value)}
          >
            {option.icon && (
              <span
                style={
                  variant === "signed"
                    ? { color: option.tone === "income" ? "var(--lu-income)" : option.tone === "expense" ? "var(--lu-expense)" : "currentColor" }
                    : undefined
                }
              >
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default LuSegmented;
