/**
 * TransactionNewGroup v2 — Nouvelle transaction de groupe, redesign premium.
 *
 * Design : carte unique avec formulaire propre, sélecteur Entrée/Sortie,
 * labels flottants corrigés, bouton d'action principal.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : création de transaction liée à un groupe,
 * validation, verrou de période.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  useCategories,
  useAccounts,
  useCaisses,
  addTransactionPS,
} from "@/lib/dataLayer";
import { ArrowLeft, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import type { Category, FundSource } from "@/types";
import { getOrganizationId } from "@/lib/orgContext";
import { periodLockMessage } from "@/lib/periodLock";
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
import { InfoCard } from "@/design/components/PageShell";

export default function TransactionNewGroup() {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const keyboardHeight = useKeyboardAvoidance();

  const { data: psCategories } = useCategories();
  const { data: psAccounts } = useAccounts();
  const { data: psCaisses } = useCaisses();

  const categories = psCategories ?? [];
  const accounts = psAccounts ?? [];
  const caisses = psCaisses ?? [];

  const groupAccount = accounts.find((a: any) => a.id === groupId);
  const caisse = caisses.find((c: any) => c.id === groupId);
  const queryType = (location.state as any)?.type || "INCOME";

  const [type, setType] = useState<"INCOME" | "EXPENSE">(queryType as any);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [source, setSource] = useState<
    "CAISSE" | "COTISATION" | "PERSONNE" | "AUTRE"
  >("CAISSE");
  const [personName, setPersonName] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  useEffect(() => {
    setFilteredCategories(categories.filter((c: any) => c.type === type) as any);
  }, [type, categories]);

  const validateAmount = (val: string): string => {
    const num = parseFloat(val);
    if (!val) return "";
    if (isNaN(num) || num <= 0) return "Le montant doit être supérieur à 0";
    if (num > 999999999) return "Montant maximum atteint";
    return "";
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const err = validateAmount(val);
    setFieldErrors((prev) => ({ ...prev, amount: err }));
  };

  const handleSubmit = async () => {
    const trimmedAmount = amount.trim();
    const trimmedDesc = description.trim();
    const trimmedCatId = categoryId?.toString().trim();

    if (!trimmedAmount || !trimmedDesc || !trimmedCatId) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const amountErr = validateAmount(trimmedAmount);
    if (amountErr) {
      setFieldErrors((prev) => ({ ...prev, amount: amountErr }));
      return;
    }
    setError("");
    setSubmitting(true);
    const sessionId = localStorage.getItem("lumina-session") || "local-user";
    const isExpense = type === "EXPENSE";

    try {
      await addTransactionPS({
        org_id: getOrganizationId(),
        type,
        amount: Math.round(parseFloat(amount) * 100),
        description,
        date,
        status: isExpense ? "PENDING" : "DRAFT",
        category_id: categoryId,
        org_unit_id: null,
        source_caisse_id: groupId || "main",
        event_id: null,
        source: source || "CAISSE",
        person_name: source === "PERSONNE" ? personName || null : null,
        compensates_for: null,
        comment: comment || null,
        created_by_id: sessionId,
        approved_by_id: null,
        approved_at: null,
        versement_id: null,
        reversal_of_id: null,
        cotisation_id: null,
      });
    } catch (e) {
      setSubmitting(false);
      setError(
        periodLockMessage(
          e,
          "Échec de l'enregistrement de la transaction. Réessayez.",
        ),
      );
      return;
    }
    navigate(`/groups/${groupId}`);
  };

  const typeLabel = type === "INCOME" ? "Entrée" : "Sortie";
  const typeIcon = type === "INCOME" ? <Wallet className="w-4 h-4" /> : <Wallet className="w-4 h-4" />;

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader
            title="Nouvelle transaction"
            subtitle={groupAccount?.name || "Groupe"}
            onBack={() => navigate(-1)}
          />
          <div className="max-w-lg mx-auto px-5 pt-2 pb-safe-calc" style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          }}>
            {/* Groupe info */}
            {groupAccount && (
              <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">
                  Groupe
                </p>
                <p className="text-text-primary font-semibold">{groupAccount.name}</p>
              </div>
            )}

            {/* Sélecteur Entrée / Sortie */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setType("INCOME")}
                className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all ${type === "INCOME" ? "bg-green-500 text-black shadow-accent" : "bg-surface border border-border text-text-secondary"}`}
                aria-label="Entrée"
              >
                <span className="flex items-center justify-center gap-2">
                  <span style={{ color: "var(--in)" }}>↑</span> Entrée
                </span>
              </button>
              <button
                onClick={() => setType("EXPENSE")}
                className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all ${type === "EXPENSE" ? "bg-red-500 text-black shadow-accent" : "bg-surface border border-border text-text-secondary"}`}
                aria-label="Sortie"
              >
                <span className="flex items-center justify-center gap-2">
                  <span style={{ color: "var(--out)" }}>↓</span> Sortie
                </span>
              </button>
            </div>

            <InfoCard className="mb-6">
              <form onSubmit={(e) => { e.preventDefault(); /* handled by button */ }} className="space-y-5">
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
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0"
                      aria-label="Montant en francs CFA"
                      className={`w-full pl-8 pr-4 py-3.5 rounded-xl text-text-primary text-lg font-bold ${fieldErrors.amount ? "text-out" : ""}`}
                      style={{
                        backgroundColor: "var(--surface)",
                        border: fieldErrors.amount ? "1px solid var(--out)" : "1px solid var(--border)",
                      }}
                    />
                  </div>
                  {fieldErrors.amount && (
                    <p className="text-xs mt-1.5 text-text-alert" style={{ color: "var(--out)" }}>
                      {fieldErrors.amount}
                    </p>
                  )}
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
                    placeholder="Ex: Dîme du groupe"
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
                  <div className="relative">
                    <ChevronRightIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <IonSelect
                      value={categoryId}
                      onIonChange={(e: IonChangeCustomEvent<string>) => setCategoryId(e.detail.value ?? "")}
                      interface="popover"
                      className="w-full pl-10"
                    >
                      <IonSelectOption value="">Sélectionner une catégorie</IonSelectOption>
                      {filteredCategories.map((cat: any) => (
                        <IonSelectOption key={cat.id} value={cat.id}>
                          {cat.label_fr || cat.label}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Source
                  </label>
                  <IonSelect
                    value={source}
                    onIonChange={(e: IonChangeCustomEvent<string>) => setSource(e.detail.value as FundSource)}
                    interface="popover"
                    className="w-full"
                  >
                    <IonSelectOption value="CAISSE">Caisse</IonSelectOption>
                    <IonSelectOption value="COTISATION">Cotisation</IonSelectOption>
                    <IonSelectOption value="PERSONNE">Personne</IonSelectOption>
                    <IonSelectOption value="AUTRE">Autre</IonSelectOption>
                  </IonSelect>
                </div>

                {/* Nom de la personne */}
                {source === "PERSONNE" && (
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Nom de la personne
                    </label>
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Nom de la personne"
                      className="w-full pl-4 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                )}

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

                <IonButton
                  type="button"
                  onClick={handleSubmit}
                  expand="block"
                  disabled={submitting}
                  className="py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-accent"
                  style={{
                    background: type === "INCOME" ? "var(--in)" : "var(--out)",
                    color: "var(--text-primary)",
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? (
                    <IonSpinner className="w-5 h-5" />
                  ) : (
                    "Enregistrer la transaction"
                  )}
                </IonButton>
              </form>
            </InfoCard>

            {/* Statut de connexion */}
            <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{
              backgroundColor: "color-mix(in srgb, var(--warn) 12%, transparent)",
              color: "var(--warn)",
              border: "1px solid color-mix(in srgb, var(--warn) 25%, var(--border))",
            }}>
              Mode hors ligne — la transaction sera synchronisée à la reconnexion.
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

function ChevronRightIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
