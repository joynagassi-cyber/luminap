/**
 * LuAmount — primitive P2 (spec §5 « Montants »).
 *
 * `Intl.NumberFormat` selon la devise (XOF/FCFA sans décimales), chiffres
 * tabulaires (`font-variant-numeric: tabular-nums`), vrai signe « − »
 * (U+2212), partie entière en `--lu-fg`, décimales en `--lu-fg-subtle`,
 * espace fine insécable pour les milliers (fourni par Intl fr-FR).
 *
 * `amount` est en unités MAJEURES (ex. 142830 → « 142 830 XOF »).
 * 100 % jetons --lu-* (ratchet lint).
 */
import { useMemo } from "react";
import type { HTMLAttributes } from "react";

export type LuAmountSize = "display" | "amount-lg" | "title" | "body";

const FONT_SIZE: Record<LuAmountSize, number> = {
  display: 44,
  "amount-lg": 36,
  title: 16,
  body: 14,
};

export interface LuAmountProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  amount: number;
  currency?: string;
  size?: LuAmountSize;
  /** Affiche aussi le « + » des montants positifs (deltas). */
  signed?: boolean;
}

const MINUS = "−"; // U+2212

export function LuAmount({
  amount,
  currency = "XOF",
  size = "body",
  signed = false,
  style,
  ...rest
}: LuAmountProps) {
  const parts = useMemo(() => {
    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      currencyDisplay: "code",
    });
    return formatter.formatToParts(amount);
  }, [amount, currency]);

  let integer = "";
  let fraction = "";
  let sign = "";
  let currencyPart = "";
  for (const part of parts) {
    switch (part.type) {
      case "minusSign":
        sign = MINUS;
        break;
      case "plusSign":
        sign = "+";
        break;
      case "integer":
      case "group":
        integer += part.value;
        break;
      case "decimal":
      case "fraction":
        fraction += part.value;
        break;
      case "currency":
        currencyPart = part.value;
        break;
      default:
        integer += part.value; // literal (espaces) — rattaché à la partie entière
    }
  }
  if (signed && amount > 0 && !sign) sign = "+";

  return (
    <span
      className="whitespace-nowrap font-bold"
      style={{
        fontSize: FONT_SIZE[size],
        lineHeight: 1.1,
        letterSpacing: size === "display" ? "-0.02em" : undefined,
        fontVariantNumeric: "tabular-nums",
        color: "var(--lu-fg)",
        ...style,
      }}
      {...rest}
    >
      {sign && <span aria-hidden>{sign}</span>}
      <span>{integer}</span>
      {fraction && (
        <span style={{ color: "var(--lu-fg-subtle)" }}>{fraction}</span>
      )}
      {currencyPart && (
        <span style={{ color: "var(--lu-fg-muted)", fontWeight: 600 }}> {currencyPart}</span>
      )}
    </span>
  );
}

export default LuAmount;
