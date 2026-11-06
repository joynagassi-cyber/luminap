/**
 * LuTimeline — composite P3 (spec §7 motif 2 « LuTimeline »).
 *
 * Liste verticale d'événements : point + ligne verticale + contenu
 * (titre 15/600, sous-titre 12 muted, montant signé à droite).
 * 100 % jetons --lu-* (ratchet lint).
 */
import type { ReactNode } from "react";
import { LuAmount } from "./LuAmount";

export interface LuTimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  amount?: number;
  /** Teinte du point : default (accent) ou personnalisée via icône. */
  icon?: ReactNode;
}

export interface LuTimelineProps {
  items: LuTimelineItem[];
}

export function LuTimeline({ items }: LuTimelineProps) {
  return (
    <ol data-testid="lu-timeline" className="w-full">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <li key={item.id} className="flex gap-3">
            <span className="flex w-6 shrink-0 flex-col items-center">
              <span
                className="mt-1.5 flex h-3 w-3 shrink-0 rounded-full"
                style={{
                  background: item.icon ? "var(--lu-surface-2)" : "var(--lu-accent)",
                  border: item.icon ? "1px solid var(--lu-border-strong)" : "none",
                  color: "var(--lu-accent)",
                }}
              >
                {item.icon}
              </span>
              {!last && <span className="w-px flex-1" style={{ background: "var(--lu-border)" }} aria-hidden />}
            </span>
            <span className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-5"}`}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[15px] font-semibold" style={{ color: "var(--lu-fg)" }}>{item.title}</span>
                {item.amount != null && <LuAmount amount={item.amount} size="body" signed className="shrink-0 font-semibold" />}
              </span>
              {item.subtitle && (
                <span className="block truncate text-xs" style={{ color: "var(--lu-fg-muted)" }}>{item.subtitle}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default LuTimeline;
