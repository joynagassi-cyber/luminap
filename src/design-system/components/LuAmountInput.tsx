/**
 * LuAmountInput — composite P3 (spec §6 « LuAmountInput »).
 *
 * Saisie de montant : valeur 40/700 tabulaire, devise en préfixe muted,
 * décimales atténuées. Accepte « 12500 », « 12 500,50 », « 12500.50 » ;
 * `onAmountChange` reçoit les unités MAJEURES (number).
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import { useEffect, useState } from "react";

export interface LuAmountInputProps {
  value: number;
  onAmountChange: (amount: number) => void;
  currency?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/** "12 500,50" / "12500.5" → 12500.5 (unités majeures). */
export function parseAmountInput(raw: string): number {
  const normalized = raw.replace(/[\s\u202F\u00A0]/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function LuAmountInput({ value, onAmountChange, currency = "XOF", disabled, "aria-label": ariaLabel = "Montant" }: LuAmountInputProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  return (
    <div
      className="flex w-full items-baseline gap-2 px-1 py-2"
      data-testid="lu-amount-input"
    >
      <span className="text-lg font-medium" style={{ color: "var(--lu-fg-muted)" }}>{currency}</span>
      <input
        value={text}
        disabled={disabled}
        inputMode="decimal"
        aria-label={ariaLabel}
        onChange={(e) => {
          setText(e.target.value);
          onAmountChange(parseAmountInput(e.target.value));
        }}
        className="min-w-0 flex-1 bg-transparent text-4xl font-bold tabular-nums outline-none disabled:opacity-40"
        style={{ color: "var(--lu-fg)", fontSize: "40px", lineHeight: "44px" }}
      />
    </div>
  );
}

export default LuAmountInput;
