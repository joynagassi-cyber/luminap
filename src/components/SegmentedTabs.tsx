import { useId } from "react";

export interface SegmentedTab {
  id: string;
  label: string;
  testId?: string;
}

interface Props {
  tabs: SegmentedTab[];
  active: string;
  onChange: (id: string) => void;
}

/**
 * Tabuleur segmenté — HTML natif (pas Ionic : piège React 19 sur les custom
 * elements). Barre pilule, l'onglet actif est coloré à l'accent.
 */
export default function SegmentedTabs({ tabs, active, onChange }: Props) {
  const base = useId();
  return (
    <div
      data-testid="settings-tabs"
      role="tablist"
      aria-label="Sections des paramètres"
      className="flex gap-1 p-1 rounded-full"
      style={{ backgroundColor: "var(--surface-hover)" }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={on}
            data-testid={t.testId ?? `tab-${t.id}`}
            onClick={() => onChange(t.id)}
            className="flex-1 min-h-11 flex items-center justify-center text-xs font-semibold transition-all active:scale-95 whitespace-nowrap px-2 border-none cursor-pointer"
            style={{ backgroundColor: "transparent", cursor: "pointer" }}
          >
            <span
              className="h-9 w-full rounded-full flex items-center justify-center"
              style={{
                backgroundColor: on ? "var(--surface)" : "transparent",
                color: on ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: on ? "var(--shadow-card)" : "none",
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
