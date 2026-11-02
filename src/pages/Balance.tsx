/**
 * Balance v2 — Bilan financier, redesign premium.
 *
 * Design : fond sombre, cartes de totaux en haut, liste des transactions
 * par catégorie, export PDF/Excel.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions, useCategories, useAccounts, useAppConfig, isPowerSyncReadyNow } from "@/lib/dataLayer";
import { formatCurrencyCompact, getPeriodRange } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  X,
  FileText,
  ClipboardList,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { exportPDF, exportExcel, exportCSV } from "@/lib/export";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import { Section, InfoCard, ListItem, StatCard } from "@/design/components/PageShell";

export default function Balance() {
  const navigate = useNavigate();
  const { data: psTransactions, isLoading: psLoading } = useTransactions();
  const { data: psCategories } = useCategories();
  const { data: psAccounts } = useAccounts();
  const { config: appConfig } = useAppConfig();

  const replicaPending = !isPowerSyncReadyNow();

  const transactions = psTransactions ?? [];
  const categories = psCategories ?? [];
  const accounts = psAccounts ?? [];

  const [period, setPeriod] = useState<"mois" | "annee">("mois");
  const [selectedCaisse, setSelectedCaisse] = useState<string>("main");
  const [showExport, setShowExport] = useState(false);

  if (psLoading || (transactions.length === 0 && replicaPending)) {
    return (
      <IonPage>
        <IonContent fullscreen className="bg-canvas">
          <div data-screen-state="loading" className="min-h-dvh flex flex-col items-center justify-center py-12 px-6">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-accent-primary animate-spin" />
            <p className="mt-4 text-text-tertiary text-sm">Chargement du bilan…</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const { start, end } = getPeriodRange(period);
  const filtered = transactions.filter(
    (t: any) =>
      t.date >= start &&
      t.date <= end &&
      (selectedCaisse === "main" || t.source_caisse_id === selectedCaisse ||
        t.sourceCaisseId === selectedCaisse),
  );

  const totalIncome = filtered
    .filter((t: any) => t.type === "INCOME" && t.status === "APPROVED")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter((t: any) => t.type === "EXPENSE" && t.status === "APPROVED")
    .reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader
            title="Bilan financier"
            subtitle={`${period.charAt(0).toUpperCase() + period.slice(1)} en cours`}
            onBack={() => navigate(-1)}
          />
          <div className="max-w-lg mx-auto px-5 pt-2 pb-safe-calc">
            {/* Totaux */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard
                value={formatCurrencyCompact(totalIncome)}
                label="Revenus"
                icon={<TrendingUp className="w-5 h-5" />}
                tone="income"
              />
              <StatCard
                value={formatCurrencyCompact(totalExpense)}
                label="Dépenses"
                icon={<TrendingDown className="w-5 h-5" />}
                tone="expense"
              />
            </div>

            <StatCard
              value={formatCurrencyCompact(netResult)}
              label="Solde net"
              icon={<BarChart3 className="w-5 h-5" />}
              tone={netResult >= 0 ? "income" : "expense"}
            />

            {/* Filtres rapides */}
            <InfoCard className="mb-6">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setPeriod("mois")}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    period === "mois"
                      ? "bg-accent-primary text-black shadow-accent"
                      : "bg-surface border border-border text-text-secondary"
                  }`}
                >
                  Ce mois
                </button>
                <button
                  onClick={() => setPeriod("annee")}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    period === "annee"
                      ? "bg-accent-primary text-black shadow-accent"
                      : "bg-surface border border-border text-text-secondary"
                  }`}
                >
                  Cette année
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  Caisse
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCaisse("main")}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      selectedCaisse === "main"
                        ? "bg-accent-primary text-black shadow-accent"
                        : "bg-surface border border-border text-text-secondary"
                    }`}
                  >
                    Principale
                  </button>
                  {accounts.map((acc: any) => (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedCaisse(acc.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        selectedCaisse === acc.id
                          ? "bg-accent-primary text-black shadow-accent"
                          : "bg-surface border border-border text-text-secondary"
                      }`}
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            </InfoCard>

            {/* Détail par catégorie */}
            <Section title="Répartition par catégorie">
              <div className="space-y-3">
                {categories.map((cat: any) => {
                  const catTxs = filtered.filter(
                    (t: any) => t.category_id === cat.id,
                  );
                  const catIncome = catTxs
                    .filter((t: any) => t.type === "INCOME")
                    .reduce((s, t) => s + t.amount, 0);
                  const catExpense = catTxs
                    .filter((t: any) => t.type === "EXPENSE")
                    .reduce((s, t) => s + t.amount, 0);
                  const catNet = catIncome - catExpense;
                  return (
                    <ListItem
                      key={cat.id}
                      title={cat.name}
                      subtitle={`${catTxs.length} transaction(s)`}
                      amount={formatCurrencyCompact(catNet)}
                      amountTone={catNet >= 0 ? "income" : "expense"}
                    />
                  );
                })}
              </div>
            </Section>

            {/* Actions d'export */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => exportPDF()}
                className="flex-1 py-3 rounded-xl font-medium text-sm transition-all"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <FileText className="w-4 h-4 mr-2" /> Export PDF
              </button>
              <button
                onClick={() => exportExcel()}
                className="flex-1 py-3 rounded-xl font-medium text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                  color: "var(--on-accent)",
                }}
              >
                <Download className="w-4 h-4 mr-2" /> Export Excel
              </button>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
