/**
 * CulteDetail v2 — Détail d'un culte, redesign premium.
 *
 * Design : fond sombre, cartes de stats, liste des cotisations avec
 * statuts colorés, actions rapides.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

import { useState } from "react";
import { ListSkeleton } from "@/components/Skeleton";
import { useNavigate, useParams } from "react-router-dom";
import { useEvents, useCotisations, useMembers, updateCotisationPS, isPowerSyncReadyNow } from "@/lib/dataLayer";
import { formatCurrencyCompact, formatDate } from "@/lib/utils";
import { calculerStatsCulte } from "@/lib/cotisation-logic";
import {
  COTISATION_STATUT_COLORS,
  COTISATION_STATUT_LABELS,
} from "@/lib/cotisation-logic";
import type { CotisationStatut } from "@/lib/cotisation-logic";
import { ArrowLeft, Users, CheckCircle, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ConfirmModal from "@/components/ConfirmModal";
import {
  IonPage,
  IonContent,
  IonButtons,
  IonBackButton,
} from "@ionic/react";
import { Section, InfoCard, ListItem, StatCard } from "@/design/components/PageShell";

export default function CulteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: psEvents } = useEvents();
  const { data: psCotisations } = useCotisations();
  const { data: psMembers } = useMembers();

  const events = psEvents ?? [];
  const cotisations = psCotisations ?? [];
  const members = psMembers ?? [];

  const culte = events.find((e: any) => e.id === id);

  const [showMassPay, setShowMassPay] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  if (!culte && !isPowerSyncReadyNow()) {
    return (
      <IonPage>
        <IonContent fullscreen className="bg-canvas">
          <div data-screen-state="loading" className="min-h-dvh flex flex-col items-center justify-center py-12 px-6">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-accent-primary animate-spin" />
            <p className="mt-4 text-text-tertiary text-sm">Chargement…</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!culte) {
    return (
      <IonPage>
        <IonContent fullscreen className="bg-canvas">
          <div data-screen-state="ready" className="min-h-dvh flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--surface)" }}>
              <Users className="w-6 h-6 text-text-tertiary" />
            </div>
            <h2 className="text-text-primary font-bold text-xl mb-2">Culte introuvable</h2>
            <p className="text-text-tertiary text-sm">Ce culte n'existe pas ou a été supprimé.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const stats = calculerStatsCulte(culte, cotisations);

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <div className="flex items-center justify-between px-6 py-5">
            <button
              onClick={() => navigate(-1)}
              className="text-text-primary font-semibold text-sm"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </button>
          </div>
          <div className="max-w-lg mx-auto px-5 pt-2 pb-safe-calc">
            {/* En-tête culte */}
            <InfoCard className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-text-primary font-bold text-2xl leading-tight mb-1">
                    {culte.name || "Culte sans nom"}
                  </h1>
                  <p className="text-text-tertiary text-sm">
                    {formatDate(culte.start_date || culte.startDate)} • {culte.type || "Culte"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                  backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                }}>
                  <CalendarIcon className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                </div>
              </div>
            </InfoCard>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard
                value={stats.totalCollecte.toString()}
                label="Total collecté"
                icon={<TrendingUp className="w-5 h-5" />}
                tone="income"
              />
              <StatCard
                value={stats.membresPresents.toString()}
                label="Membres présents"
                icon={<Users className="w-5 h-5" />}
                tone="primary"
              />
              <StatCard
                value={stats.tauxPresence.toString()}
                label="Taux de présence"
                icon={<Clock className="w-5 h-5" />}
                tone="advance"
              />
            </div>

            {/* Liste des cotisations */}
            <Section title="Cotisations">
              <div className="space-y-3">
                {cotisations.filter((c: any) => c.culteId === culte.id).map((c: any) => {
                  const statutColor = COTISATION_STATUT_COLORS[c.statut as CotisationStatut] || "var(--text-secondary)";
                  const statutLabel = COTISATION_STATUT_LABELS[c.statut as CotisationStatut] || c.statut;
                  return (
                    <ListItem
                      key={c.id}
                      title={c.member_name || "Membre"}
                      subtitle={statutLabel}
                      amount={formatCurrencyCompact(c.amount ?? 0)}
                      amountTone="income"
                    />
                  );
                })}
              </div>
            </Section>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

function CalendarIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TrendingUp({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
