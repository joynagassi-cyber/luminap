import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions, useCategories, useCaisses } from "@/lib/dataLayer";
import { showError } from "@/utils/toast";
import { ArrowLeft, Calendar, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import LuField from "@/design-system/components/LuField";
import LuSegmented from "@/design-system/components/LuSegmented";
import LuAmount from "@/design-system/components/LuAmount";
import LuCard from "@/design-system/components/LuCard";
import TopHeader from "@/components/TopHeader";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { haptics } from "@/lib/haptics";
import { IonSpinner } from "@ionic/react";

export default function History() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [caisseId, setCaisseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const keyboardHeight = useKeyboardAvoidance();

  const { data: psTransactions } = useTransactions();
  const { data: psCategories } = useCategories();
  const { data: psCaisses } = useCaisses();

  const categories = psCategories ?? [];
  const caisses = psCaisses ?? [];

  useEffect(() => {
    if (psTransactions) {
      setTransactions(psTransactions);
      setError("");
    }
  }, [psTransactions]);

  const handleTypeChange = (val: string) => {
    setTypeFilter(val as "ALL" | "INCOME" | "EXPENSE");
  };

  const handleAmountMinChange = (val: string) => setAmountMin(val);
  const handleAmountMaxChange = (val: string) => setAmountMax(val);

  const clearFilters = () => {
    setTypeFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setCategoryId("");
    setCaisseId("");
  };

  const renderTransaction = (tx: any) => {
    const isExpense = tx.type === "EXPENSE";
    const amountCents = tx.amount || 0;
    const signed = isExpense;
    const categoryLabel = (categories.find((c: any) => c.id === tx.category_id) as any)?.label_fr || (categories.find((c: any) => c.id === tx.category_id) as any)?.label || tx.category_id || "Inconnu";
    const caisseLabel = caisses.find((c: any) => c.id === tx.source_caisse_id)?.name || tx.source_caisse_id || "Inconnu";

    return (
      <LuCard
        key={tx.id}
        variant="surface"
        className="mb-3 cursor-pointer"
        onClick={() => navigate(`/transaction/${tx.id}`)}
        aria-label={`Transaction ${tx.id} : ${categoryLabel}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isExpense ? (
                <TrendingDown className="w-5 h-5 text-text-danger" />
              ) : (
                <TrendingUp className="w-5 h-5 text-text-success" />
              )}
            </div>
            <div>
              <div className="font-medium text-text-primary">{categoryLabel}</div>
              <div className="text-sm text-text-secondary">{caisseLabel} • {tx.date?.split("T")[0]}</div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <LuAmount
              amount={Math.abs(amountCents) / 100}
              currency="XOF"
              size="body"
              signed={signed}
              style={{ color: isExpense ? "var(--lu-expense)" : "var(--lu-income)" }}
            />
          </div>
        </div>
      </LuCard>
    );
  };

  return (
    <div className="max-w-lg mx-auto w-full px-5 pt-safe-calc pb-safe-calc" style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined }}>
      <h1 className="sr-only">Historique</h1>
      <TopHeader title="Historique" />
      
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-secondary text-sm mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      {/* Filtres (LuSegmented + LuField) */}
      <div className="mb-5">
        <LuSegmented
          options={[
            { value: "ALL", label: "Tout" },
            { value: "INCOME", label: "Entrées", icon: <TrendingUp className="w-4 h-4" /> },
            { value: "EXPENSE", label: "Sorties", icon: <TrendingDown className="w-4 h-4" /> },
          ]}
          value={typeFilter}
          onChange={handleTypeChange}
          aria-label="Filtre par type"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <LuField
          label="Date du"
          value={dateFrom}
          onChange={(val) => setDateFrom(val)}
          type="date"
          placeholder="AAAA-MM-JJ"
          trailing={<Calendar className="w-4 h-4 text-text-muted" />}
        />
        <LuField
          label="Date au"
          value={dateTo}
          onChange={(val) => setDateTo(val)}
          type="date"
          placeholder="AAAA-MM-JJ"
          trailing={<Calendar className="w-4 h-4 text-text-muted" />}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <LuField
          label="Montant min (XOF)"
          value={amountMin}
          onChange={handleAmountMinChange}
          inputMode="numeric"
          placeholder="0"
          trailing={<span className="text-text-muted">XOF</span>}
        />
        <LuField
          label="Montant max (XOF)"
          value={amountMax}
          onChange={handleAmountMaxChange}
          inputMode="numeric"
          placeholder="0"
          trailing={<span className="text-text-muted">XOF</span>}
        />
      </div>

      <div className="flex gap-3 mb-5">
        <button
          onClick={() => navigate("/transaction/new")}
          className="flex-1 py-2 rounded-full font-semibold text-on-accent text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: "var(--lu-accent)" }}
        >
          <Wallet className="w-4 h-4" /> Nouvelle
        </button>
        <button
          onClick={clearFilters}
          className="flex-1 py-2 rounded-full font-semibold text-text-secondary text-sm border border-border"
        >
          Réinitialiser
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ backgroundColor: "color-mix(in srgb, var(--lu-expense) 12%, transparent)", color: "var(--lu-expense)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <IonSpinner name="lines" />
        </div>
      ) : transactions.length === 0 ? (
        <LuCard variant="surface" className="text-center py-10">
          <div className="text-text-secondary mb-2">Aucune transaction</div>
          <button
            onClick={() => navigate("/transaction/new")}
            className="py-2 px-4 rounded-full font-semibold text-on-accent text-sm"
            style={{ backgroundColor: "var(--lu-accent)" }}
          >
            Ajouter
          </button>
        </LuCard>
      ) : (
        <div className="space-y-2">
          {transactions.map(renderTransaction)}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
