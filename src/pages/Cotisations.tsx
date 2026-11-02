/**
 * Cotisations v2 — Suivi des cotisations par culte, redesign premium.
 *
 * Design : fond sombre, cartes de culte avec barres de progression,
 * statuts payé / impayé / absent avec badges colorés.
 * Tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : stats par culte, progression,
 * cap à 50 cartes + "Afficher plus", création de culte.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents, useCotisations, isPowerSyncReadyNow } from "@/lib/dataLayer";
import { CotisationsSkeleton } from "@/components/PageSkeletons";
import { formatCurrencyCompact, formatDate } from "@/lib/utils";
import { Calendar, CheckCircle, Clock, Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import CircleAction from "@/components/CircleAction";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import EmptyState from "@/components/EmptyState";
import {
  Section,
  InfoCard,
  ListItem,
  ActionCard,
} from "@/design/components/PageShell";

interface CulteStat {
  culteId: string;
  name: string;
  startDate: string;
  totalMembers: number;
  paid: number;
  absent: number;
  unpaid: number;
  inAdvance: number;
  totalCollected: number;
  expectedTotal: number;
}

export default function Cotisations() {
  const navigate = useNavigate();
  const { data: psEvents, isLoading: eventsLoading } = useEvents();
  const { data: psCotisations } = useCotisations();

  const events = psEvents;
  const cotisations = psCotisations;

  const culteStats = useMemo(() => {
    const culteEvents = events.filter((e: any) => e.type === "CULTE");

    const byCulteId = new Map<string, any[]>();
    for (const c of cotisations ?? []) {
      const arr = byCulteId.get(c.culteId);
      if (arr) arr.push(c);
      else byCulteId.set(c.culteId, [c]);
    }

    const stats = culteEvents.map((culte: any) => {
      const culteCotisations = byCulteId.get(culte.id) ?? [];
      let totalMembers = 0;
      let paid = 0;
      let absent = 0;
      let unpaid = 0;
      let inAdvance = 0;
      let totalCollected = 0;
      let expectedTotal = 0;
      for (const c of culteCotisations) {
        totalMembers += 1;
        if (c.statut === "PAYE") paid += 1;
        else if (c.statut === "ABSENT") absent += 1;
        else if (c.statut === "NON_PAYE") unpaid += 1;
        else if (c.statut === "EN_AVANCE") inAdvance += 1;
        totalCollected += c.montantPaye || 0;
        expectedTotal += c.montantObligatoire || 0;
      }

      return {
        culteId: culte.id,
        name: culte.name,
        startDate: culte.start_date,
        totalMembers,
        paid,
        absent,
        unpaid,
        inAdvance,
        totalCollected,
        expectedTotal,
      };
    });

    return stats;
  }, [events, cotisations]);

  const [showAll, setShowAll] = useState(false);
  const culteStatsCapped = useMemo(
    () => (showAll ? culteStats : culteStats.slice(0, 50)),
    [culteStats, showAll],
  );

  if (eventsLoading || (events.length === 0 && !isPowerSyncReadyNow())) {
    return <CotisationsSkeleton />;
  }

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Cotisations" onBack={() => navigate(-1)} />

          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-text-primary font-bold text-2xl mb-1">
                  Cotisations
                </h1>
                <p className="text-text-secondary text-sm">
                  {culteStats.length} culte{culteStats.length !== 1 ? "s" : ""}
                  suivi{culteStats.length !== 1 ? "s" : ""}
                </p>
              </div>
              <CircleAction
                aria-label="Créer un nouveau culte"
                onClick={() =>
                  navigate("/event/new", { state: { defaultType: "CULTE" } })
                }
              >
                <Plus className="w-6 h-6" />
              </CircleAction>
            </div>

            <InfoCard className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-xs uppercase tracking-wider font-semibold mb-0.5">
                    Vue d'ensemble
                  </p>
                  <p className="text-text-primary font-bold text-lg">
                    {formatCurrencyCompact(
                      culteStats.reduce((s, c) => s + c.totalCollected, 0),
                    )} F
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: "var(--in)" }} />
                  <span className="text-text-primary font-semibold">
                    {culteStats.reduce((s, c) => s + c.paid, 0)} payé
                  </span>
                </div>
              </div>
            </InfoCard>

            {culteStats.length === 0 ? (
              <EmptyState
                title="Aucun culte"
                description="Créez votre premier culte pour suivre les cotisations"
                actionLabel="Créer un culte"
                onAction={() =>
                  navigate("/event/new", { state: { defaultType: "CULTE" } })
                }
              />
            ) : (
              <Section title="Cultes">
                <div className="space-y-3">
                  {culteStatsCapped.map((stat) => {
                    const progress =
                      stat.expectedTotal > 0
                        ? (stat.totalCollected / stat.expectedTotal) * 100
                        : 0;
                    return (
                      <button
                        key={stat.culteId}
                        onClick={() => navigate(`/saisie-rapide/${stat.culteId}`)}
                        className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                        aria-label={`Culte ${stat.name}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background:
                                "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                            }}
                          >
                            <Calendar
                              className="w-5 h-5"
                              style={{ color: "var(--accent-primary)" }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-semibold text-sm truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {stat.name}
                            </p>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatDate(stat.startDate)}
                            </p>

                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span
                                className="flex items-center gap-1"
                                style={{ color: "var(--in)" }}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {stat.paid}/{stat.totalMembers}
                              </span>
                              {stat.unpaid > 0 && (
                                <span
                                  style={{
                                    color: "var(--accent-primary)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {stat.unpaid} impayés
                                </span>
                              )}
                              {stat.absent > 0 && (
                                <span style={{ color: "var(--text-tertiary)" }}>
                                  {stat.absent} absent
                                </span>
                              )}
                            </div>

                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span style={{ color: "var(--text-tertiary)" }}>
                                  Collecté
                                </span>
                                <span className="font-semibold">
                                  {formatCurrencyCompact(stat.totalCollected)} F
                                </span>
                              </div>
                              <div
                                className="h-1.5 rounded-full overflow-hidden"
                                style={{ background: "var(--surface-active)" }}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(progress, 100)}%`,
                                    background:
                                      progress >= 100 ? "var(--in)" : "var(--accent-primary)",
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs mt-1">
                                <span style={{ color: "var(--text-tertiary)" }}>
                                  Objectif
                                </span>
                                <span style={{ color: "var(--text-tertiary)" }}>
                                  {formatCurrencyCompact(stat.expectedTotal)} F
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {!showAll && culteStats.length > 50 && (
                    <ActionCard
                      tone="primary"
                      onClick={() => setShowAll(true)}
                      className="text-sm font-medium"
                      ariaLabel="Afficher tous les cultes"
                    >
                      Afficher plus ({culteStats.length - 50} restants)
                    </ActionCard>
                  )}
                </div>
              </Section>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
