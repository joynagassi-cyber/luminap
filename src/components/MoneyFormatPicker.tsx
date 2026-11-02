import { Check } from "lucide-react";
import {
  MONEY_FORMAT_OPTIONS,
  useMoneyFormatStore,
  type MoneyFormat,
} from "@/lib/moneyFormat";

/**
 * Sélecteur du format d'affichage des montants (Réglages → Thème & apparence).
 * Chaque option montre un APERÇU réel du montant 50 000 FCFA rendu dans ce
 * format, pour que le choix soit sans ambiguïté.
 */
export default function MoneyFormatPicker() {
  const format = useMoneyFormatStore((s) => s.format);
  const setFormat = useMoneyFormatStore((s) => s.setFormat);

  return (
    <div role="radiogroup" aria-label="Format d'affichage des montants" className="space-y-2">
      {MONEY_FORMAT_OPTIONS.map((opt) => {
        const active = format === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`money-format-${opt.value}`}
            onClick={() => setFormat(opt.value as MoneyFormat)}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all active:scale-[0.99]"
            style={{
              backgroundColor: active
                ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)"
                : "var(--surface-hover)",
              border: active
                ? "1px solid var(--accent-primary)"
                : "1px solid var(--border)",
            }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: active ? "var(--accent-primary)" : "transparent",
                border: active ? "none" : "1.5px solid var(--border)",
              }}
            >
              {active && <Check className="w-4 h-4" style={{ color: "var(--on-accent)" }} />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-text-primary text-sm font-medium">
                {opt.label}
              </span>
              <span className="block text-text-tertiary text-xs">
                {opt.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
