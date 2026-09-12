import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useEvents, useTransactions, useMembers } from "@/lib/dataLayer";
import { Calendar, Plus, Clock, Gift, ArrowUp, ArrowDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { FullPageSkeleton, ListSkeleton } from "@/components/Skeleton";
import { formatDate, formatCurrencyCompact } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PLANIFIED: "#3B82F6",
  ONGOING: "#1DB954",
  COMPLETED: "#808080",
  CANCELLED: "#E51332",
};

const STATUS_LABELS: Record<string, string> = {
  PLANIFIED: "Planifié",
  ONGOING: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export default function Events() {
  const navigate = useNavigate();
  const { data: psEvents, isLoading: psLoading } = useEvents();
  const { data: psTransactions } = useTransactions();

  const events = psEvents ?? [];
  const transactions = psTransactions ?? [];

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a: any, b: any) =>
        new Date(b.start_date || b.startDate).getTime() -
        new Date(a.start_date || a.startDate).getTime(),
    );
  }, [events]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Événements</IonTitle>
        </IonToolbar>
      </IonHeader>
      {psLoading ? (
        <IonContent fullscreen>
          <FullPageSkeleton />
        </IonContent>
      ) : (
        <IonContent className="bg-canvas" fullscreen>
          <div className="max-w-lg mx-auto px-5 pb-32 pt-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-text-primary font-bold text-xl">
                  Événements
                </h1>
                <p className="text-text-tertiary text-xs mt-0.5">
                  {events.length} événement{events.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => navigate("/event/new")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #FF8533, var(--accent-primary))",
                  boxShadow: "0 4px 12px rgba(255,107,0,0.3)",
                }}
                aria-label="Créer un nouvel événement"
              >
                <Plus className="w-4 h-4" /> Créer
              </button>
            </div>

            {sortedEvents.length === 0 ? (
              <div
                className="text-center py-16 rounded-xl"
                style={{ backgroundColor: "#212121" }}
              >
                <Calendar className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
                <p className="text-text-tertiary text-sm mb-2">
                  Aucun événement
                </p>
                <p className="text-text-tertiary text-xs mb-4">
                  Planifiez vos prochaines célébrations
                </p>
                <button
                  onClick={() => navigate("/event/new")}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                  aria-label="Créer un événement"
                >
                  Créer un événement
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEvents.map((event: any) => {
                  const color = STATUS_COLORS[event.status] || "#808080";
                  const eventTxs = transactions.filter(
                    (t: any) =>
                      t.event_id === event.id || t.eventId === event.id,
                  );
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
                        backgroundColor: "#212121",
                        border: "1px solid #282828",
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
                              {STATUS_LABELS[event.status] || event.status}
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
                                style={{ color: "#1DB954" }}
                              >
                                <ArrowUp className="w-3 h-3" /> +
                                {formatCurrencyCompact(income)} F
                              </span>
                              <span
                                className="flex items-center gap-1"
                                style={{ color: "#E51332" }}
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
              </div>
            )}
          </div>
          <BottomNav />
        </IonContent>
      )}
    </IonPage>
  );
}
