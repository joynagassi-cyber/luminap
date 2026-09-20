import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCaisses, useAccounts, useTransactions, createVersement } from "@/lib/dataLayer";
import { formatCurrencyCompact } from "@/lib/utils";
import { ArrowLeft, Check, AlertCircle, Wallet, RefreshCw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { VersementSkeleton } from "@/components/PageSkeletons";
import { policy } from "@/capabilities/policy";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

export default function Versement() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: psCaisses } = useCaisses();
  const { data: psAccounts, isLoading: accountsLoading } = useAccounts();
  const { data: psTransactions } = useTransactions();

  const caisses = psCaisses ?? [];
  const accounts = psAccounts ?? [];
  const transactions = psTransactions ?? [];

  const [selectedCaisse, setSelectedCaisse] = useState<string>(
    (location.state as any)?.caisseId || "",
  );
  const [amount, setAmount] = useState<string>(
    (location.state as any)?.defaultAmount
      ? String(Math.round((location.state as any).defaultAmount / 100))
      : "",
  );
  const [comment, setComment] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const groupAccounts = accounts.filter(
    (a: any) => a.owner_type === "GROUP" && a.status === "ACTIVE",
  );
  const selected = groupAccounts.find((a: any) => a.id === selectedCaisse);

  // Re-calculate balance fresh each time
  const approvedTxs = transactions.filter(
    (t: any) =>
      t.source_caisse_id === selectedCaisse ||
      (t.sourceCaisseId === selectedCaisse && t.status === "APPROVED"),
  );
  const balance =
    approvedTxs
      .filter((t: any) => t.type === "INCOME")
      .reduce((s: number, t: any) => s + t.amount, 0) -
    approvedTxs
      .filter((t: any) => t.type === "EXPENSE")
      .reduce((s: number, t: any) => s + t.amount, 0);
  const balanceFCFA = Math.round(balance / 100);

  const maxAmount = Math.max(0, balanceFCFA);
  const amountNum = Math.round(parseFloat(amount || "0"));
  const isValid = amountNum > 0 && amountNum <= maxAmount;

  const handleConfirm = async () => {
    if (!isValid || !selectedCaisse) return;
    setIsLoading(true);
    setFormError(null);
    try {
      const amountCents = amountNum * 100;
      const balanceCheck = policy.versement.checkBalance({
        balanceCents: Math.round(balance),
        amountCents,
      });
      if (!balanceCheck.ok) {
        setFormError(balanceCheck.message ?? "余额检查失败");
        setIsLoading(false);
        return;
      }
      await createVersement({
        sourceCaisseId: selectedCaisse,
        amount: amountNum * 100,
        comment: comment.trim() || undefined,
      });
      navigate("/dashboard");
    } catch (e) {
      // Versement creation failed — non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  if (accountsLoading) {
    return (
      <IonPage>
        <IonContent className="bg-canvas" fullscreen>
          <VersementSkeleton />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Versement" />
          <div className="max-w-lg mx-auto px-5 pb-28 pt-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <h1 className="text-text-primary font-bold text-xl mb-6">
              Verser à la caisse principale
            </h1>

            {showConfirm ? (
              <div className="space-y-4">
                {formError && (
                  <div
                    className="p-3 rounded-xl text-sm text-center"
                    style={{ backgroundColor: "#E5133220", color: "#ff8fa3" }}
                  >
                    {formError}
                  </div>
                )}
                <div
                  className="rounded-xl p-5"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <p className="text-text-tertiary text-xs font-medium mb-3 text-center uppercase tracking-wider">
                    Aperçu du versement
                  </p>
                  <div className="text-center mb-4">
                    <p className="text-text-tertiary text-sm mb-1">
                      Montant à verser
                    </p>
                    <p className="text-3xl font-black text-[var(--accent-primary)]">
                      {formatCurrencyCompact(amountNum)} F
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">De:</span>
                      <span className="text-text-primary font-medium">
                        {selected?.name || selectedCaisse}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-tertiary">Vers:</span>
                      <span className="text-text-primary font-medium">
                        Caisse principale
                      </span>
                    </div>
                    {comment && (
                      <div className="flex justify-between">
                        <span className="text-text-tertiary">Commentaire:</span>
                        <span className="text-text-primary font-medium text-right max-w-[60%]">
                          {comment}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-3.5 rounded-full font-semibold text-sm"
                    style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)" }}
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading || !isValid}
                    className="flex-1 py-3.5 rounded-full font-semibold text-white text-sm disabled:opacity-50"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    {isLoading ? "Traitement..." : "Confirmer le versement"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Caisse selector */}
                <div>
                  <label className="text-text-tertiary text-xs mb-2 block">
                    Sélectionner une caisse
                  </label>
                  <select
                    value={selectedCaisse}
                    onChange={(e) => setSelectedCaisse(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm "
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <option value="">Choisir une caisse...</option>
                    {groupAccounts.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Balance display */}
                {selected && (
                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-text-tertiary text-xs">
                          Solde disponible
                        </p>
                        <p className="text-text-primary font-bold text-xl mt-1">
                          {formatCurrencyCompact(balanceFCFA)} F
                        </p>
                      </div>
                      <Wallet className="w-8 h-8 text-text-tertiary" />
                    </div>
                  </div>
                )}

                {/* Amount input */}
                <div>
                  <label className="text-text-tertiary text-xs mb-2 block">
                    Montant à verser (FCFA)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    max={maxAmount}
                    className="w-full px-4 py-4 rounded-xl text-2xl font-bold  text-center"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                      border:
                        amountNum > maxAmount
                          ? "1px solid #E51332"
                          : "1px solid var(--surface-hover)",
                    }}
                  />
                  {amountNum > maxAmount && (
                    <p className="text-[#E51332] text-xs mt-1 text-center">
                      Montant supérieur au solde disponible
                    </p>
                  )}
                  {amountNum <= maxAmount && maxAmount > 0 && (
                    <p className="text-text-tertiary text-xs mt-1 text-center">
                      Maximum: {formatCurrencyCompact(maxAmount)} F
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label className="text-text-tertiary text-xs mb-2 block">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl text-sm  resize-none"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>

                {/* Quick amounts */}
                {maxAmount > 0 && (
                  <div className="flex gap-2">
                    {[0.25, 0.5, 0.75, 1].map((pct) => (
                      <button
                        key={pct}
                        onClick={() =>
                          setAmount(Math.round(maxAmount * pct).toString())
                        }
                        className="flex-1 py-2 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {Math.round(pct * 100)}%
                      </button>
                    ))}
                  </div>
                )}

                {/* Confirm button */}
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!isValid}
                  className="w-full py-4 rounded-full font-semibold text-white text-sm disabled:opacity-50 transition-all active:scale-95"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Continuer
                </button>
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
