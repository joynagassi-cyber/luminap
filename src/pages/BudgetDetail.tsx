import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useOrgBudgets, useOrgBudgetLines, useTransactions, useCategories, useOrgUnits, addOrgBudgetLinePS, deleteOrgBudgetLinePS, updateOrgBudgetPS } from "@/lib/dataLayer";
import { computeBudgetReport, budgetWindow } from "@/capabilities/budgets";
import { formatCurrencyCompact, formatCurrencyFull } from "@/lib/utils";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { Plus, Trash2, Lock, FileText, X } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";

export default function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: budgets } = useOrgBudgets();
  const { data: lines } = useOrgBudgetLines(id);
  const { data: transactions } = useTransactions();
  const { data: categories } = useCategories();
  const { data: orgUnits } = useOrgUnits();

  const budget = budgets.find((b) => b.id === id);
  const report = useMemo(
    () => (budget ? computeBudgetReport(budget, lines, transactions, categories) : null),
    [budget, lines, transactions, categories],
  );

  const [cat, setCat] = useState("");
  const [amount, setAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(true);

  if (!budget || !report) {
    return (
      <IonPage>
        <IonContent className="bg-canvas">
          <div className="min-h-screen bg-canvas">
            <TopHeader title="Budget" />
            <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
              <p className="text-text-tertiary text-sm">Budget introuvable.</p>
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const win = budgetWindow(budget);
  const cc = budget.cost_center_label ||
    (budget.cost_center_id
      ? orgUnits.find((u) => u.id === budget.cost_center_id)?.name ?? "Centre"
      : "Tous");
  const over = report.totalActual > report.totalPlanned;

  const addLine = async () => {
    if (!amount || adding) return;
    setAdding(true);
    try {
      await addOrgBudgetLinePS({
        budget_id: budget.id,
        category_id: cat || null,
        planned_amount_cents: Math.round((Number(amount.replace(/[^\d]/g, "")) || 0) * 100),
        note: null,
      });
      setAmount("");
    } finally {
      setAdding(false);
    }
  };

  const closeBudget = async () => {
    await updateOrgBudgetPS(budget.id, { status: "CLOSED" });
  };

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Budget" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* En-tête */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "var(--card)" }} data-testid="budget-detail-header">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-text-primary font-bold text-lg">{budget.name}</h1>
                  <p className="text-text-tertiary text-xs mt-1">
                    {cc} · {win.start} → {win.end}
                  </p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: budget.status === "CLOSED" ? "var(--surface-active)" : "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                    color: budget.status === "CLOSED" ? "var(--text-tertiary)" : "var(--accent-primary)",
                  }}
                >
                  {budget.status === "CLOSED" ? "Clôturé" : "Actif"}
                </span>
              </div>
              {budget.note && <p className="text-text-tertiary text-xs mt-2">{budget.note}</p>}
            </div>

            {/* Résumé prévu / réel / écart */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <p className="text-text-tertiary text-[11px]">Prévu</p>
                <p className="text-text-primary font-bold text-sm mt-1">{formatCurrencyCompact(report.totalPlanned)}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <p className="text-text-tertiary text-[11px]">Réel</p>
                <p className="text-income font-bold text-sm mt-1">{formatCurrencyCompact(report.totalActual)}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <p className="text-text-tertiary text-[11px]">Écart</p>
                <p className="font-bold text-sm mt-1" style={{ color: over ? "#E51332" : "#1DB954" }}>
                  {report.totalVariance >= 0 ? "+" : "-"}{formatCurrencyCompact(Math.abs(report.totalVariance))}
                </p>
              </div>
            </div>

            {/* Rapport conseil (par ligne) */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "var(--card)" }} data-testid="council-report">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                <p className="text-text-primary font-semibold text-sm">Rapport conseil · prévu / réel</p>
              </div>
              {report.lines.length === 0 ? (
                <p className="text-text-tertiary text-xs">
                  Ajoutez des lignes (catégorie + montant prévu) pour suivre l'écart par ligne.
                </p>
              ) : (
                <div className="space-y-3">
                  {report.lines.map((l) => {
                    const lineObj = lines.find((x) => x.id === l.lineId);
                    const lOver = l.actual > l.planned;
                    const bar = l.pctUsed ?? 0;
                    return (
                      <div key={l.lineId}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-primary font-medium flex-1 pr-2">{l.categoryLabel}</span>
                          <button
                            onClick={() => lineObj && deleteOrgBudgetLinePS(lineObj.id)}
                            className="text-text-tertiary active:scale-90 transition-transform"
                            aria-label="Supprimer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden mb-1" style={{ backgroundColor: "var(--surface-hover)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, bar)}%`, backgroundColor: lOver ? "#E51332" : "var(--accent-primary)" }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-text-tertiary">Prévu {formatCurrencyFull(l.planned)}</span>
                          <span className="text-text-secondary">
                            Réel {formatCurrencyFull(l.actual)} ·{" "}
                            <span style={{ color: lOver ? "#E51332" : "#1DB954" }}>
                              {l.variance >= 0 ? "+" : "-"}{formatCurrencyFull(Math.abs(l.variance))}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ajouter une ligne */}
            {budget.status !== "CLOSED" && (
              <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "var(--card)" }}>
                {showAdd ? (
                  <div className="space-y-3">
                    <p className="text-text-primary font-semibold text-sm">Nouvelle ligne</p>
                    <select
                      value={cat}
                      onChange={(e) => setCat(e.target.value)}
                      className="w-full px-3 py-3 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                      aria-label="Catégorie"
                      data-testid="line-category"
                    >
                      <option value="">Toutes (non catégorisé)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.label_fr || c.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Montant prévu (FCFA)"
                      className="w-full px-3 py-3 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                      data-testid="line-amount"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addLine}
                        disabled={adding || !amount}
                        className="flex-1 py-3 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-40"
                        style={{ backgroundColor: "var(--accent-primary)" }}
                      >
                        <Plus className="w-4 h-4" /> Ajouter
                      </button>
                      <button
                        onClick={() => setShowAdd(false)}
                        className="px-4 py-3 rounded-full text-xs font-medium text-text-tertiary"
                        style={{ backgroundColor: "var(--surface-hover)" }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-text-secondary"
                  >
                    <Plus className="w-4 h-4" /> Ajouter une ligne
                  </button>
                )}
              </div>
            )}

            {budget.status !== "CLOSED" && (
              <button
                onClick={closeBudget}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm active:scale-95 transition-transform"
                style={{ backgroundColor: "var(--surface)", color: "#E51332" }}
              >
                <Lock className="w-4 h-4" /> Clôturer le budget
              </button>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
