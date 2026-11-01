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
  Search,
  X,
  Wallet,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import TransactionCard from "@/components/TransactionCard";
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
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  MotionCard,
} from "@/design/motion/MotionCard";
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
  const netBalance = totalIncome - totalExpense;

  const handleAddTransaction = (type: "INCOME" | "EXPENSE") => {
    navigate(`/transaction/new?type=${type}`);
  };

  const CARD_VARIANTS = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-dvh">
          {loading ? (
            <div data-screen-state="loading">
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

                {/* Solde net — Carte héro */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={CARD_VARIANTS}
                  className="mb-6"
                >
                  <MotionCard variant="elevated" className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-1">
                          Solde net
                        </p>
                        <p className={`text-3xl font-bold ${
                          netBalance >= 0
                            ? "text-text-primary"
                            : "text-out"
                        }`}>
                          {formatCentsToFCFA(netBalance)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-hover">
                        <Wallet className="w-6 h-6 text-text-secondary" />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-xs font-medium">
                      <span className={`flex items-center gap-1 ${
                        netBalance >= 0 ? "text-text-secondary" : "text-out"
                      }`}>
                        <span className="w-1 h-1 rounded-full bg-current" />
                        {netBalance >= 0 ? "Excédent" : "Déficit"}
                      </span>
                      <span className="text-text-tertiary">
                        {formatCentsToFCFA(totalIncome)} entrées •
                        {formatCentsToFCFA(totalExpense)} sorties
                      </span>
                    </div>
                  </MotionCard>
                </motion.div>

                {/* Résumé Revenus / Dépenses */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={CARD_VARIANTS}
                    transition={{ delay: 0.1 }}
                  >
                    <MotionCard variant="accent" className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-income/10 flex items-center justify-center text-income">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-1">
                        Revenus
                      </p>
                      <p className="text-text-primary font-bold text-2xl">
                        {formatCentsToFCFA(totalIncome)}
                      </p>
                    </MotionCard>
                  </motion.div>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={CARD_VARIANTS}
                    transition={{ delay: 0.2 }}
                  >
                    <MotionCard variant="accent" className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-expense/10 flex items-center justify-center text-expense">
                          <ArrowDownRight className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-1">
                        Dépenses
                      </p>
                      <p className="text-text-primary font-bold text-2xl">
                        {formatCentsToFCFA(totalExpense)}
                      </p>
                    </MotionCard>
                  </motion.div>
                </div>

                {/* Recherche & Filtres */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={CARD_VARIANTS}
                  transition={{ delay: 0.3 }}
                  className="mb-6"
                >
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
                      />
                      <IonInput
                        type="text"
                        aria-label="Rechercher une transaction"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onIonInput={(e: IonChangeCustomEvent<string>) =>
                          setSearchTerm(e.detail.value ?? "")
                        }
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-placeholder focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => setFilterOpen(!filterOpen)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      aria-label="Filtres"
                      aria-expanded={filterOpen}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium">Filtres</span>
                      {filterOpen ? (
                        <X className="w-4 h-4 ml-auto" />
                      ) : null}
                    </button>
                  </div>

                  {/* Panel Filtres */}
                  {filterOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3 rounded-xl p-5 border border-border bg-surface shadow-pop"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-text-primary text-sm font-medium">
                          Filtres
                        </p>
                        <button
                          onClick={() => setFilterOpen(false)}
                          className="text-text-secondary hover:text-text-primary transition-colors"
                          aria-label="Fermer les filtres"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Type */}
                      <div className="mb-4">
                        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">
                          Type
                        </p>
                        <div className="flex gap-2">
                          {["ALL", "INCOME", "EXPENSE"].map((f) => (
                            <button
                              key={f}
                              onClick={() => setSelectedType(f)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                selectedType === f
                                  ? "bg-accent-primary text-text-primary"
                                  : "bg-surface-hover text-text-secondary hover:bg-surface",
                              )}
                            >
                              {f === "ALL" ? "Tout" : f === "INCOME" ? "Revenu" : "Dépense"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Statut */}
                      <div className="mb-4">
                        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">
                          Statut
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {["ALL", "APPROVED", "PENDING", "DRAFT"].map((f) => (
                            <button
                              key={f}
                              onClick={() => setSelectedStatus(f)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                selectedStatus === f
                                  ? "bg-green-50 text-green-700 border border-green-100"
                                  : "bg-surface-hover text-text-secondary border border-transparent hover:border-border",
                              )}
                            >
                              {f === "ALL" ? "Tout" : f}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Caisse */}
                      <div className="mb-4">
                        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">
                          Caisse
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => setSelectedCaisse("ALL")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                              selectedCaisse === "ALL"
                                ? "bg-accent-primary text-text-primary"
                                : "bg-surface-hover text-text-secondary hover:bg-surface",
                            )}
                          >
                            Toutes
                          </button>
                          {caisses.map((c: any) => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedCaisse(c.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                selectedCaisse === c.id
                                  ? "bg-accent-primary text-text-primary"
                                  : "bg-surface-hover text-text-secondary hover:bg-surface",
                              )}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Période */}
                      <div>
                        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">
                          Période
                        </p>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <IonInput
                              type="date"
                              aria-label="Date de début"
                              value={dateRange.from}
                              onIonInput={(e: IonChangeCustomEvent<string>) =>
                                setDateRange({ ...dateRange, from: e.detail.value ?? "" })
                              }
                              className="w-full pl-3 pr-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-placeholder focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none"
                            />
                          </div>
                          <span className="text-text-tertiary text-xs self-center">
                            →
                          </span>
                          <div className="relative flex-1">
                            <IonInput
                              type="date"
                              aria-label="Date de fin"
                              value={dateRange.to}
                              onIonInput={(e: IonChangeCustomEvent<string>) =>
                                setDateRange({ ...dateRange, to: e.detail.value ?? "" })
                              }
                              className="w-full pl-3 pr-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-placeholder focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Liste des transactions */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={CARD_VARIANTS}
                  transition={{ delay: 0.4 }}
                  className="mb-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                      Derniers mouvements
                    </p>
                    <span className="text-text-secondary text-xs">
                      {visibleTransactions.length} sur {filteredTransactions.length}
                    </span>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <EmptyState
                      title="Aucune transaction trouvée"
                      description="Modifiez les filtres ou la période pour retrouver vos mouvements."
                      icon={<Wallet className="w-6 h-6" />}
                    />
                  ) : (
                    <ul className="space-y-2">
                      {visibleTransactions.map((tx: any) => (
                        <li key={tx.id}>
                          <TransactionCard
                            transaction={tx}
                            onPress={openTransaction}
                            className="group"
                          />
                        </li>
                      ))}
                      {visibleCount < filteredTransactions.length && (
                        <li>
                          <div className="px-4 py-3 text-center">
                            <p className="text-text-tertiary text-xs">
                              Chargement…
                            </p>
                          </div>
                        </li>
                      )}
                    </ul>
                  )}
                </motion.div>
              </div>
            </Fragment>
          )}
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
