import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useEvents, useTransactions, useMembers } from "@/lib/dataLayer";
import { Plus, Clock, Gift, ArrowUp, ArrowDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import CircleAction from "@/components/CircleAction";
import { EventsSkeleton } from "@/components/PageSkeletons";
import EmptyState from "@/components/EmptyState";
import { formatDate, formatCurrencyCompact } from "@/lib/utils";
import SegmentedTabs from "@/components/SegmentedTabs";
import EventCalendar from "@/components/EventCalendar";
import EventTimeline from "@/components/EventCalendar/EventTimeline";
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from "@/lib/event-status";

/** Vues de la page Événements : liste (défaut) | calendrier | timeline. */
type ViewMode = "list" | "calendar" | "timeline";

export default function Events() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: psEvents, isLoading: psLoading } = useEvents();
  const { data: psTransactions } = useTransactions();

  const events = psEvents ?? [];
  const transactions = psTransactions ?? [];

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [visibleCount, setVisibleCount] = useState(50);

  // ?date=YYYY-MM-DD (navigation calendrier → timeline du jour) : bascule en timeline
  const dateParam = searchParams.get("date");
  useEffect(() => {
    if (dateParam) setViewMode("timeline");
  }, [dateParam]);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a: any, b: any) =>
        new Date(b.start_date || b.startDate).getTime() -
        new Date(a.start_date || a.startDate).getTime(),
    );
  }, [events]);

  // groupBy : évite le .filter par ligne (O(n×m) → O(n+m)).
  const txsByEvent = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of transactions) {
      const eid = t.event_id || t.eventId;
      if (!eid) continue;
      const list = map.get(eid);
      if (list) list.push(t);
      else map.set(eid, [t]);
    }
    return map;
  }, [transactions]);

  const visibleEvents = sortedEvents.slice(0, visibleCount);

  return (
    <IonPage>
      {psLoading ? (
        <IonContent fullscreen>
          <EventsSkeleton />
        </IonContent>
      ) : (
        <IonContent className="bg-canvas" fullscreen>
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-text-primary font-bold text-xl">
                  Événements
                </h1>
                <p className="text-text-tertiary text-xs mt-0.5">
                  {events.length} événement{events.length !== 1 ? "s" : ""}
                </p>
              </div>
              <CircleAction
                aria-label="Créer un nouvel événement"
                onClick={() => navigate("/event/new")}
              >
                <Plus className="w-5 h-5" />
              </CircleAction>
            </div>

            {/* Toggle Liste | Calendrier | Timeline — pattern SegmentedTabs */}
            <div className="mb-5">
              <SegmentedTabs
                tabs={[
                  { id: "list", label: "Liste" },
                  { id: "calendar", label: "Calendrier" },
                  { id: "timeline", label: "Timeline" },
                ]}
                active={viewMode}
                onChange={(id) => setViewMode(id as ViewMode)}
              />
            </div>

            {viewMode === "calendar" ? (
              <EventCalendar
                events={events}
                onSelectEvent={(id) => navigate(`/event/${id}`)}
                onSelectDay={(iso) => navigate(`/events?date=${iso}`)}
              />
            ) : viewMode === "timeline" ? (
              <EventTimeline
                events={events}
                onSelectEvent={(id) => navigate(`/event/${id}`)}
              />
            ) : sortedEvents.length === 0 ? (
              <EmptyState
                title="Aucun événement"
                description="Planifiez vos prochaines célébrations"
                actionLabel="Créer un événement"
                onAction={() => navigate("/event/new")}
              />
            ) : (
              <div className="space-y-3">
                {visibleEvents.map((event: any) => {
                  const color = EVENT_STATUS_COLORS[event.status] || "var(--text-tertiary)";
                  const eventTxs = txsByEvent.get(event.id) ?? [];
                  const income = eventTxs
                    .filter(
                      (t: any) =>
                        t.type === "INCOME" && t.status === "APPROVED",
                    )
                    .reduce((s: number, t: any) => s + t.amount, 0);
                  const expense = eventTxs
                    .filter(
                      (t: any) =>
                        t.type === "EXPENSE" && t.status === "APPROVED",
                    )
                    .reduce((s: number, t: any) => s + t.amount, 0);
                  const budgetItems = event.budget_items
                    ? JSON.parse(event.budget_items)
                    : [];
                  return (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/event/${event.id}`)}
                      className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                      aria-label={`Voir les détails de ${event.name}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: color + "20" }}
                        >
                          <Gift
                            className="text-lg"
                            style={{ color: "var(--accent-primary)" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-semibold truncate">
                            {event.name}
                          </p>
                          <p className="text-text-tertiary text-xs mt-0.5">
                            {formatDate(event.start_date || event.startDate)}
                            {event.end_date || event.endDate
                              ? " → " +
                                formatDate(event.end_date || event.endDate)
                              : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ color, backgroundColor: color + "20" }}
                            >
                              {EVENT_STATUS_LABELS[event.status] || event.status}
                            </span>
                            {budgetItems.length > 0 && (
                              <span className="text-xs text-text-tertiary">
                                {budgetItems.length} poste
                                {budgetItems.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {eventTxs.length > 0 && (
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span
                                className="flex items-center gap-1"
                                style={{ color: "var(--data-income)" }}
                              >
                                <ArrowUp className="w-3 h-3" /> +
                                {formatCurrencyCompact(income)} F
                              </span>
                              <span
                                className="flex items-center gap-1"
                                style={{ color: "var(--data-expense)" }}
                              >
                                <ArrowDown className="w-3 h-3" /> -
                                {formatCurrencyCompact(expense)} F
                              </span>
                            </div>
                          )}
                        </div>
                        <Clock className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
                {sortedEvents.length > visibleCount && (
                  <button
                    onClick={() => setVisibleCount((c) => c + 50)}
                    className="w-full py-3 rounded-xl text-sm font-medium"
                    aria-label="Afficher plus d'événements"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    Afficher plus
                  </button>
                )}
              </div>
            )}
          </div>
          <BottomNav />
        </IonContent>
      )}
    </IonPage>
  );
}
