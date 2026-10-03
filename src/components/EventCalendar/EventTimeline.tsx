/**
 * Timeline chronologique des événements (Lumina — Phase 2).
 *
 * 3 sections : Passés / Aujourd'hui / À venir (via `splitEventsByToday`).
 * Chaque item = `IonItem` (date + nom + pastille statut), cliquable.
 * Tokens uniquement : `var(--surface)`, `var(--border)`, `EVENT_STATUS_COLORS`.
 */

import { IonItem, IonLabel, IonContent } from "@ionic/react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { splitEventsByToday } from "@/lib/useCalendarData";
import { getEventStart } from "@/lib/event-status";
import { EventDot } from "./EventDot";

interface Props {
  events: any[];
  onSelectEvent?: (id: string) => void;
}

/** Item de timeline : date (31 oct. 2026) + nom + pastille statut. */
function TimelineItem({
  event,
  onSelectEvent,
}: {
  event: any;
  onSelectEvent?: (id: string) => void;
}) {
  const start = getEventStart(event);
  const dateLabel = start
    ? format(parseISO(start.slice(0, 10)), "d MMM yyyy", { locale: fr })
    : "Date inconnue";
  return (
    <IonItem
      lines="none"
      button={!!onSelectEvent}
      onButtonClick={() => event?.id && onSelectEvent?.(event.id)}
      style={{
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        cursor: onSelectEvent ? "pointer" : "default",
      }}
      aria-label={`Événement ${event?.name ?? ""} du ${dateLabel}`}
    >
      <IonLabel slot="start" style={{ display: "flex", flexDirection: "column", minWidth: 92 }}>
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {dateLabel}
        </span>
      </IonLabel>
      <IonLabel>
        <span
          className="font-semibold text-sm"
          style={{ color: "var(--text-primary)" }}
        >
          {event?.name ?? "Événement"}
        </span>
      </IonLabel>
      <EventDot status={event?.status} slot="end" />
    </IonItem>
  );
}

/** Section (titre + items), rendue seulement si non vide. */
function Section({
  title,
  items,
  onSelectEvent,
}: {
  title: string;
  items: any[];
  onSelectEvent?: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <h2
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        {title}
      </h2>
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
        }}
      >
        {items.map((e, i) => (
          <TimelineItem key={e?.id ?? i} event={e} onSelectEvent={onSelectEvent} />
        ))}
      </div>
    </div>
  );
}

export default function EventTimeline({ events, onSelectEvent }: Props) {
  const { past, today, upcoming } = splitEventsByToday(events);
  if (events.length === 0) {
    return (
      <IonContent style={{ padding: 16 }}>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Aucun événement à afficher
        </p>
      </IonContent>
    );
  }
  return (
    <div style={{ padding: 16 }}>
      <Section title="Aujourd'hui" items={today} onSelectEvent={onSelectEvent} />
      <Section title="À venir" items={upcoming} onSelectEvent={onSelectEvent} />
      <Section title="Passés" items={past} onSelectEvent={onSelectEvent} />
    </div>
  );
}
