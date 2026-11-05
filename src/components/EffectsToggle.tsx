import { useEffectsStore, type ThemeEffects } from "@/design-system/theme/effects";

const OPTIONS: { value: ThemeEffects; label: string }[] = [
  { value: "full", label: "Complets" },
  { value: "lite", label: "Allégés" },
];

/** Choix manuel qui prime sur la détection matérielle du premier démarrage. */
export function EffectsToggle() {
  const effects = useEffectsStore((s) => s.effects);
  const setEffects = useEffectsStore((s) => s.setEffects);
  return (
    <div role="radiogroup" aria-label="Effets visuels" className="flex gap-1 p-1 rounded-xl"
      style={{ background: "var(--lu-surface-2)", border: "1px solid var(--lu-border)" }}>
      {OPTIONS.map(({ value, label }) => (
        <button key={value} type="button" role="radio" aria-checked={effects === value}
          onClick={() => setEffects(value)} className="flex-1 rounded-lg text-sm font-medium"
          style={{ minHeight: 44, color: effects === value ? "var(--brand-text)" : "var(--lu-fg-muted)",
            background: effects === value ? "var(--lu-surface)" : "transparent" }}>
          {label}
        </button>
      ))}
    </div>
  );
}
