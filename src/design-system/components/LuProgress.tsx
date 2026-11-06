/**
 * LuProgress — composite P3 (spec §6 « LuProgress »).
 *
 * Barre h 8 pill, piste `--lu-surface-2`, remplissage dégradé
 * `--lu-accent-vivid → --lu-accent` (jeton --lu-progress-fill) ; dates aux
 * extrémités, légende « x / y » en dessous. Variante budget : titre 14
 * muted + montant + « (33 %) restant sur … ».
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import { LuAmount } from "./LuAmount";

export interface LuProgressProps {
  /** 0–100. */
  value: number;
  /** Variante budget : titre + montant + « (x %) restant sur … ». */
  title?: string;
  amount?: number;
  startLabel?: string;
  endLabel?: string;
  /** Légende « x / y » en dessous. */
  legend?: string;
}

export function LuProgress({ value, title, amount, startLabel, endLabel, legend }: LuProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div data-testid="lu-progress" className="w-full">
      {(title || amount != null) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {title && (
            <span className="text-sm" style={{ color: "var(--lu-fg-muted)" }}>{title}</span>
          )}
          {amount != null && (
            <span className="text-sm font-semibold" style={{ color: "var(--lu-fg)" }}>
              <LuAmount amount={amount} size="body" />
              <span style={{ color: "var(--lu-fg-muted)", fontWeight: 400 }}> ({pct} %) restant</span>
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-[var(--lu-radius-pill)]"
        style={{ background: "var(--lu-surface-2)" }}
      >
        <div
          className="h-full rounded-[var(--lu-radius-pill)] transition-[width] duration-300"
          style={{ width: `${pct}%`, background: "var(--lu-progress-fill)" }}
        />
      </div>
      {(startLabel || endLabel || legend) && (
        <div className="mt-1 flex items-center justify-between text-xs" style={{ color: "var(--lu-fg-muted)" }}>
          <span>{startLabel ?? legend}</span>
          <span>{endLabel}</span>
        </div>
      )}
    </div>
  );
}

export default LuProgress;
