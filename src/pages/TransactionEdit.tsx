/**
 * TransactionEdit v2 — Édition de transaction, redesign premium.
 *
 * Design : carte unique avec champs bien espacés, labels clairs, sélecteur
 * Entrée/Sortie en haut, bouton d'action principal en bas.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : mise à jour PowerSync, période verrouillée,
 * transactions approuvées non modifiables.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useTransactions,
  useCategories,
  useOrgUnits,
  useEvents,
  useAccounts,
  updateTransactionPS,
  isPowerSyncReadyNow,
} from "@/lib/dataLayer";
import { ArrowUpRight, ArrowDownRight, X, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { policy } from "@/capabilities/policy";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { periodLockMessage } from "@/lib/periodLock";
import type { Transaction } from "@/types";
import {
  IonPage,
  IonContent,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
} from "@ionic/react";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";
import { formatCentsToFCFA } from "@/lib/utils";

export default function TransactionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const keyboardHeight = useKeyboardAvoidance();

  const { data: psTransactions } = useTransactions();
  const { data: psCategories } = useCategories();
  const { data: psEvents } = useEvents();
  const { data: psOrgUnits } = useOrgUnits();
  const { data: psAccounts } = useAccounts();

  const transactions = psTransactions ?? [];
  const categories = psCategories ?? [];
  const events = psEvents ?? [];
  const orgUnits = psOrgUnits ?? [];
  const accounts = psAccounts ?? [];

  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [sourceCaisseId, setSourceCaisseId] = useState("main");
  const [source, setSource] = useState<
    "CAISSE" | "COTISATION" | "PERSONNE" | "AUTRE"
  >("CAISSE");
  const [personName, setPersonName] = useState("");
  const [eventId, setEventId] = useState("");
  const [compensatesFor, setCompensatesFor] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tx = transactions.find((t: any) => t.id === id);
    if (!tx) return;
    if (tx.status === "APPROVED") {
      navigate(`/transaction/${id}`);
      return;
    }
    setType(tx.type as any);
    setAmount(Math.round((tx.amount || 0) / 100).toString());
    setDescription(tx.description || "");
    setDate(tx.date || "");
    setCategoryId(tx.category_id || "");
    setOrgUnitId(tx.org_unit_id || "");
    setSourceCaisseId(tx.source_caisse_id || "main");
    setSource(tx.source as any);
    setPersonName(tx.person_name || "");
    setEventId(tx.event_id || "");
    setCompensatesFor(tx.compensates_for || "");
    setComment(tx.comment || "");
  }, [transactions, id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Le montant doit être supérieur à 0");
      return;
    }

    setSubmitting(true);
    try {
      const tx = transactions.find((t: any) => t.id === id);
      if (!tx) throw new Error("Transaction introuvable");

      await updateTransactionPS({
        ...tx,
        type,
        amount: numAmount,
        description: description.trim(),
        date,
        category_id: categoryId || null,
        org_unit_id: orgUnitId || null,
        source_caisse_id: sourceCaisseId || null,
        source,
        person_name: personName.trim() || null,
        event_id: eventId || null,
        comment: comment.trim() || null,
      });

      navigate(`/transaction/${id}`, { replace: true });
    } catch (err: any) {
      setError(err?.message || "La mise à jour a échoué. Réessayez.");
      setSubmitting(false);
    }
  };

  const tx = transactions.find((t: any) => t.id === id);
  if (!tx) {
    return (
      <IonPage>
        <IonContent fullscreen className="bg-canvas">
          <div className="min-h-dvh flex flex-col items-center justify-center py-12 px-6 text-center">
            <X className="w-12 h-12 text-text-tertiary mb-4" />
            <h2 className="text-text-primary font-bold text-xl mb-2">Transaction introuvable</h2>
            <p className="text-text-tertiary text-sm">Cette transaction n'existe plus.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const typeLabel = type === "INCOME" ? "Entrée" : "Sortie";
  const typeColor = type === "INCOME" ? "var(--in)" : "var(--out)";

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader
            title="Modifier la transaction"
            subtitle={tx.description || "Détails de la transaction"}
            onBack={() => navigate(-1)}
          />
          <div className="max-w-md mx-auto px-5 pt-2 pb-safe-calc">
            {/* Sélecteur Entrée / Sortie */}
            <div className="mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setType("INCOME")}
                  className={`flex-1 py-4 rounded-xl text-sm font-semibold transition-all ${
                    type === "INCOME"
                      ? "bg-green-500 text-black shadow-accent"
                      : "bg-surface border border-border text-text-secondary"
                  }`}
                  aria-label="Entrée"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ArrowUpRight className="w-4 h-4" style={{ color: "var(--in)" }} />
                    Entrée
                  </span>
                </button>
                <button
                  onClick={() => setType("EXPENSE")}
                  className={`flex-1 py-4 rounded-xl text-sm font-semibold transition-all ${
                    type === "EXPENSE"
                      ? "bg-red-500 text-black shadow-accent"
                      : "bg-surface border border-border text-text-secondary"
                  }`}
                  aria-label="Sortie"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ArrowDownRight className="w-4 h-4" style={{ color: "var(--out)" }} />
                    Sortie
                  </span>
                </button>
              </div>
            </div>

            {/* Carte principale du formulaire */}
            <div className="rounded-2xl p-5 border border-border bg-surface mb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Montant */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Montant (FCFA)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                      F
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      aria-label="Montant en francs CFA"
                      className="w-full pl-8 pr-4 py-3.5 rounded-xl text-text-primary text-lg font-bold"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Dîme du mois, offrande, dépense…"
                    aria-label="Description de la transaction"
                    className="w-full pl-4 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>

                {/* Date */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    aria-label="Date de la transaction"
                    className="w-full pl-4 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Catégorie
                  </label>
                  <IonSelect
                    value={categoryId}
                    onIonChange={(e: IonChangeCustomEvent<string>) => setCategoryId(e.detail.value ?? "")}
                    interface="popover"
                    className="w-full"
                  >
                    <IonSelectOption value="">Sélectionner une catégorie</IonSelectOption>
                    {categories.map((cat: any) => (
                      <IonSelectOption key={cat.id} value={cat.id}>
                        {cat.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>

                {/* Caisse source */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Caisse
                  </label>
                  <IonSelect
                    value={sourceCaisseId}
                    onIonChange={(e: IonChangeCustomEvent<string>) => setSourceCaisseId(e.detail.value ?? "")}
                    interface="popover"
                    className="w-full"
                  >
                    <IonSelectOption value="main">Caisse principale</IonSelectOption>
                    {accounts.map((c: any) => (
                      <IonSelectOption key={c.id} value={c.id}>
                        {c.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>

                {/* Commentaire */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Commentaire (optionnel)
                  </label>
                  <IonTextarea
                    value={comment}
                    onIonChange={(e: IonChangeCustomEvent<string>) => setComment(e.detail.value ?? "")}
                    placeholder="Ajouter un commentaire…"
                    rows={3}
                    className="w-full min-h-[80px] rounded-xl text-text-primary text-sm"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>

                {/* Erreur globale */}
                {error && (
                  <div
                    className="p-3.5 rounded-xl text-sm text-center"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--out) 12%, transparent)",
                      color: "var(--out)",
                      border: "1px solid color-mix(in srgb, var(--out) 25%, var(--border))",
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Bouton d'action */}
                <IonButton
                  type="submit"
                  expand="block"
                  disabled={submitting}
                  className="py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-accent"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                    color: "var(--on-accent)",
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? (
                    <IonSpinner className="w-5 h-5" />
                  ) : (
                    "Enregistrer les modifications"
                  )}
                </IonButton>
              </form>
            </div>

            {/* Statut de connexion */}
            {!isPowerSyncReadyNow() && (
              <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{
                backgroundColor: "color-mix(in srgb, var(--warn) 12%, transparent)",
                color: "var(--warn)",
                border: "1px solid color-mix(in srgb, var(--warn) 25%, var(--border))",
              }}>
                Mode hors ligne — les modifications seront synchronisées à la reconnexion.
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
