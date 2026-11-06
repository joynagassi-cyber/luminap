/**
 * LuBadge / LuDelta — primitives P2 (spec §6).
 *
 * Pill hauteur 24, padding 8, 12/600. Variantes :
 *  - soft-income / soft-expense / soft-neutral / soft-accent (fonds *-soft) ;
 *  - on-hero (translucide, sur carte hero) ;
 *  - new (surface-inverse sur carte accent).
 * LuDelta ajoute l'icône ▲/▼ (10) et le signe — jamais la couleur seule
 * (règle §0.4 : revenu/dépense = signe + icône + couleur).
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { CSSProperties, HTMLAttributes } from "react";
import { Triangle } from "lucide-react";

export type LuBadgeVariant =
  | "soft-income"
  | "soft-expense"
  | "soft-neutral"
  | "soft-accent"
  | "on-hero"
  | "new";

function variantStyle(variant: LuBadgeVariant): CSSProperties {
  switch (variant) {
    case "soft-income":
      return { background: "var(--lu-income-soft)", color: "var(--lu-income)" };
    case "soft-expense":
      return { background: "var(--lu-expense-soft)", color: "var(--lu-expense)" };
    case "soft-neutral":
      return { background: "var(--lu-surface-2)", color: "var(--lu-fg-muted)" };
    case "soft-accent":
      return { background: "var(--lu-accent-soft)", color: "var(--lu-accent)" };
    case "on-hero":
      return {
        background: "var(--lu-glass-bg)",
        color: "var(--lu-hero-fg)",
        border: "1px solid var(--lu-glass-border)",
      };
    case "new":
      return { background: "var(--lu-surface-inverse)", color: "var(--lu-fg-inverse)" };
  }
}

export interface LuBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: LuBadgeVariant;
}

export function LuBadge({ variant = "soft-neutral", style, className = "", ...rest }: LuBadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-[var(--lu-radius-pill)] px-2 text-xs font-semibold ${className}`}
      style={{ ...variantStyle(variant), ...style }}
      {...rest}
    />
  );
}

export interface LuDeltaProps extends HTMLAttributes<HTMLSpanElement> {
  /** Sens du delta : true = hausse (▲, income), false = baisse (▼, expense). */
  positive: boolean;
  children: React.ReactNode;
}

export function LuDelta({ positive, children, style, className = "", ...rest }: LuDeltaProps) {
  return (
    <LuBadge
      variant={positive ? "soft-income" : "soft-expense"}
      className={className}
      style={style}
      {...rest}
    >
      <Triangle
        size={10}
        aria-hidden
        className={positive ? "rotate-180 fill-current" : "fill-current"}
      />
      {children}
    </LuBadge>
  );
}

export default LuBadge;
