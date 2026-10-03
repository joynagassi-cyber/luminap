/**
 * Calendrier 100% maison (Lumina — Phase 2) — jour / semaine / mois / année.
 *
 * Pas de lib tierce (shadcn/react-day-picker) : grille maison, tokens Lumina
 * uniquement (`var(--surface)`, `var(--border)`, `var(--accent-primary)`…).
 * Les événements passent en props (`any[]` : PSEvent ou PSEventTask).
 */

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { IonItem, IonLabel } from "@ionic/react";
import {
  buildMonthGrid,
  buildWeekDays,
  buildYearGrid,
  groupByDay,
  isTodayIso,
} from "@/lib/useCalendarData";
import { getEventStart, getEventEnd } from "@/lib/event-status";
import { EventDot } from "./EventDot";

type View = "day" | "week" | "month" | "year";

interface Props {
  events: any[];
  onSelectEvent?: (id: string) => void;
  onSelectDay?: (iso: string) => void;
  initialView?: View;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Date de départ de l'ISO "YYYY-MM-DD" (00:00 local) — parse franc. */
const parseIso = (iso: string) => parseISO(iso + "T00:00:00");

/** Bouton de navigation (‹ › / ‹‹ ››). */
function NavBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-9 h-9 flex items-center justify-center rounded-lg transition-all active:scale-95 border-none"
      style={{
        backgroundColor: "var(--surface-hover)",
        color: "var(--text-secondary)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/** En-tête : navigation ‹‹ ‹ [label] › ›› + bouton Aujourd'hui + sélecteur de vue. */
function CalendarHeader({
  view,
  setView,
  cursor,
  onCursor,
  onToday,
}: {
  view: View;
  setView: (v: View) => void;
  cursor: Date;
  onCursor: (d: Date) => void;
  onToday: () => void;
}) {
  const shift = (delta: number) => {
    if (view === "month") onCursor(addMonths(cursor, delta));
    else if (view === "week") onCursor(addDays(cursor, delta * 7));
    else if (view === "day") onCursor(addDays(cursor, delta));
    else onCursor(addYears(cursor, delta));
  };
  const label =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: fr })
      : view === "week"
        ? `Semaine du ${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: fr })}`
        : view === "day"
          ? format(cursor, "EEEE d MMMM yyyy", { locale: fr })
          : format(cursor, "yyyy");

  const views: { id: View; label: string }[] = [
    { id: "day", label: "Jour" },
    { id: "week", label: "Semaine" },
    { id: "month", label: "Mois" },
    { id: "year", label: "Année" },
  ];

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: 12,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <NavBtn label="Précédent (mois/semaine)" onClick={() => shift(-1)} />
          <button
            type="button"
            onClick={onToday}
            className="text-xs font-medium rounded-lg px-3 h-9 border-none transition-all active:scale-95"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            Aujourd'hui
          </button>
          <NavBtn label="Suivant (mois/semaine)" onClick={() => shift(1)} />
        </div>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
      </div>
      {/* Sélecteur de vue */}
      <div
        className="flex gap-1 p-1 rounded-full"
        style={{ backgroundColor: "var(--surface-hover)" }}
        role="tablist"
        aria-label="Vue du calendrier"
      >
        {views.map((v) => {
          const on = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setView(v.id)}
              className="flex-1 h-9 rounded-full text-xs font-medium border-none transition-all active:scale-95"
              style={{
                backgroundColor: on ? "var(--surface)" : "transparent",
                color: on ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: on ? "var(--shadow-card)" : "none",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Item de liste (vue jour + vue semaine). */
function EventListItem({
  event,
  onSelectEvent,
}: {
  event: any;
  onSelectEvent?: (id: string) => void;
}) {
  const start = getEventStart(event);
  const end = getEventEnd(event);
  const sub =
    start != null
      ? format(parseIso(start.slice(0, 10)), "d MMM", { locale: fr })
      : "";
  const range = end ? ` → ${format(parseIso(end.slice(0, 10)), "d MMM", { locale: fr })}` : "";
  return (
    <IonItem
      lines="none"
      button={!!onSelectEvent}
      onButtonClick={() => event?.id && onSelectEvent?.(event.id)}
      style={{ cursor: onSelectEvent ? "pointer" : "default" }}
      aria-label={`Événement ${event?.name ?? ""}`}
    >
      <IonLabel>
        <div className="flex items-center gap-2">
          <EventDot status={event?.status} />
          <span
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {event?.name ?? "Événement"}
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {sub}
          {range}
        </span>
      </IonLabel>
    </IonItem>
  );
}

export default function EventCalendar({
  events,
  onSelectEvent,
  onSelectDay,
  initialView = "month",
}: Props) {
  const [view, setView] = useState<View>(initialView);
  const [cursor, setCursor] = useState<Date>(new Date());

  // Événements groupés par jour ISO (une fois par lot de données).
  const byDay = useMemo(() => groupByDay(format(cursor, "yyyy-MM-dd"), events), [events]);

  /* ── Vue MOIS : grille 7 colonnes (lun→dim), 6 semaines ── */
  const renderMonth = () => {
    const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
    return (
      <div>
        <div
          className="grid grid-cols-7 text-center text-xs font-medium mb-1"
          style={{ color: "var(--text-tertiary)" }}
        >
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div
          role="grid"
          aria-label="Calendrier mensuel"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
          }}
        >
          {cells.map((c) => {
            const dayEvents = byDay[c.iso] ?? [];
            const isToday = isTodayIso(c.iso);
            const titleText =
              dayEvents.slice(0, 3).map((e) => e?.name ?? "").filter(Boolean).join(", ");
            return (
              <button
                key={c.iso}
                type="button"
                role="gridcell"
                aria-label={`${format(parseIso(c.iso), "d MMMM", { locale: fr })}${
                  titleText ? ` — ${titleText}` : ""
                }`}
                title={titleText || undefined}
                onClick={() => onSelectDay?.(c.iso)}
                className="text-left rounded-lg border transition-all active:scale-95 overflow-hidden"
                style={{
                  minHeight: 96,
                  backgroundColor: isToday ? "var(--surface-hover)" : "var(--surface)",
                  border: isToday ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                  padding: 6,
                  cursor: "pointer",
                }}
              >
                <div
                  className="text-xs mb-1"
                  style={{
                    fontWeight: c.inMonth ? 700 : 400,
                    color: c.inMonth ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {c.day}
                </div>
                {/* Pastilles de statuts au-dessous du titre du jour */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <EventDot key={e?.id ?? i} status={e?.status} />
                  ))}
                </div>
                {/* Max 3 événements visibles, tooltip du nom */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div
                      key={e?.id ?? i}
                      title={e?.name ?? ""}
                      className="text-[10px] truncate"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {e?.name ?? ""}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Vue SEMAINE : 7 colonnes (lun→dim), liste des événements du jour ── */
  const renderWeek = () => {
    const mondayIso = format(startOfWeek(cursor, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const days = buildWeekDays(mondayIso);
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
        }}
      >
        {days.map((iso, i) => {
          const dayEvents = byDay[iso] ?? [];
          const isToday = isTodayIso(iso);
          return (
            <div
              key={iso}
              style={{
                backgroundColor: "var(--surface)",
                border: isToday ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                borderRadius: 10,
                padding: 8,
              }}
            >
              <div
                className="text-xs font-semibold mb-1"
                style={{ color: isToday ? "var(--accent-primary)" : "var(--text-primary)" }}
              >
                {WEEKDAYS[i]} {parseIso(iso).getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((e, j) => (
                  <div
                    key={e?.id ?? j}
                    onClick={() => onSelectEvent?.(e.id)}
                    title={e?.name}
                    className="rounded-md p-1 text-[10px] truncate transition-all active:scale-95"
                    style={{
                      backgroundColor: "var(--surface-hover)",
                      color: "var(--text-secondary)",
                      cursor: onSelectEvent ? "pointer" : "default",
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <EventDot status={e?.status} />
                      <span className="truncate">{e?.name ?? ""}</span>
                    </div>
                  </div>
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    +{dayEvents.length - 4}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ── Vue JOUR : 1 IonItem par événement de la date ── */
  const renderDay = () => {
    const iso = format(cursor, "yyyy-MM-dd");
    const dayEvents = byDay[iso] ?? [];
    if (dayEvents.length === 0) {
      return (
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Aucun événement le {format(cursor, "d MMMM", { locale: fr })}
          </p>
        </div>
      );
    }
    return (
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        {dayEvents.map((e, i) => (
          <EventListItem key={e?.id ?? i} event={e} onSelectEvent={onSelectEvent} />
        ))}
      </div>
    );
  };

  /* ── Vue ANNÉE : grille 4×3 de mois (pastilles + compteur) ── */
  const renderYear = () => {
    const year = cursor.getFullYear();
    const months = buildYearGrid(year);
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {months.map((ym, idx) => {
          // Événements du mois : du 1er au n-ième jour
          const firstIso = `${ym}-01`;
          const monthEvents: any[] = [];
          for (let d = 1; d <= 31; d++) {
            const iso = `${ym}-${String(d).padStart(2, "0")}`;
            const list = byDay[iso];
            if (list) monthEvents.push(...list);
          }
          const hasEvents = monthEvents.length > 0;
          const monthLabel = format(
            parseIso(`${ym}-01`),
            "MMM",
            { locale: fr },
          );
          const active = idx === cursor.getMonth();
          return (
            <button
              key={ym}
              type="button"
              onClick={() => {
                setCursor(parseIso(`${ym}-01`));
                setView("month");
              }}
              className="rounded-xl border transition-all active:scale-95 p-2 text-left"
              style={{
                backgroundColor: "var(--surface)",
                border: active ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                cursor: "pointer",
              }}
              aria-label={`Ouvrir le mois ${monthLabel} ${year}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-semibold"
                  style={{ color: active ? "var(--accent-primary)" : "var(--text-primary)" }}
                >
                  {monthLabel}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {monthEvents.length} évts
                </span>
              </div>
              {/* Pastilles du 1er au n-ième jour (max 7 visibles) */}
              <div className="flex flex-wrap gap-1">
                {monthEvents.slice(0, 7).map((e, i) => (
                  <EventDot key={e?.id ?? i} status={e?.status} />
                ))}
                {monthEvents.length === 0 && (
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    —
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <CalendarHeader
        view={view}
        setView={setView}
        cursor={cursor}
        onCursor={setCursor}
        onToday={() => {
          const now = new Date();
          setCursor(now);
          if (view === "day") setCursor(startOfWeek(now, { weekStartsOn: 1 }));
        }}
      />
      {view === "month" && renderMonth()}
      {view === "week" && renderWeek()}
      {view === "day" && renderDay()}
      {view === "year" && renderYear()}
    </div>
  );
}
