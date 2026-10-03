// CircleAction — bouton rond d'action rapide (56px), ombre + dégradé accent
// uniques (M23 : plus de formules de shadow ad-hoc par page).
// Prop `tone` (M23 résidu) : couleurs sémantiques en lieu du dégradé accent
// (Finance : entrée = income / dépense = expense). `soft` : variant réduit
// (fond semi-transparent 40 px) pour les grilles compactes d'actions rapides.
import React from "react";

interface CircleActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
  /** Couleurs sémantiques (fonds --data-*) à la place du dégradé accent. */
  tone?: "income" | "expense" | "advance";
  /** Fond semi-transparent (color-mix 18 %) au lieu du fond plein. */
  soft?: boolean;
}

const TONE: Record<string, string> = {
  income: "var(--data-income)",
  expense: "var(--data-expense)",
  advance: "var(--data-advance)",
};

export default function CircleAction({
  children,
  onClick,
  "aria-label": ariaLabel,
  tone,
  soft,
}: CircleActionProps) {
  const size = soft ? "w-10 h-10" : "w-14 h-14";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${size} rounded-full flex items-center justify-center transition-transform active:scale-[0.96]`}
      style={{
        background: tone
          ? soft
            ? `color-mix(in srgb, ${TONE[tone]} 18%, transparent)`
            : TONE[tone]
          : "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
        color: tone && soft ? TONE[tone] : "var(--on-accent)",
        boxShadow: tone && soft ? "none" : "var(--shadow-accent)",
      } as React.CSSProperties}
    >
      {children}
    </button>
  );
}
