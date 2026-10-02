import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions, useCategories, useAccounts, useAppConfig } from "@/lib/dataLayer";
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
import { ShimmerCard } from "@/components/Shimmer";
import { exportPDF, exportExcel, exportCSV } from "@/lib/export";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

export default function Balance() {
  const navigate = useNavigate();
  const { data: psTransactions, isLoading: psLoading } = useTransactions();
  const { data: psCategories } = useCategories();
  const { data: psAccounts } = useAccounts();
  const { config: appConfig } = useAppConfig();

  const transactions = psTransactions;
  const categories = psCategories;
  const accounts = psAccounts;

  const [period, setPeriod] = useState<"mois" | "annee">("mois");
  const [selectedCaisse, setSelectedCaisse] = useState<string>("main");
  const [showExport, setShowExport] = useState(false);

  if (psLoading) {
    return (
      <IonPage>
        <IonContent className="bg-canvas">
          <TopHeader title="Bilan" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <ShimmerCard key={i} minHeight={64} />
              ))}
            </div>
          </div>
          <BottomNav />
        </IonContent>
      </IonPage>
    );
  }

  const { start, end } = getPeriodRange(period);
  const mainTxs = transactions.filter(
    (t: any) =>
      t.source_caisse_id === selectedCaisse ||
      t.sourceCaisseId === selectedCaisse,
  );
  const approved = mainTxs.filter(
    (t: any) => t.status === "APPROVED" && t.date >= start && t.date <= end,
  );

  const totalIncome = approved
    .filter((t: any) => t.type === "INCOME")
    .reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpense = approved
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((s: number, t: any) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const byCategory = categories
    .map((cat: any) => {
      const catTxs = approved.filter(
        (t: any) => t.category_id === cat.id || t.categoryId === cat.id,
      );
      const income = catTxs
        .filter((t: any) => t.type === "INCOME")
        .reduce((s: number, t: any) => s + t.amount, 0);
      const expense = catTxs
        .filter((t: any) => t.type === "EXPENSE")
        .reduce((s: number, t: any) => s + t.amount, 0);
      return {
        categoryId: cat.id,
        label: cat.label_fr || cat.label,
        income,
        expense,
        net: income - expense,
      };
    })
    .filter((c: any) => c.income > 0 || c.expense > 0);

  const maxVal = Math.max(
    ...byCategory.map((c: any) => Math.max(c.income, c.expense)),
    1,
  );

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <TopHeader title="Bilan" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <h1 className="text-text-primary font-bold text-xl mb-5">
              Bilan financier
            </h1>

            {/* Period toggle */}
            <div
              className="flex rounded-xl p-1 mb-5"
              style={{ backgroundColor: "var(--surface)" }}
              role="group"
              aria-label="Période"
            >
              <button
                onClick={() => setPeriod("mois")}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  period === "mois"
                    ? { backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }
                    : { color: "var(--text-secondary)" }
                }
                aria-pressed={period === "mois"}
                aria-label="Mois"
              >
                Mois
              </button>
              <button
                onClick={() => setPeriod("annee")}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  period === "annee"
                    ? { backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }
                    : { color: "var(--text-secondary)" }
                }
                aria-pressed={period === "annee"}
                aria-label="Année"
              >
                Année
              </button>
            </div>

            {/* Caisse selector */}
            <div className="-mx-5 px-5 mb-5">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {accounts.map((a: any) => {
                  const color = a.color || "var(--accent-primary)";
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedCaisse(a.id)}
                      className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                      style={
                        selectedCaisse === a.id
                          ? { backgroundColor: color, color: "var(--text-primary)" }
                          : { backgroundColor: "var(--surface)", color: "var(--text-secondary)" }
                      }
                      aria-pressed={selectedCaisse === a.id}
                      aria-label={`Caisse ${a.name}`}
                    >
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary cards — M1/L6 : tuiles de données alignées à gauche
                (libellé en haut, valeur en bas) ; icône de repère en
                absolute top-right (les 3 tuiles partagent le même fond). */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div
                className="relative rounded-xl p-4"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <div
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--data-income) 12%, transparent)" }}
                  aria-hidden="true"
                >
                  <TrendingUp
                    className="w-4 h-4"
                    style={{ color: "var(--data-income)" }}
                  />
                </div>
                <p className="text-text-tertiary text-xs">Entrées</p>
                <p className="text-income font-black text-base tabular-nums mt-2">
                  +{formatCurrencyCompact(totalIncome)}
                </p>
              </div>
              <div
                className="relative rounded-xl p-4"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <div
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)" }}
                  aria-hidden="true"
                >
                  <TrendingDown
                    className="w-4 h-4"
                    style={{ color: "var(--data-expense)" }}
                  />
                </div>
                <p className="text-text-tertiary text-xs">Sorties</p>
                <p className="text-expense font-black text-base tabular-nums mt-2">
                  -{formatCurrencyCompact(totalExpense)}
                </p>
              </div>
              <div
                className="relative rounded-xl p-4"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <div
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                  aria-hidden="true"
                >
                  <BarChart3 className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                </div>
                <p className="text-text-tertiary text-xs">Résultat</p>
                <p
                  className="font-black text-base tabular-nums mt-2"
                  style={{ color: netResult >= 0 ? "var(--data-income)" : "var(--data-expense)" }}
                >
                  {netResult >= 0 ? "+" : "-"}
                  {formatCurrencyCompact(Math.abs(netResult))}
                </p>
              </div>
            </div>

            {/* By category */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <p className="text-text-tertiary text-xs font-medium mb-4">
                Par catégorie
              </p>
              <div className="space-y-3">
                {byCategory.map((cat: any) => (
                  <div key={cat.categoryId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-primary font-medium">
                        {cat.label}
                      </span>
                      <span className="text-text-tertiary">
                        {cat.net >= 0 ? "+" : "-"}
                        {formatCurrencyCompact(Math.abs(cat.net))}
                      </span>
                    </div>
                    <div
                      className="flex gap-1 h-2 rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--surface-hover)" }}
                    >
                      {cat.income > 0 && (
                        <div
                          className="rounded-full"
                          style={{
                            width: `${(cat.income / maxVal) * 50}%`,
                            backgroundColor: "var(--data-income)",
                          }}
                        />
                      )}
                      {cat.expense > 0 && (
                        <div
                          className="rounded-full ml-auto"
                          style={{
                            width: `${(cat.expense / maxVal) * 50}%`,
                            backgroundColor: "var(--data-expense)",
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowExport(true)}
              className="w-full py-3.5 rounded-full font-semibold text-on-accent text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, var(--accent-light), var(--accent-primary))",
              }}
              aria-label="Exporter le rapport financier"
            >
              <Download className="w-4 h-4" /> Exporter le rapport
            </button>

            {/* Export modal */}
            {showExport && (
              <div
                className="fixed inset-0 z-50 flex items-end justify-center"
                onClick={() => setShowExport(false)}
              >
                <div className="absolute inset-0 bg-scrim" aria-hidden="true" />
                <div
                  role="dialog"
                  aria-modal="true"
                  className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8"
                  style={{ backgroundColor: "var(--card)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-text-primary font-bold text-lg">
                      Exporter le rapport
                    </h2>
                    <button
                      onClick={() => setShowExport(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--surface-hover)" }}
                      aria-label="Fermer l'export"
                    >
                      <span className="text-text-tertiary text-sm">
                        <X className="w-4 h-4" />
                      </span>
                    </button>
                  </div>
                  {appConfig.churchName && (
                    <div
                      className="flex items-center gap-2 mb-4 p-3 rounded-xl"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      {appConfig.churchLogoUrl && (
                        <img
                          src={appConfig.churchLogoUrl}
                          alt={`Logo de ${appConfig.churchName || "église"}`}
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <span className="text-text-tertiary text-xs">
                        {appConfig.churchName}
                      </span>
                    </div>
                  )}
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        exportPDF({
                            churchName: appConfig.churchName,
                            churchLogoUrl: appConfig.churchLogoUrl,
                            transactions: approved as any,
                            caisses: [],
                            title: `Bilan financier — ${period === "mois" ? "Ce mois" : "Cette année"}`,
                        });
                        setShowExport(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)" }}
                      >
                        <FileText
                          className="text-lg"
                          style={{ color: "var(--data-expense)" }}
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-text-primary text-sm font-semibold">
                          PDF
                        </p>
                        <p className="text-text-tertiary text-xs">
                          Document professionnel avec en-tête
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        exportExcel({
                            churchName: appConfig.churchName,
                            churchLogoUrl: appConfig.churchLogoUrl,
                            transactions: approved as any,
                            caisses: [],
                            title: `Bilan financier — ${period === "mois" ? "Ce mois" : "Cette année"}`,
                        });
                        setShowExport(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "color-mix(in srgb, var(--data-income) 12%, transparent)" }}
                      >
                        <BarChart3
                          className="text-lg"
                          style={{ color: "var(--data-income)" }}
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-text-primary text-sm font-semibold">
                          Excel
                        </p>
                        <p className="text-text-tertiary text-xs">
                          Feuilles multiples (résumé, transactions, groupes)
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        exportCSV({
                            churchName: appConfig.churchName,
                            churchLogoUrl: appConfig.churchLogoUrl,
                            transactions: approved as any,
                            caisses: [],
                            title: `Bilan financier — ${period === "mois" ? "Ce mois" : "Cette année"}`,
                        });
                        setShowExport(false);
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "color-mix(in srgb, var(--data-planified) 12%, transparent)" }}
                      >
                        <ClipboardList
                          className="text-lg"
                          style={{ color: "var(--data-planified)" }}
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-text-primary text-sm font-semibold">
                          CSV
                        </p>
                        <p className="text-text-tertiary text-xs">
                          Compatible avec tous les tableurs
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <BottomNav />
      </IonContent>
    </IonPage>
  );
}
