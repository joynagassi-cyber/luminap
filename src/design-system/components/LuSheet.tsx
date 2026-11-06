/**
 * LuSheet — composite P3 (spec §6 « LuSheet »).
 *
 * Bottom sheet : poignée 36×4, rayon haut 28, points d'ancrage 60 % /
 * 92 % de la hauteur (snap), fond surface, ombre lg, backdrop scrim.
 * Contenu libre (formulaire de saisie composé de LuSegmented / LuField /
 * LuChip…). Fermeture : backdrop, Échap, poignée.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import { useEffect, type ReactNode } from "react";

export interface LuSheetProps {
  open: boolean;
  onClose: () => void;
  /** Point d'ancrage initial : 0.6 (défaut) ou 0.92 (plein écran). */
  snap?: 0.6 | 0.92;
  title?: string;
  children: ReactNode;
}

export function LuSheet({ open, onClose, snap = 0.6, title, children }: LuSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "var(--lu-scrim)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Feuille"}
        data-testid="lu-sheet"
        data-snap={snap}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
        style={{
          height: `${snap * 100}vh`,
          background: "var(--lu-surface)",
          borderRadius: "var(--lu-radius-xl) var(--lu-radius-xl) 0 0",
          boxShadow: "var(--lu-shadow-lg)",
        }}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="mx-auto mt-2 flex h-4 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--lu-border-strong)" }}
        >
          <span className="sr-only">Fermer</span>
        </button>
        {title && (
          <p className="px-5 pb-1 pt-1 text-base font-bold" style={{ color: "var(--lu-fg)" }}>{title}</p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </>
  );
}

export default LuSheet;
