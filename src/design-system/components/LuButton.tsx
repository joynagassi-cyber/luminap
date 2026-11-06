/**
 * LuButton — primitive P2 (spec §6 « Boutons »).
 *
 * Variantes : primary / outline / tonal / dark / ghost / danger.
 * Tailles : lg 52 / md 44 / sm 32 (zone tactile ≥ 44×44 sur lg et md).
 * États (spec §5) : pressed scale(.98) + accent-pressed, focus clavier
 * anneau 2px --lu-focus-ring décalé 2px, disabled opacité .4, loading
 * (spinner à la place de l'icône, largeur stable).
 *
 * Règle §0 : 100 % jetons --lu-*, aucun littéral de couleur (ratchet lint).
 */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export type LuButtonVariant = "primary" | "outline" | "tonal" | "dark" | "ghost" | "danger";
export type LuButtonSize = "lg" | "md" | "sm";

const HEIGHT: Record<LuButtonSize, number> = { lg: 52, md: 44, sm: 32 };
const PADX: Record<LuButtonSize, number> = { lg: 24, md: 20, sm: 14 };
const FONT: Record<LuButtonSize, number> = { lg: 16, md: 14, sm: 13 };

function variantStyle(variant: LuButtonVariant): CSSProperties {
  switch (variant) {
    case "primary":
      return { background: "var(--lu-accent)", color: "var(--lu-on-accent)" };
    case "outline":
      return {
        background: "transparent",
        color: "var(--lu-accent)",
        border: "1.5px solid var(--lu-accent)",
      };
    case "tonal":
      return { background: "var(--lu-accent-soft)", color: "var(--lu-accent)" };
    case "dark":
      // Bouton sombre (ex. « Déposer » sur hero accent) : fond fg-inverse,
      // texte surface-inverse — la paire inversée garantit le contraste.
      return { background: "var(--lu-fg-inverse)", color: "var(--lu-surface-inverse)" };
    case "ghost":
      return { background: "transparent", color: "var(--lu-fg)" };
    case "danger":
      return { background: "var(--lu-expense)", color: "var(--lu-on-accent)" };
  }
}

export interface LuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LuButtonVariant;
  size?: LuButtonSize;
  /** pill (défaut) ou rounded (rayon 12, pleine largeur, h 48 — formulaires ocean). */
  shape?: "pill" | "rounded";
  loading?: boolean;
  /** Icône affichée à droite du libellé (flèche…). Masquée en loading. */
  icon?: ReactNode;
}

export function LuButton({
  variant = "primary",
  size = "lg",
  shape = "pill",
  loading = false,
  icon,
  disabled,
  children,
  style,
  className = "",
  ...rest
}: LuButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 font-semibold transition-transform",
        "active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none",
        // pressed : la variante primary assombrit via --lu-accent-pressed (spec §5).
        variant === "primary" ? "active:bg-[var(--lu-accent-pressed)]" : "",
        className,
      ].join(" ")}
      style={{
        height: shape === "rounded" ? 48 : HEIGHT[size],
        paddingLeft: PADX[size],
        paddingRight: PADX[size],
        fontSize: FONT[size],
        borderRadius: shape === "rounded" ? "var(--lu-radius-md)" : "var(--lu-radius-pill)",
        width: shape === "rounded" ? "100%" : undefined,
        outlineColor: "var(--lu-focus-ring)",
        opacity: disabled ? 0.4 : 1,
        ...(variant === "primary" && !disabled
          ? { background: "var(--lu-accent)", color: "var(--lu-on-accent)" }
          : {}),
        ...variantStyle(variant),
        ...style,
      }}
      {...rest}
    >
      {loading && (
        <Loader2
          size={size === "sm" ? 14 : 20}
          className="animate-spin"
          aria-hidden
          data-testid="lu-button-spinner"
        />
      )}
      <span>{children}</span>
      {!loading && (icon ?? <ArrowRight size={20} aria-hidden />)}
    </button>
  );
}

export default LuButton;
