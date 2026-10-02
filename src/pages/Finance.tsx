import { Fragment, useCallback, useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCategories, useAccounts, useCaisses } from "@/lib/dataLayer";
import { resource } from "@/capabilities/resource";
import type { Transaction } from "@/types";
import { formatCentsToFCFA } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Plus,
  Search,
  X,
  Calendar,
  TrendingUp,
  Wallet,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import TransactionCard from "@/components/TransactionCard";
import { FinanceSkeleton } from "@/components/PageSkeletons";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonInfiniteScroll,
} from "@ionic/react";

export const FINANCE_PAGE_SIZE = 50;

export default function Finance() {
  const navigate = useNavigate();
  // M6 — stable pour les enfants memo (TransactionCard)
  const openTransaction = useCallback((id: string) => navigate(`/transaction/${id}`), [navigate]);
  const location = useLocation();
  const preselectedCaisse = location.state?.caisseId;

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const { data: caisses } = useCaisses();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(FINANCE_PAGE_SIZE);

  // Load transactions via Resource capability
  useEffect(() => {
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
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCaisse, setSelectedCaisse] = useState<string>(
    preselectedCaisse || "ALL",
  );
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx: any) => {
        if (
          searchTerm &&
          !tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
          return false;
        if (selectedType !== "ALL" && tx.type !== selectedType) return false;
        if (selectedStatus !== "ALL" && tx.status !== selectedStatus)
          return false;
        if (selectedCaisse !== "ALL" && tx.sourceCaisseId !== selectedCaisse)
          return false;
        if (dateRange.from && tx.date < dateRange.from) return false;
        if (dateRange.to && tx.date > dateRange.to) return false;
        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
  }, [
    transactions,
    searchTerm,
    selectedType,
    selectedStatus,
    selectedCaisse,
    dateRange,
  ]);

  // Un changement de filtre ramène la fenêtre visible au premier écran.
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

  const handleAddTransaction = (type: "INCOME" | "EXPENSE") => {
    // Query param (pas de location.state) : le routeur Ionic ne préserve pas
    // le `state` de React Router, le type doit donc voyager dans l'URL.
    navigate(`/transaction/new?type=${type}`);
  };

  // UN SEUL <IonPage> à la racine (corrigé écran noir BottomNav) : le
  // view-stack d'Ionic s'enregistre via registerIonPage sur la DOM
  // identité de l'élément — si on change de <IonPage> à chaque branche
  // (loading vs chargé), l'élément est démonté/remonté, la transition
  // est rejouée et le view entrant reste stuck en ion-page-invisible.
  // On garde le MÊME <IonPage> et on bascule uniquement le contenu.
  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          {loading ? (
            <FinanceSkeleton />
          ) : (
            <Fragment>
              <h1 className="sr-only">Finance — Grand livre</h1>
              <TopHeader title="Finance" />
              <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: "color-mix(in srgb, var(--data-income) 12%, transparent)" }}
              >
                <p className="text-text-tertiary text-xs">Revenus</p>
                <p className="text-text-primary font-bold text-lg mt-1">
                  {formatCentsToFCFA(totalIncome)}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)" }}
              >
                <p className="text-text-tertiary text-xs">Dépenses</p>
                <p className="text-text-primary font-bold text-lg mt-1">
                  {formatCentsToFCFA(totalExpense)}
                </p>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                />
              </div>
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="px-4 rounded-xl flex items-center gap-2"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
                aria-label="Filtres"
                aria-expanded={filterOpen}
              >
                <Filter className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            {/* Filter Panel */}
            {filterOpen && (
              <div
                className="rounded-xl p-4 mb-4 space-y-3"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-text-primary text-sm font-medium">
                    Filtres
                  </p>
                  <button
                    onClick={() => setFilterOpen(false)}
                    style={{ color: "var(--text-secondary)" }}
                    aria-label="Fermer les filtres"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Type Filter */}
                <div>
                  <p className="text-text-tertiary text-xs mb-2">Type</p>
                  <div className="flex gap-2">
                    {["ALL", "INCOME", "EXPENSE"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedType(f)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor:
                            selectedType === f ? "var(--accent-primary)" : "var(--surface)",
                          color: selectedType === f ? "var(--text-primary)" : "var(--text-secondary)",
                        }}
                      >
                        {f === "ALL"
                          ? "Tout"
                          : f === "INCOME"
                            ? "Revenu"
                            : "Dépense"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <p className="text-text-tertiary text-xs mb-2">Statut</p>
                  <div className="flex gap-2">
                    {["ALL", "APPROVED", "PENDING", "DRAFT"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedStatus(f)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor:
                            selectedStatus === f ? "var(--data-planified)" : "var(--surface)",
                          color: selectedStatus === f ? "var(--text-primary)" : "var(--text-secondary)",
                        }}
                      >
                        {f === "ALL" ? "Tout" : f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caisse Filter */}
                <div>
                  <p className="text-text-tertiary text-xs mb-2">Caisse</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedCaisse("ALL")}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor:
                          selectedCaisse === "ALL" ? "var(--accent-primary)" : "var(--surface)",
                        color: selectedCaisse === "ALL" ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      Toutes
                    </button>
                    {caisses.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCaisse(c.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor:
                            selectedCaisse === c.id ? "var(--accent-primary)" : "var(--surface)",
                          color: selectedCaisse === c.id ? "var(--text-primary)" : "var(--text-secondary)",
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <p className="text-text-tertiary text-xs mb-2">Période</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, from: e.target.value })
                      }
                      className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                      }}
                    />
                    <span className="text-text-tertiary text-xs self-center">
                      →
                    </span>
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, to: e.target.value })
                      }
                      className="px-3 py-2 rounded-lg text-xs outline-none"
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Transactions List */}
            <div className="space-y-2 mb-6">
              {filteredTransactions.length === 0 ? (
                <div
                  className="text-center py-10 rounded-xl"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <p className="text-text-tertiary text-sm">
                    Aucune transaction trouvée
                  </p>
                </div>
              ) : (
                <>
                  {visibleTransactions.map((tx: any) => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      onPress={openTransaction}
                    />
                  ))}
                  {visibleCount < filteredTransactions.length && (
                    <IonInfiniteScroll
                      position="bottom"
                      threshold="300px"
                      onIonInfinite={() =>
                        setVisibleCount((c) => c + FINANCE_PAGE_SIZE)
                      }
                    >
                      <div className="py-3">
                        <p className="text-text-tertiary text-xs">
                          Chargement…
                        </p>
                      </div>
                    </IonInfiniteScroll>
                  )}
                </>
              )}
            </div>

            {/* FAB */}
            <div className="fixed bottom-24 right-5 flex flex-col gap-3">
              <button
                onClick={() => handleAddTransaction("INCOME")}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-accent active:scale-95 transition-transform"
                style={{ backgroundColor: "var(--data-income)" }}
                aria-label="Nouvelle entrée"
              >
                <ArrowUpRight className="w-6 h-6 text-on-accent" />
              </button>
              <button
                onClick={() => handleAddTransaction("EXPENSE")}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-accent active:scale-95 transition-transform"
                style={{ backgroundColor: "var(--data-expense)" }}
                aria-label="Nouvelle dépense"
              >
                <ArrowDownRight className="w-6 h-6 text-on-accent" />
              </button>
            </div>
            </div>
            </Fragment>
          )}
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
