import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrgBudgets, useOrgBudgetLines, useTransactions, useCategories, useOrgUnits, addOrgBudgetPS } from "@/lib/dataLayer";
import { computeBudgetReport, budgetWindow, type BudgetPeriod } from "@/capabilities/budgets";
import { formatCurrencyCompact } from "@/lib/utils";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { Plus, Target, Wallet, PieChart, X, ChevronRight } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";

const PERIODS: Array<{ value: BudgetPeriod; label: string }> = [
  { value: "ANNUAL", label: "Annuel" },
  { value: "Q1", label: "T1 (jan–mar)" },
  { value: "Q2", label: "T2 (avr–jun)" },
  { value: "Q3", label: "T3 (jul–sep)" },
  { value: "Q4", label: "T4 (oct–déc)" },
];

export default function Budgets() {
  const navigate = useNavigate();
  const { data: budgets } = useOrgBudgets();
  const { data: lines } = useOrgBudgetLines();
  const { data: transactions } = useTransactions();
  const { data: categories } = useCategories();
  const { data: orgUnits } = useOrgUnits();

  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear());
  const [period, setPeriod] = useState<"" | BudgetPeriod>("");
  const [costCenter, setCostCenter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const reports = useMemo(() => {
    return budgets.map((b) => computeBudgetReport(b, lines, transactions, categories));
  }, [budgets, lines, transactions, categories]);

  const filtered = reports.filter((r) => {
    if (r.budget.fiscal_year !== fiscalYear) return false;
    if (period && r.budget.period !== period) return false;
    if (costCenter !== "all" && r.budget.cost_center_id !== costCenter) return false;
    return true;
  });

  const activeTotals = filtered
    .filter((r) => r.budget.status === "ACTIVE")
    .reduce(
      (acc, r) => {
        acc.planned += r.totalPlanned;
        acc.actual += r.totalActual;
        return acc;
      },
      { planned: 0, actual: 0 },
    );

  const yearOptions = Array.from(
    new Set([new Date().getFullYear(), ...budgets.map((b) => b.fiscal_year)]),
  ).sort((a, b) => b - a);

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Budgets" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-text-primary font-bold text-xl" data-testid="budgets-title">
                Budgets
              </h1>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-white active:scale-95 transition-transform"
                style={{ backgroundColor: "var(--accent-primary)" }}
                data-testid="new-budget-btn"
                aria-label="Nouveau budget"
              >
                <Plus className="w-4 h-4" /> Nouveau
              </button>
            </div>

            {/* Filtres */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide" role="group" aria-label="Filtres budget">
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="px-3 py-2 rounded-xl text-xs font-medium outline-none"
                style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                aria-label="Exercice"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>Exercice {y}</option>
                ))}
              </select>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "" | BudgetPeriod)}
                className="px-3 py-2 rounded-xl text-xs font-medium outline-none"
                style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                aria-label="Période"
              >
                <option value="">Toutes périodes</option>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-medium outline-none"
                style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                aria-label="Centre de coûts"
              >
                <option value="all">Tous centres</option>
                {orgUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Résumé */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--surface)" }}>
                <Wallet className="w-4 h-4 mb-2" style={{ color: "var(--accent-primary)" }} />
                <p className="text-text-tertiary text-xs">Prévu</p>
                <p className="text-text-primary font-bold text-sm mt-1">
                  {formatCurrencyCompact(activeTotals.planned)}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--surface)" }}>
                <PieChart className="w-4 h-4 mb-2" style={{ color: "#1DB954" }} />
                <p className="text-text-tertiary text-xs">Réel</p>
                <p className="text-income font-bold text-sm mt-1">
                  {formatCurrencyCompact(activeTotals.actual)}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--surface)" }}>
                <Target className="w-4 h-4 mb-2" style={{ color: "#FFB800" }} />
                <p className="text-text-tertiary text-xs">Restant</p>
                <p
                  className="font-bold text-sm mt-1"
                  style={{ color: activeTotals.planned - activeTotals.actual >= 0 ? "#1DB954" : "#E51332" }}
                >
                  {formatCurrencyCompact(Math.max(0, activeTotals.planned - activeTotals.actual))}
                </p>
              </div>
            </div>

            {/* Liste des budgets */}
            {filtered.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--card)" }} data-testid="budgets-empty">
                <Target className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: "var(--accent-primary)" }} />
                <p className="text-text-secondary text-sm font-medium">Aucun budget</p>
                <p className="text-text-tertiary text-xs mt-1">
                  Créez votre premier budget pour cet exercice et centre de coûts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => {
                  const { budget } = r;
                  const over = r.totalActual > r.totalPlanned;
                  const bar = r.pctUsed ?? 0;
                  const win = budgetWindow(budget);
                  const cc = budget.cost_center_label ||
                    (budget.cost_center_id
                      ? orgUnits.find((u) => u.id === budget.cost_center_id)?.name ?? "Centre"
                      : "Tous");
                  return (
                    <button
                      key={budget.id}
                      onClick={() => navigate(`/budgets/${budget.id}`)}
                      className="w-full text-left rounded-xl p-4 active:scale-[0.99] transition-transform"
                      style={{ backgroundColor: "var(--card)" }}
                      data-testid={`budget-card-${budget.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-text-primary font-semibold text-sm">{budget.name}</p>
                          <p className="text-text-tertiary text-xs mt-0.5">
                            {PERIODS.find((p) => p.value === budget.period)?.label ?? budget.period} · {cc}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: budget.status === "CLOSED" ? "var(--surface-active)" : "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                              color: budget.status === "CLOSED" ? "var(--text-tertiary)" : "var(--accent-primary)",
                            }}
                          >
                            {budget.status === "CLOSED" ? "Clôturé" : "Actif"}
                          </span>
                          <ChevronRight className="w-4 h-4 text-text-tertiary" />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-tertiary">Prévu {formatCurrencyCompact(r.totalPlanned)}</span>
                        <span className={over ? "text-expense font-medium" : "text-income font-medium"}>
                          Réel {formatCurrencyCompact(r.totalActual)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-hover)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, bar)}%`, backgroundColor: over ? "#E51332" : "var(--accent-primary)" }}
                        />
                      </div>
                      <p className="text-text-tertiary text-[11px] mt-1.5">{win.start} → {win.end}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Feuille de création */}
          {showCreate && (
            <CreateBudgetSheet
              year={fiscalYear}
              orgUnits={orgUnits}
              onClose={() => setShowCreate(false)}
              onCreated={() => {
                setShowCreate(false);
              }}
            />
          )}
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

function CreateBudgetSheet({
  year,
  orgUnits,
  onClose,
  onCreated,
}: {
  year: number;
  orgUnits: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [fiscalYear, setFYear] = useState(year);
  const [period, setPPeriod] = useState<BudgetPeriod>("ANNUAL");
  const [cc, setCc] = useState("");
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const totalCents = Math.round((Number(total.replace(/[^\d]/g, "")) || 0) * 100);
      await addOrgBudgetPS({
        fiscal_year: fiscalYear,
        period,
        cost_center_id: cc || null,
        cost_center_label: cc ? orgUnits.find((u) => u.id === cc)?.name ?? null : null,
        name: name.trim(),
        total_budgeted_cents: totalCents,
        status: "ACTIVE",
        currency: "XOF",
        note: null,
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: "var(--surface)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg rounded-t-2xl p-5 pb-28"
        style={{ backgroundColor: "var(--card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-text-primary font-bold text-lg">Nouveau budget</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--surface-hover)" }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Nom</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Budget fonctionnement 2026"
              className="w-full px-3 py-3 rounded-lg text-sm outline-none"
              style={inputStyle}
              data-testid="budget-name"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Exercice</span>
              <input
                type="number"
                value={fiscalYear}
                onChange={(e) => setFYear(Number(e.target.value))}
                className="w-full px-3 py-3 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </label>
            <label className="block">
              <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Période</span>
              <select
                value={period}
                onChange={(e) => setPPeriod(e.target.value as BudgetPeriod)}
                className="w-full px-3 py-3 rounded-lg text-sm outline-none"
                style={inputStyle}
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Centre de coûts</span>
            <select
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="w-full px-3 py-3 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              <option value="">Tous (aucun)</option>
              {orgUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-text-tertiary text-xs uppercase tracking-wide block mb-1">Montant prévu (FCFA)</span>
            <input
              type="number"
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="Ex : 5000000"
              className="w-full px-3 py-3 rounded-lg text-sm outline-none"
              style={inputStyle}
              data-testid="budget-total"
            />
          </label>

          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="w-full py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            {saving ? "Création…" : "Créer le budget"}
          </button>
        </div>
      </div>
    </div>
  );
}
