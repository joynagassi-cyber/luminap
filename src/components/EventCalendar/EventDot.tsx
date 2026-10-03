/**
 * Pastille de statut d'événement (Lumina — Phase 2).
 *
 * `span` rond 8×8, couleur = `EVENT_STATUS_COLORS[status]` (jamais de hex),
 * fallback `var(--text-tertiary)` si statut inconnu.
 */

import { EVENT_STATUS_COLORS } from "@/lib/event-status";

interface Props {
  status: string | undefined;
  slot?: "start" | "end" | "fixed" | "item-start" | "item-end";
  style?: React.CSSProperties;
}

export function EventDot({ status, slot, style }: Props) {
  const color =
    (status ? EVENT_STATUS_COLORS[status] : undefined) ?? "var(--text-tertiary)";
  return (
    <span
      role="status"
      aria-label={status ? `Statut ${status}` : "Statut inconnu"}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export default EventDot;
