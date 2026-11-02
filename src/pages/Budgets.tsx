/**
 * Budgets v2 — Budgets organisationnels, redesign premium.
 *
 * Design : fond sombre, cartes de budget avec barres de progression,
 * listes de lignes budgétaires.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrgBudgets, useOrgBudgetLines } from "@/lib/dataLayer";
import { ListSkeleton } from "@/components/Skeleton";
import { Plus, BarChart3, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import {
  IonPage,
  IonContent,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";
import { Section, InfoCard, ActionCard, ListItem, StatCard } from "@/design/components/PageShell";

export default function Budgets() {
  const navigate = useNavigate();
  const { data: budgets, isLoading: budgetsLoading } = useOrgBudgets();
  const { data: lines, isLoading: linesLoading } = useOrgBudgetLines();

  const [selectedPeriod, setSelectedPeriod] = useState("annuel");

  const handleAddBudget = () => {
    navigate("/budget/new", { replace: true });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          {budgetsLoading || linesLoading ? (
            <div data-screen-state="loading" className="min-h-dvh flex flex-col items-center justify-center py-12 px-6">
              <ListSkeleton count={3} />
            </div>
          ) : (
            <div data-screen-state="ready" className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
              <TopHeader title="Budgets" subtitle="Suivi des budgets par centre de coûts" />
              <CapabilityBannerPlaceholder />

              {/* En-tête avec action */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-text-primary font-bold text-2xl leading-tight">Budgets</h2>
                  <p className="text-text-tertiary text-sm">
                    Suivez l'exécution de vos budgets par centre de coûts.
                  </p>
                </div>
                <ActionCard
                  tone="primary"
                  onClick={handleAddBudget}
                  aria-label="Créer un budget"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nouveau budget</span>
                </ActionCard>
              </div>

              {/* Sélecteur de période */}
              <InfoCard className="mb-6">
                <div className="flex gap-2">
                  {["annuel", "trimestriel", "mensuel"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                        selectedPeriod === p
                          ? "bg-accent-primary text-black shadow-accent"
                          : "bg-surface border border-border text-text-secondary"
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </InfoCard>

              {/* Liste des budgets */}
              {(budgets ?? []).length === 0 ? (
                <div className="text-center py-12 px-6">
                  <BarChart3 className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                  <h3 className="text-text-primary font-bold text-xl mb-2">Aucun budget</h3>
                  <p className="text-text-tertiary text-sm mb-6">
                    Créez votre premier budget pour suivre vos dépenses et revenus.
                  </p>
                  <button
                    onClick={handleAddBudget}
                    className="py-3 px-6 rounded-xl font-semibold text-sm text-on-accent"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    Créer un budget
                  </button>
                </div>
              ) : (
                <Section title="Budgets actifs">
                  <div className="space-y-3">
                    {(budgets ?? []).map((budget: any) => {
                      const spent = budget.spent ?? 0;
                      const total = budget.total_budgeted_cents ?? 0;
                      const pct = total > 0 ? (spent / total) * 100 : 0;
                      const remaining = total - spent;
                      return (
                        <ListItem
                          key={budget.id}
                          title={budget.name || "Budget sans nom"}
                          subtitle={`${Math.round(pct)}% utilisé — ${formatCurrencyCompact(remaining)} restant`}
                          amount={formatCurrencyCompact(spent)}
                          amountTone={pct > 90 ? "expense" : "income"}
                          onClick={() => navigate(`/budget/${budget.id}`)}
                        />
                      );
                    })}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function CapabilityBannerPlaceholder() {
  return null;
}

function formatCurrencyCompact(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(amount);
}
