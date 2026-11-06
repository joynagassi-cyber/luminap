/**
 * LuBanner — composite P3 (spec §6 « LuBanner »).
 *
 * Fond `--lu-accent-soft` (ou variante sombre), texte 13/500, bouton
 * fermer ✕. Variante *ligne d'action* pleine largeur : cercle d'icône +
 * titre + sous-titre + chevron.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";
import { ChevronRight, X } from "lucide-react";

export interface LuBannerProps {
  /** Variante ligne d'action cliquable pleine largeur. */
  action?: boolean;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClick?: () => void;
  /** Fermable (bouton ✕ à droite). */
  dismissible?: boolean;
  onDismiss?: () => void;
  /** Variante sombre (overlay) au lieu de accent-soft. */
  dark?: boolean;
}

export function LuBanner({ action, title, subtitle, icon, onClick, dismissible, onDismiss, dark }: LuBannerProps) {
  const bg = dark ? "var(--lu-overlay-ink)" : "var(--lu-accent-soft)";
  const fg = dark ? "var(--lu-fg)" : "var(--lu-fg)";

  if (action) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid="lu-banner"
        data-variant="action"
        className="flex w-full items-center gap-3 rounded-[var(--lu-radius-md)] px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 active:scale-[.99] transition-transform"
        style={{ background: bg, color: fg, outlineColor: "var(--lu-focus-ring)" }}
      >
        {icon && (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--lu-surface)", color: "var(--lu-accent)" }}
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{title}</span>
          {subtitle && (
            <span className="block truncate text-xs" style={{ color: "var(--lu-fg-muted)" }}>{subtitle}</span>
          )}
        </span>
        <ChevronRight size={18} aria-hidden style={{ color: "var(--lu-fg-subtle)" }} />
      </button>
    );
  }

  return (
    <div
      data-testid="lu-banner"
      className="flex w-full items-center gap-3 rounded-[var(--lu-radius-md)] px-4 py-3"
      style={{ background: bg, color: fg }}
    >
      <p className="min-w-0 flex-1 text-[13px] font-medium leading-5">{title}</p>
      {dismissible && (
        <button
          type="button"
          aria-label="Fermer"
          onClick={onDismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2"
          style={{ color: "var(--lu-fg-muted)", outlineColor: "var(--lu-focus-ring)" }}
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}

export default LuBanner;
