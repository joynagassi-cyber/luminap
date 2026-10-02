// CircleAction — bouton rond d'action rapide (56px), ombre + dégradé accent
// uniques (M23 : plus de formules de shadow ad-hoc par page).
import React from "react";

interface CircleActionProps {
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
}

export default function CircleAction({
  children,
  onClick,
  "aria-label": ariaLabel,
}: CircleActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-[0.96]"
      style={{
        background:
          "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
        color: "var(--on-accent)",
        boxShadow: "var(--shadow-accent)",
      } as React.CSSProperties}
    >
      {children}
    </button>
  );
}
