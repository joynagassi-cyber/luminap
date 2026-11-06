/**
 * LuEmptyState — primitive P2 (spec §6 « Cartes et listes »).
 *
 * Illustration 160 px tokenisée (tous les traits/fonds sont des jetons
 * --lu-* : elle suit le thème), titre 16/600, texte muted, CTA optionnel.
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { LuButton } from "./LuButton";

export interface LuEmptyStateProps {
  title: string;
  text?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Illustration custom (sinon icône Inbox 160 px dans un cercle surface-2). */
  illustration?: ReactNode;
}

export function LuEmptyState({ title, text, ctaLabel, onCta, illustration }: LuEmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center" data-testid="lu-empty-state">
      {illustration ?? (
        <div
          className="flex h-[160px] w-[160px] items-center justify-center rounded-full"
          style={{ background: "var(--lu-surface-2)", border: "1px solid var(--lu-border)" }}
        >
          <Inbox size={64} strokeWidth={1.75} aria-hidden style={{ color: "var(--lu-fg-subtle)" }} />
        </div>
      )}
      <p className="mt-4 text-base font-semibold" style={{ color: "var(--lu-fg)" }}>{title}</p>
      {text && (
        <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--lu-fg-muted)" }}>{text}</p>
      )}
      {ctaLabel && (
        <div className="mt-4">
          <LuButton variant="primary" size="md" onClick={onCta}>
            {ctaLabel}
          </LuButton>
        </div>
      )}
    </div>
  );
}

export default LuEmptyState;
