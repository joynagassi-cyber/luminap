/**
 * Finance v2 — Grand livre des transactions, redesign premium.
 *
 * Design : fond sombre, cartes de statistiques en haut, recherche/filtres
 * intégrés, liste de transactions avec cartes propres, actions Entrée/Sortie
 * en bas. Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : resource capability, filtres, pagination,
 * gestion d'erreur, infinite scroll.
 */

import { Fragment, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCategories, useAccounts, useCaisses } from "@/lib/dataLayer";
import { resource } from "@/capabilities/resource";
import type { Transaction } from "@/types";
import { formatCentsToFCFA } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  X,
  ChevronRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import EmptyState from "@/components/EmptyState";
import { LoadErrorBlock } from "@/components/RouteStates";
import { captureClientError } from "@/lib/clientErrors";
import CircleAction from "@/components/CircleAction";
import CapabilityBanner from "@/components/CapabilityBanner";
import { getOrganizationId } from "@/lib/orgContext";
import { FinanceSkeleton } from "@/components/PageSkeletons";
import {
  IonPage,
  IonContent,
  IonInput,
} from "@ionic/react";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";
import { Section, StatCard, InfoCard, ActionCard, ListItem } from "@/design/components/PageShell";

export const FINANCE_PAGE_SIZE = 50;

export default function Finance() {
  const navigate = useNavigate();
  const openTransaction = useCallback((id: string) => navigate(`/transaction/${id}`), [navigate]);
  const location = useLocation();
  const preselectedCaisse = location.state?.caisseId;

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const { data: caisses } = useCaisses();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(FINANCE_PAGE_SIZE);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    resource
      .list<Transaction>("Transaction", {
        filter: [],
        sortBy: "date",
        sortOrder: "desc",
      })
      .then(({ items }) => {
        setTransactions(items as any);
        setLoading(false);
      })
      .catch((e) => {
        captureClientError(e, { message: "Échec du chargement des transactions" });
        setLoadError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCaisse, setSelectedCaisse] = useState<string>(preselectedCaisse || "ALL");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx: any) => {
        if (searchTerm && !tx.description?.toLowerCase().includes(searchTerm.toLowerCase()))
          return false;
        if (selectedType !== "ALL" && tx.type !== selectedType) return false;
        if (selectedStatus !== "ALL" && tx.status !== selectedStatus) return false;
        if (selectedCaisse !== "ALL" && tx.sourceCaisseId !== selectedCaisse) return false;
        if (dateRange.from && tx.date < dateRange.from) return false;
        if (dateRange.to && tx.date > dateRange.to) return false;
        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [transactions, searchTerm, selectedType, selectedStatus, selectedCaisse, dateRange]);

  useEffect(() => {
    setVisibleCount(FINANCE_PAGE_SIZE);
  }, [searchTerm, selectedType, selectedStatus, selectedCaisse, dateRange]);

  const visibleTransactions = filteredTransactions.slice(0, visibleCount);

  const totalIncome = filteredTransactions
    .filter((t: any) => t.type === "INCOME" && t.status === "APPROVED")
    .reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpense = filteredTransactions
    .filter((t: any) => t.type === "EXPENSE" && t.status === "APPROVED")
    .reduce((s: number, t: any) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const handleAddTransaction = (type: "INCOME" | "EXPENSE") => {
    navigate(`/transaction/new?type=${type}`);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          {loading ? (
            <div data-screen-state="loading" className="px-5">
              <FinanceSkeleton />
            </div>
          ) : loadError ? (
            <div data-screen-state="error" className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
              <TopHeader title="Finance" />
              <LoadErrorBlock onRetry={loadTransactions} />
            </div>
          ) : (
            <Fragment>
              <h1 className="sr-only">Finance — Grand livre</h1>
              <TopHeader title="Finance" />
              <div data-screen-state="ready" className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
                <CapabilityBanner orgId={getOrganizationId()} />

                {/* En-tête avec solde net */}
                <InfoCard className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">
                        Solde net du mois
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span
                          className="text-3xl font-black tabular-nums leading-none"
                          style={{
                            color: netResult >= 0 ? "var(--in)" : "var(--out)",
                          }}
                        >
                          {netResult >= 0 ? "" : "−"}
                          {formatCentsToFCFA(Math.abs(netResult))}
                        </span>
                        <span className="text-text-tertiary text-sm">F</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                      backgroundColor: netResult >= 0 ? "color-mix(in srgb, var(--in) 15%, transparent)" : "color-mix(in srgb, var(--out) 15%, transparent)",
                    }}>
                      {netResult >= 0 ? (
                        <ArrowUpRight className="w-5 h-5" style={{ color: "var(--in)" }} />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" style={{ color: "var(--out)" }} />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wide mb-1">
                        Revenus
                      </p>
                      <p className="text-text-primary font-semibold tabular-nums" style={{ color: "var(--in)" }}>
                        +{formatCentsToFCFA(totalIncome)}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wide mb-1">
                        Dépenses
                      </p>
                      <p className="text-text-primary font-semibold tabular-nums" style={{ color: "var(--out)" }}>
                        −{formatCentsToFCFA(totalExpense)}
                      </p>
                    </div>
                  </div>
                </InfoCard>

                {/* Statistiques rapides */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <StatCard
                    value={formatCentsToFCFA(totalIncome)}
                    label="Revenus approuvés"
                    icon={<ArrowUpRight className="w-5 h-5" />}
                    tone="income"
                  />
                  <StatCard
                    value={formatCentsToFCFA(totalExpense)}
                    label="Dépenses approuvées"
                    icon={<ArrowDownRight className="w-5 h-5" />}
                    tone="expense"
                  />
                </div>

                {/* Recherche et filtres */}
                <InfoCard className="mb-6">
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <IonInput
                        type="text"
                        aria-label="Rechercher une transaction"
                        placeholder="Rechercher une transaction…"
                        value={searchTerm}
                        onIonInput={(e: IonChangeCustomEvent<string>) => setSearchTerm(e.detail.value ?? "")}
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-text-primary text-sm bg-transparent"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setFilterOpen(!filterOpen)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-surface-hover"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                        }}
                        aria-label="Filtres"
                        aria-expanded={filterOpen}
                      >
                        <Filter className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                        <span>Filtres</span>
                      </button>
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedType("ALL");
                          setSelectedStatus("ALL");
                          setSelectedCaisse("ALL");
                          setDateRange({ from: "", to: "" });
                        }}
                        className="text-xs font-medium"
                        style={{ color: "var(--accent-primary)" }}
                        disabled={!filterOpen && searchTerm === "" && selectedType === "ALL" && selectedStatus === "ALL" && selectedCaisse === "ALL" && dateRange.from === "" && dateRange.to === ""}
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                </InfoCard>

                {/* Panel des filtres */}
                {filterOpen && (
                  <InfoCard className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-text-primary text-sm font-medium">Filtres</p>
                      <button
                        onClick={() => setFilterOpen(false)}
                        style={{ color: "var(--text-secondary)" }}
                        aria-label="Fermer les filtres"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wide mb-2">Type</p>
                        <div className="flex gap-2">
                          {["ALL", "INCOME", "EXPENSE"].map((f) => (
                            <button
                              key={f}
                              onClick={() => setSelectedType(f)}
                              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                              style={{
                                backgroundColor: selectedType === f ? "var(--accent-primary)" : "var(--surface)",
                                color: selectedType === f ? "var(--on-accent)" : "var(--text-secondary)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              {f === "ALL" ? "Tout" : f === "INCOME" ? "Revenu" : "Dépense"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wide mb-2">Statut</p>
                        <div className="flex gap-2">
                          {["ALL", "APPROVED", "PENDING", "DRAFT"].map((f) => (
                            <button
                              key={f}
                              onClick={() => setSelectedStatus(f)}
                              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                              style={{
                                backgroundColor: selectedStatus === f ? "var(--data-planified)" : "var(--surface)",
                                color: selectedStatus === f ? "var(--text-primary)" : "var(--text-secondary)",
                                border: "1px solid var(--border)",
                              }}
                            >
                              {f === "ALL" ? "Tout" : f}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wide mb-2">Caisse</p>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setSelectedCaisse("ALL")}
                          className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                          style={{
                            backgroundColor: selectedCaisse === "ALL" ? "var(--accent-primary)" : "var(--surface)",
                            color: selectedCaisse === "ALL" ? "var(--on-accent)" : "var(--text-secondary)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          Toutes
                        </button>
                        {(accounts ?? []).map((acc: any) => (
                          <button
                            key={acc.id}
                            onClick={() => setSelectedCaisse(acc.id)}
                            className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                            style={{
                              backgroundColor: selectedCaisse === acc.id ? "var(--accent-primary)" : "var(--surface)",
                              color: selectedCaisse === acc.id ? "var(--on-accent)" : "var(--text-secondary)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            {acc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </InfoCard>
                )}

                {/* Liste des transactions */}
                {filteredTransactions.length === 0 ? (
                  <EmptyState
                    title="Aucune transaction"
                    description="Commencez par enregistrer votre première opération financière."
                    icon={<Wallet className="w-6 h-6" />}
                    action={() => handleAddTransaction("INCOME")}
                    actionLabel="Nouvelle entrée"
                  />
                ) : (
                  <div className="space-y-3 mb-8">
                    {visibleTransactions.map((tx) => (
                      <ListItem
                        key={tx.id}
                        icon={tx.type === "INCOME" ? (
                          <ArrowUpRight className="w-4 h-4" style={{ color: "var(--in)" }} />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" style={{ color: "var(--out)" }} />
                        )}
                        title={tx.description || tx.label || "Transaction"}
                        subtitle={tx.date}
                        amount={tx.type === "INCOME" ? `+${formatCentsToFCFA(tx.amount)}` : `−${formatCentsToFCFA(tx.amount)}`}
                        amountTone={tx.type === "INCOME" ? "income" : "expense"}
                        onClick={() => openTransaction(tx.id)}
                      />
                    ))}
                    {visibleTransactions.length < filteredTransactions.length && (
                      <button
                        onClick={() => setVisibleCount((c) => c + FINANCE_PAGE_SIZE)}
                        className="w-full py-3 rounded-xl text-sm font-medium text-center transition-all hover:bg-surface-hover"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        Charger plus <ChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Fragment>
          )}
        </div>

        {/* Actions rapides flottantes en bas */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-canvas/95 backdrop-blur-md pt-4 pb-safe-calc">
          <div className="max-w-lg mx-auto px-5">
            <div className="grid grid-cols-2 gap-3">
              <ActionCard
                tone="income"
                onClick={() => handleAddTransaction("INCOME")}
                aria-label="Nouvelle entrée"
              >
                <ArrowUpRight className="w-5 h-5" />
                <span>Entrée</span>
              </ActionCard>
              <ActionCard
                tone="expense"
                onClick={() => handleAddTransaction("EXPENSE")}
                aria-label="Nouvelle sortie"
              >
                <ArrowDownRight className="w-5 h-5" />
                <span>Sortie</span>
              </ActionCard>
            </div>
          </div>
        </div>

        <BottomNav />
      </IonContent>
    </IonPage>
  );
}
