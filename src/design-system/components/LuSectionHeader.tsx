/**
 * LuSectionHeader — primitive P2 (spec §6 « Cartes et listes »).
 *
 * Titre 15–18/700 à gauche, lien d'action accent à droite (« Voir tout »).
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";

export interface LuSectionHeaderProps {
  title: string;
  /** Lien d'action à droite (ex. « Voir tout »). */
  actionLabel?: string;
  onAction?: () => void;
  /** Contenu additionnel sous le titre (ex. total). */
  meta?: ReactNode;
}

export function LuSectionHeader({ title, actionLabel, onAction, meta }: LuSectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-[17px] font-bold leading-7" style={{ color: "var(--lu-fg)" }}>
          {title}
        </h2>
        {meta && <div className="text-xs" style={{ color: "var(--lu-fg-muted)" }}>{meta}</div>}
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-[var(--lu-radius-sm)] px-1 py-1 text-sm font-semibold focus-visible:outline focus-visible:outline-2"
          style={{ color: "var(--lu-accent)", outlineColor: "var(--lu-focus-ring)" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default LuSectionHeader;
