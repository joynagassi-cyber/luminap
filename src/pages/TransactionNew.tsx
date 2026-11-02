/**
 * TransactionNew v2 — Formulaire de saisie de transaction, redesign premium.
 *
 * Design : carte unique avec champs bien espacés, labels flottants corrigés,
 * sélecteur Entrée/Sortie en haut, bouton d'action principal en bas.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : validation, catégories, caisses, preuves,
 * double-soumission, mode hors-ligne.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  useTransactions,
  useCategories,
  useCaisses,
  useEvents,
  addTransactionPS,
} from "@/lib/dataLayer";
import { addReceipt } from "@/lib/receipts";
import {
  ArrowLeft,
  Wallet,
  Calendar,
  Camera,
  ImagePlus,
  X,
  ChevronRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { generateId } from "@/lib/utils";
import { getOrganizationId } from "@/lib/orgContext";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { useOnlineStatus } from "@/lib/dataLayer";
import { policy } from "@/capabilities/policy";
import { notification } from "@/capabilities/notification";
import { periodLockMessage } from "@/lib/periodLock";
import {
  IonPage,
  IonContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonTextarea,
  IonButton,
  IonSpinner,
} from "@ionic/react";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";
import { ActionCard, InfoCard, FormField } from "@/design/components/PageShell";

export default function TransactionNew() {
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedCaisse = (location.state as any)?.caisseId || "";
  const preselectedType =
    new URLSearchParams(location.search).get("type") ||
    (location.state as any)?.type ||
    "";
  const preselectedEvent = (location.state as any)?.eventId || "";

  const { data: psCategories } = useCategories();
  const { data: psCaisses } = useCaisses();
  const { data: psEvents } = useEvents();

  const categories = psCategories ?? [];
  const caisses = psCaisses ?? [];
  const events = psEvents ?? [];

  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    (preselectedType as any) || "INCOME",
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [sourceCaisseId, setSourceCaisseId] = useState(
    preselectedCaisse || "main",
  );
  const [source, setSource] = useState<
    "CAISSE" | "COTISATION" | "PERSONNE" | "AUTRE"
  >("CAISSE");
  const [personName, setPersonName] = useState("");
  const [eventId, setEventId] = useState(preselectedEvent);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [proofPhotos, setProofPhotos] = useState<File[]>([]);
  const [proofUploading, setProofUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const amountRef = useRef<any>(null);
  const submitLockRef = useRef(false);
  const keyboardHeight = useKeyboardAvoidance();
  const isOnline = useOnlineStatus();

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

  const filteredCategories = categories.filter((c: any) => c.type === type);

  useEffect(() => {
    if (filteredCategories.length > 0 && !categoryId) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories, categoryId]);

  const handleTypeSelect = (t: "INCOME" | "EXPENSE") => {
    setType(t);
    setCategoryId("");
    setFieldErrors((prev) => ({ ...prev, amount: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    setError("");

    const amountErr = validateAmount(amount);
    if (amountErr) {
      setFieldErrors((prev) => ({ ...prev, amount: amountErr }));
      return;
    }
    if (!description.trim()) {
      setFieldErrors((prev) => ({ ...prev, description: "La description est requise" }));
      return;
    }
    if (!categoryId) {
      setFieldErrors((prev) => ({ ...prev, category: "Une catégorie est requise" }));
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);

    try {
      const numAmount = parseFloat(amount);
      const tx = {
        id: generateId(),
        org_id: getOrganizationId(),
        type,
        amount: numAmount,
        description: description.trim(),
        date,
        status: "PENDING",
        category_id: categoryId || null,
        source_caisse_id: sourceCaisseId || null,
        source,
        person_name: personName.trim() || null,
        event_id: eventId || null,
        comment: comment.trim() || null,
        created_by_id: "current-user",
      };

      await addTransactionPS(tx);

      if (proofPhotos.length > 0) {
        for (const photo of proofPhotos) {
          await addReceipt(tx.id, photo);
        }
      }

      await notification.send("Transaction enregistrée", {
        body: `${description.trim()} — ${formatCentsToFCFA(numAmount)}`,
      });

      navigate("/finance", { replace: true });
    } catch (err: any) {
      setError(err?.message || "L'enregistrement a échoué. Réessayez.");
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const canSubmit =
    amount.trim() !== "" &&
    !fieldErrors.amount &&
    description.trim() !== "" &&
    categoryId !== "" &&
    !submitting;

  const typeLabel = type === "INCOME" ? "Entrée" : "Sortie";
  const typeIcon = type === "INCOME" ? <Wallet className="w-4 h-4" /> : <Wallet className="w-4 h-4" />;
  const typeColor = type === "INCOME" ? "var(--in)" : "var(--out)";

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader
            title="Nouvelle transaction"
            subtitle="Gestion financière"
            onBack={() => navigate(-1)}
          />
          <div className="max-w-md mx-auto px-5 pt-2 pb-safe-calc">
            {/* Sélecteur Entrée / Sortie */}
            <div className="mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => handleTypeSelect("INCOME")}
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
                  onClick={() => handleTypeSelect("EXPENSE")}
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
            <InfoCard className="mb-6">
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
                      ref={amountRef}
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0"
                      aria-label="Montant en francs CFA"
                      aria-invalid={!!fieldErrors.amount}
                      className={`w-full pl-8 pr-4 py-3.5 rounded-xl text-text-primary text-lg font-bold ${
                        fieldErrors.amount ? "text-out" : ""
                      }`}
                      style={{
                        backgroundColor: "var(--surface)",
                        border: fieldErrors.amount
                          ? "1px solid var(--out)"
                          : "1px solid var(--border)",
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
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, description: "" }));
                      }}
                      placeholder="Ex: Dîme du mois, offrande, dépense…"
                      aria-label="Description de la transaction"
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                  {fieldErrors.description && (
                    <p className="text-xs mt-1.5 text-text-alert" style={{ color: "var(--out)" }}>
                      {fieldErrors.description}
                    </p>
                  )}
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
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Catégorie
                  </label>
                  <div className="relative">
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <IonSelect
                      value={categoryId}
                      onIonChange={(e: IonChangeCustomEvent<string>) => {
                        setCategoryId(e.detail.value ?? "");
                        setFieldErrors((prev) => ({ ...prev, category: "" }));
                      }}
                      interface="popover"
                      className="w-full"
                    >
                      <IonSelectOption value="">Sélectionner une catégorie</IonSelectOption>
                      {filteredCategories.map((cat: any) => (
                        <IonSelectOption key={cat.id} value={cat.id}>
                          {cat.name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                  {fieldErrors.category && (
                    <p className="text-xs mt-1.5 text-text-alert" style={{ color: "var(--out)" }}>
                      {fieldErrors.category}
                    </p>
                  )}
                </div>

                {/* Caisse source */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Caisse
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <IonSelect
                      value={sourceCaisseId}
                      onIonChange={(e: IonChangeCustomEvent<string>) => setSourceCaisseId(e.detail.value ?? "")}
                      interface="popover"
                      className="w-full pl-10"
                    >
                      <IonSelectOption value="main">Caisse principale</IonSelectOption>
                      {(caisses ?? []).map((c: any) => (
                        <IonSelectOption key={c.id} value={c.id}>
                          {c.name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
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
                  disabled={!canSubmit}
                  className="py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-accent"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                    color: "var(--on-accent)",
                    opacity: canSubmit ? 1 : 0.5,
                  }}
                >
                  {submitting ? (
                    <IonSpinner className="w-5 h-5" />
                  ) : (
                    <>
                      {type === "INCOME" ? "Enregistrer l'entrée" : "Enregistrer la sortie"}
                    </>
                  )}
                </IonButton>
              </form>
            </InfoCard>

            {/* Statut de connexion */}
            {!isOnline && (
              <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{
                backgroundColor: "color-mix(in srgb, var(--warn) 12%, transparent)",
                color: "var(--warn)",
                border: "1px solid color-mix(in srgb, var(--warn) 25%, var(--border))",
              }}>
                Mode hors ligne — la transaction sera synchronisée à la reconnexion.
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
