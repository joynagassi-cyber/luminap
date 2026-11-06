/**
 * LuTransactionRow — composite P3 (spec §6 « LuListRow / LuTransactionRow »).
 *
 * Carte rayon 16, padding 12–16 ; icône 40–44 dans un conteneur rayon 12–14
 * (surface-2 ou accent-soft) ; titre 15/600 ; sous-titre 12 muted ; montant
 * à droite 15/600 tabulaire signé + ▲/▼ ; variante chevron.
 * `grouped` (thèmes clairs) : lignes dans une carte groupe, séparateurs
 * 1 px --lu-border au lieu d'une carte par ligne.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { LuAmount } from "./LuAmount";

export interface LuTransactionRowProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  /** Conteneur d'icône : surface-2 (défaut) ou accent-soft. */
  iconTone?: "default" | "accent";
  /** Montant signé en unités majeures (négatif = dépense). */
  amount?: number;
  /** Groupe : « 9 transactions ». */
  count?: number;
  chevron?: boolean;
  onClick?: () => void;
  /** Lignes groupées (carte unique + séparateurs). */
  grouped?: boolean;
}

export function LuTransactionRow({
  title,
  subtitle,
  icon,
  iconTone = "default",
  amount,
  count,
  chevron,
  onClick,
  grouped,
}: LuTransactionRowProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      data-testid="lu-transaction-row"
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
        onClick ? "focus-visible:outline focus-visible:outline-2 active:scale-[.99] transition-transform" : ""
      } ${grouped ? "" : "rounded-[var(--lu-radius-md)]"}`}
      style={{
        background: grouped ? "transparent" : "var(--lu-surface)",
        borderTop: grouped ? "1px solid var(--lu-border)" : "none",
        outlineColor: "var(--lu-focus-ring)",
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center"
        style={{
          borderRadius: "var(--lu-radius-md)",
          background: iconTone === "accent" ? "var(--lu-accent-soft)" : "var(--lu-surface-2)",
          color: iconTone === "accent" ? "var(--lu-accent)" : "var(--lu-fg-muted)",
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold" style={{ color: "var(--lu-fg)" }}>
          {title}
        </span>
        <span className="block truncate text-xs" style={{ color: "var(--lu-fg-muted)" }}>
          {subtitle ?? (count != null ? `${count} transactions` : "")}
        </span>
      </span>
      {amount != null && (
        <span className="flex shrink-0 items-center gap-1">
          <LuAmount amount={amount} size="body" signed className="font-semibold" />
          <span aria-hidden style={{ color: amount >= 0 ? "var(--lu-income)" : "var(--lu-expense)", fontSize: 10 }}>
            {amount >= 0 ? "▲" : "▼"}
          </span>
        </span>
      )}
      {chevron && <ChevronRight size={18} aria-hidden style={{ color: "var(--lu-fg-subtle)" }} />}
    </Wrapper>
  );
}

export default LuTransactionRow;
