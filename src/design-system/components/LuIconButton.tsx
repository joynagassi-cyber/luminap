/**
 * LuIconButton — primitive P2 (spec §6 « Boutons »).
 *
 * Cercle 40, variante `border` (bordure 1px) ou `filled` (fond surface-2).
 * `aria-label` obligatoire (bouton sans texte). Zone tactile 40 ≥ 44 non
 * atteinte : le parent peut augmenter le conteneur ; on garde 40 comme au
 * catalogue mais on expose `size` pour passer à 44.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface LuIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "border" | "filled";
  size?: 40 | 44;
  icon: ReactNode;
  /** Obligatoire : bouton icône sans libellé visible. */
  "aria-label": string;
}

export function LuIconButton({
  variant = "border",
  size = 40,
  icon,
  disabled,
  style,
  className = "",
  ...rest
}: LuIconButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-full transition-transform",
        "active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      ].join(" ")}
      style={{
        width: size,
        height: size,
        color: "var(--lu-fg)",
        background: variant === "filled" ? "var(--lu-surface-2)" : "transparent",
        border: variant === "border" ? "1px solid var(--lu-border-strong)" : "none",
        outlineColor: "var(--lu-focus-ring)",
        ...style,
      }}
      {...rest}
    >
      {icon}
    </button>
  );
}

export default LuIconButton;
