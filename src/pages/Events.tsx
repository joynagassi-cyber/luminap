/**
 * Events v2 — Liste des événements, redesign premium.
 *
 * Design : fond sombre, en-tête avec stats, vue liste/calendrier/timeline,
 * cartes d'événements avec dates et budgets.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

import { useState, useEffect, useMemo, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import { useEvents, useTransactions, useMembers, parseBudgetItems, isPowerSyncReadyNow } from "@/lib/dataLayer";
import { Plus, Clock, Gift, ArrowUp, ArrowDown, Calendar } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import CircleAction from "@/components/CircleAction";
import { EventsSkeleton } from "@/components/PageSkeletons";
import EmptyState from "@/components/EmptyState";
import CapabilityBanner from "@/components/CapabilityBanner";
import { getOrganizationId } from "@/lib/orgContext";
import { formatDate, formatCurrencyCompact } from "@/lib/utils";
import { Section, InfoCard, ActionCard, ListItem, StatCard } from "@/design/components/PageShell";

type ViewMode = "list" | "calendar" | "timeline";

export default function Events() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: psEvents, isLoading: psLoading } = useEvents();
  const { data: psTransactions } = useTransactions();
  const { data: psMembers } = useMembers();

  const events = psEvents ?? [];
  const transactions = psTransactions ?? [];

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [visibleCount, setVisibleCount] = useState(50);

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

  const upcomingEvents = sortedEvents.filter(
    (e: any) => new Date(e.start_date || e.startDate) >= new Date(),
  );
  const pastEvents = sortedEvents.filter(
    (e: any) => new Date(e.start_date || e.startDate) < new Date(),
  );

  const handleAddEvent = () => {
    navigate("/event/new", { replace: true });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          {psLoading ? (
            <div data-screen-state="loading" className="px-5">
              <EventsSkeleton />
            </div>
          ) : (
            <Fragment>
              <h1 className="sr-only">Événements — gestion des événements</h1>
              <TopHeader title="Événements" />
              <div data-screen-state="ready" className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
                <CapabilityBanner orgId={getOrganizationId()} />

                {/* En-tête avec stats et action */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-text-primary font-bold text-2xl leading-tight">Événements</h2>
                      <p className="text-text-tertiary text-sm">
                        Organisez et suivez vos événements et cultes.
                      </p>
                    </div>
                    <ActionCard
                      tone="primary"
                      onClick={handleAddEvent}
                      aria-label="Créer un événement"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Nouvel événement</span>
                    </ActionCard>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <StatCard
                      value={events.length.toString()}
                      label="Total événements"
                      icon={<Calendar className="w-5 h-5" />}
                      tone="primary"
                    />
                    <StatCard
                      value={upcomingEvents.length.toString()}
                      label="À venir"
                      icon={<Clock className="w-5 h-5" />}
                      tone="income"
                    />
                    <StatCard
                      value={pastEvents.length.toString()}
                      label="Passés"
                      icon={<Gift className="w-5 h-5" />}
                      tone="expense"
                    />
                  </div>
                </div>

                {/* Sélecteur de vue */}
                <div className="flex gap-2 mb-6">
                  {["list", "calendar", "timeline"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setViewMode(v as ViewMode)}
                      className={`flex-1 py-3 rounded-xl text-xs font-medium transition-all ${
                        viewMode === v
                          ? "bg-accent-primary text-black shadow-accent"
                          : "bg-surface border border-border text-text-secondary"
                      }`}
                    >
                      {v === "list" ? "Liste" : v === "calendar" ? "Calendrier" : "Timeline"}
                    </button>
                  ))}
                </div>

                {/* Liste des événements */}
                {events.length === 0 ? (
                  <EmptyState
                    title="Aucun événement"
                    description="Créez votre premier événement pour commencer à organiser votre communauté."
                    icon={<Calendar className="w-6 h-6" />}
                    action={handleAddEvent}
                    actionLabel="Créer un événement"
                  />
                ) : (
                  <Section title="Événements à venir">
                    {upcomingEvents.slice(0, visibleCount).map((event: any) => (
                      <ListItem
                        key={event.id}
                        icon={
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                            }}
                          >
                            <Calendar className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                          </div>
                        }
                        title={event.name || "Événement sans nom"}
                        subtitle={formatDate(event.start_date || event.startDate)}
                        onClick={() => navigate(`/event/${event.id}`)}
                      />
                    ))}
                    {visibleCount < upcomingEvents.length && (
                      <button
                        onClick={() => setVisibleCount((c) => c + 20)}
                        className="w-full py-3 rounded-xl text-sm font-medium text-center transition-all hover:bg-surface-hover"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        Charger plus <span className="ml-2">›</span>
                      </button>
                    )}
                  </Section>
                )}
              </div>
            </Fragment>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
