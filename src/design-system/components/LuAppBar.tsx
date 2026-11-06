/**
 * LuAppBar — composite P3 (spec §6 « LuAppBar »).
 *
 * Hauteur 56 + safe-area ; 3 slots : retour | titre centré 16/600 |
 * actions. Variantes `tinted` (fond = teinte du hero, fusionne avec le
 * contenu), `transparent`, `solid` (surface + bordure basse).
 * Variante *grand titre* : 28/700 + métadonnée à droite (« 3 Total »).
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";

export type LuAppBarVariant = "tinted" | "transparent" | "solid";

export interface LuAppBarProps {
  title: string;
  variant?: LuAppBarVariant;
  onBack?: () => void;
  /** Actions à droite (icônes…). */
  actions?: ReactNode;
  /** Variante grand titre (28/700 + chevron de menu déroulant). */
  large?: boolean;
  /** Métadonnée à droite du grand titre (ex. « 3 Total »). */
  meta?: ReactNode;
}

export function LuAppBar({ title, variant = "solid", onBack, actions, large, meta }: LuAppBarProps) {
  const bg =
    variant === "solid"
      ? "var(--lu-surface)"
      : variant === "tinted"
        ? "var(--lu-accent-soft)"
        : "transparent";
  return (
    <header
      data-testid="lu-app-bar"
      data-variant={variant}
      className="flex w-full items-center gap-2 px-2 pb-2 pt-[max(12px,env(safe-area-inset-top))]"
      style={{
        minHeight: 56,
        background: bg,
        borderBottom: variant === "solid" ? "1px solid var(--lu-border)" : "none",
      }}
    >
      {onBack && (
        <button
          type="button"
          aria-label="Retour"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2"
          style={{ color: "var(--lu-fg)", outlineColor: "var(--lu-focus-ring)" }}
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
      )}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
        {large ? (
          <span
            className="truncate font-bold"
            style={{ color: "var(--lu-fg)", fontSize: "28px", lineHeight: "34px" }}
          >
            {title}
          </span>
        ) : (
          <span className="truncate text-base font-semibold" style={{ color: "var(--lu-fg)" }}>
            {title}
          </span>
        )}
        {large && <ChevronDown size={18} aria-hidden style={{ color: "var(--lu-fg-muted)" }} />}
      </div>
      {meta ? (
        <span className="shrink-0 text-xs" style={{ color: "var(--lu-fg-muted)" }}>{meta}</span>
      ) : (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      )}
      {!meta && !actions && <span className="w-10 shrink-0" aria-hidden />}
    </header>
  );
}

export default LuAppBar;
