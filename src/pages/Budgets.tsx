import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrgBudgets, useOrgBudgetLines, useTransactions, useCategories, useOrgUnits, addOrgBudgetPS } from "@/lib/dataLayer";
import { computeBudgetReport, budgetWindow, type BudgetPeriod } from "@/capabilities/budgets";
import { formatCurrencyCompact } from "@/lib/utils";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { Plus, Target, Wallet, PieChart, X, ChevronRight } from "lucide-react";
import { IonPage, IonContent, IonSelect, IonSelectOption, IonChangeCustomEvent, IonItem, IonLabel, IonInput } from "@ionic/react";
import EmptyState from "@/components/EmptyState";

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
        <div className="min-h-dvh">
          <TopHeader title="Budgets" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-text-primary font-bold text-xl" data-testid="budgets-title">
                Budgets
              </h1>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-on-accent active:scale-95 transition-transform"
                style={{ backgroundColor: "var(--accent-primary)" }}
                data-testid="new-budget-btn"
                aria-label="Nouveau budget"
              >
                <Plus className="w-4 h-4" /> Nouveau
              </button>
            </div>

            {/* Filtres */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide" role="group" aria-label="Filtres budget">
              <IonSelect
                value={fiscalYear}
                onIonChange={(e: IonChangeCustomEvent<string>) => setFiscalYear(Number(e.detail.value))}
                interface="popover"
                aria-label="Exercice"
              >
                {yearOptions.map((y) => (
                  <IonSelectOption value={y}>Exercice {y}</IonSelectOption>
                ))}
              </IonSelect>
              <IonSelect
                value={period}
                onIonChange={(e: IonChangeCustomEvent<string>) => setPeriod(e.detail.value as "" | BudgetPeriod)}
                interface="popover"
                aria-label="Période"
              >
                <IonSelectOption value="">Toutes périodes</IonSelectOption>
                {PERIODS.map((p) => (
                  <IonSelectOption value={p.value}>{p.label}</IonSelectOption>
                ))}
              </IonSelect>
              <IonSelect
                value={costCenter}
                onIonChange={(e: IonChangeCustomEvent<string>) => setCostCenter(e.detail.value)}
                interface="popover"
                aria-label="Centre de coûts"
              >
                <IonSelectOption value="all">Tous centres</IonSelectOption>
                {orgUnits.map((u) => (
                  <IonSelectOption value={u.id}>{u.name}</IonSelectOption>
                ))}
              </IonSelect>
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
                <PieChart className="w-4 h-4 mb-2" style={{ color: "var(--data-income)" }} />
                <p className="text-text-tertiary text-xs">Réel</p>
                <p className="text-income font-bold text-sm mt-1">
                  {formatCurrencyCompact(activeTotals.actual)}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: "var(--surface)" }}>
                <Target className="w-4 h-4 mb-2" style={{ color: "var(--data-pending)" }} />
                <p className="text-text-tertiary text-xs">Restant</p>
                <p
                  className="font-bold text-sm mt-1"
                  style={{ color: activeTotals.planned - activeTotals.actual >= 0 ? "var(--data-income)" : "var(--data-expense)" }}
                >
                  {formatCurrencyCompact(Math.max(0, activeTotals.planned - activeTotals.actual))}
                </p>
              </div>
            </div>

            {/* Liste des budgets */}
            {filtered.length === 0 ? (
              <EmptyState
                title="Aucun budget"
                description="Créez votre premier budget pour cet exercice et centre de coûts."
                actionLabel="Nouveau budget"
                onAction={() => setShowCreate(true)}
                data-testid="budgets-empty"
              />
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
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
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
                          style={{ width: `${Math.min(100, bar)}%`, backgroundColor: over ? "var(--data-expense)" : "var(--accent-primary)" }}
                        />
                      </div>
                      <p className="text-text-tertiary text-xs mt-1.5">{win.start} → {win.end}</p>
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

  return (
    <div className="fixed inset-0 z-overlay flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-scrim" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-t-2xl p-5 pb-safe"
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
          <IonItem lines="none" className="bg-card rounded-xl">
            <IonLabel position="floating" className="text-sm text-text-secondary">Nom</IonLabel>
            <IonInput
              type="text"
              value={name}
              onIonChange={(e: IonChangeCustomEvent<string>) => setName(e.detail.value ?? "")}
              placeholder="Ex : Budget fonctionnement 2026"
              slot="input"
              data-testid="budget-name"
            />
          </IonItem>

          <div className="grid grid-cols-2 gap-3">
            <IonItem lines="none" className="bg-card rounded-xl">
              <IonLabel position="floating" className="text-sm text-text-secondary">Exercice</IonLabel>
              <IonInput
                type="number"
                inputMode="numeric"
                value={String(fiscalYear)}
                onIonChange={(e: IonChangeCustomEvent<string>) => setFYear(Number(e.detail.value ?? ""))}
                slot="input"
              />
            </IonItem>
            <IonItem lines="none" className="bg-card rounded-xl">
              <IonLabel position="floating" className="text-sm text-text-secondary">Période</IonLabel>
              <IonSelect
                value={period}
                onIonChange={(e: IonChangeCustomEvent<string>) => setPPeriod(e.detail.value as BudgetPeriod)}
                interface="popover"
                slot="input"
              >
                {PERIODS.map((p) => (
                  <IonSelectOption value={p.value}>{p.label}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </div>

          <IonItem lines="none" className="bg-card rounded-xl">
            <IonLabel position="floating" className="text-sm text-text-secondary">Centre de coûts</IonLabel>
            <IonSelect
              value={cc}
              onIonChange={(e: IonChangeCustomEvent<string>) => setCc(e.detail.value)}
              interface="popover"
              slot="input"
            >
              <IonSelectOption value="">Tous (aucun)</IonSelectOption>
              {orgUnits.map((u) => (
                <IonSelectOption value={u.id}>{u.name}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>

          <IonItem lines="none" className="bg-card rounded-xl">
            <IonLabel position="floating" className="text-sm text-text-secondary">Montant prévu (FCFA)</IonLabel>
            <IonInput
              type="number"
              inputMode="numeric"
              value={total}
              onIonChange={(e: IonChangeCustomEvent<string>) => setTotal(e.detail.value ?? "")}
              placeholder="Ex : 5000000"
              slot="input"
              data-testid="budget-total"
            />
          </IonItem>

          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="w-full py-3.5 rounded-full font-semibold text-on-accent text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            {saving ? "Création…" : "Créer le budget"}
          </button>
        </div>
      </div>
    </div>
  );
}
