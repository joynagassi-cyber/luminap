/**
 * LuCard — primitive P2 (spec §6 « Cartes et listes »).
 *
 * Variantes :
 *  - `surface` (défaut) : rayon 20–24, padding 16–20, fond surface + bordure ;
 *  - `inverse` : surface-inverse (1 par écran max — point focal) ;
 *  - `accent` : aplat accent, texte on-accent ;
 *  - `glass` : verre si effects=full, sinon repli surface-2 (spec) ;
 *  - `stat` : titre 14 muted + icône en haut, valeur énorme, légende ;
 *  - `tile` : action rapide — cercle d'icône 40 + label 12/500.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import { useContext, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { ThemeContext } from "@/design-system/theme/theme-context";

export type LuCardVariant = "surface" | "inverse" | "accent" | "glass" | "stat" | "tile";

export interface LuCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: LuCardVariant;
  /** Props de la variante stat. */
  title?: string;
  value?: ReactNode;
  legend?: string;
  /** Props des variantes stat / tile. */
  icon?: ReactNode;
  /** Props de la variante tile. */
  label?: string;
  onClick?: () => void;
}

export function LuCard({
  variant = "surface",
  title,
  value,
  legend,
  icon,
  label,
  onClick,
  style,
  className = "",
  children,
  ...rest
}: LuCardProps) {
  const effects = useContext(ThemeContext)?.effects ?? "full";

  const base: CSSProperties = {
    borderRadius: variant === "tile" ? "var(--lu-radius-lg)" : "var(--lu-radius-xl)",
    padding: variant === "tile" ? 12 : 20,
    background: "var(--lu-surface)",
    color: "var(--lu-fg)",
    border: "1px solid var(--lu-border)",
    boxShadow: "var(--lu-shadow-sm)",
    textAlign: variant === "tile" ? "center" : undefined,
    cursor: onClick ? "pointer" : undefined,
  };

  let variantStyle: CSSProperties = {};
  switch (variant) {
    case "inverse":
      variantStyle = {
        background: "var(--lu-surface-inverse)",
        color: "var(--lu-fg-inverse)",
        border: "none",
      };
      break;
    case "accent":
      variantStyle = {
        background: "var(--lu-accent)",
        color: "var(--lu-on-accent)",
        border: "none",
      };
      break;
    case "glass":
      variantStyle =
        effects === "full"
          ? {
              background: "var(--lu-glass-bg)",
              border: "1px solid var(--lu-glass-border)",
              backdropFilter: "blur(var(--lu-glass-blur))",
              WebkitBackdropFilter: "blur(var(--lu-glass-blur))",
            }
          : { background: "var(--lu-surface-2)" };
      break;
    default:
      break;
  }

  if (variant === "tile") {
    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={`transition-transform active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
        style={{ ...base, ...variantStyle, outlineColor: "var(--lu-focus-ring)", ...style }}
        {...rest}
      >
        <div
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "var(--lu-accent-soft)", color: "var(--lu-accent)" }}
        >
          {icon}
        </div>
        <p className="mt-2 text-xs font-medium" style={{ color: "var(--lu-fg)" }}>{label}</p>
        {children}
      </div>
    );
  }

  if (variant === "stat") {
    return (
      <div
        className={className}
        style={{ ...base, ...variantStyle, ...style }}
        {...rest}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--lu-fg-muted)" }}>{title}</p>
          {icon && <span style={{ color: "var(--lu-fg-muted)" }}>{icon}</span>}
        </div>
        <div className="mt-1">{value}</div>
        {legend && (
          <p className="mt-1 text-xs" style={{ color: "var(--lu-fg-muted)" }}>{legend}</p>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={className} style={{ ...base, ...variantStyle, ...style }} {...rest}>
      {children}
    </div>
  );
}

export default LuCard;
