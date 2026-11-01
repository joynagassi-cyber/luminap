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
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { policy } from "@/capabilities/policy";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { periodLockMessage } from "@/lib/periodLock";
import type { FundSource, Transaction } from "@/types";
import {
  IonPage,
  IonContent,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
} from "@ionic/react";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";
import { FormField } from "@/design/forms/FormField";

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
    if (tx) {
      setType(tx.type as any);
      setAmount(Math.round((tx.amount || 0) / 100).toString());
      setDescription(tx.description);
      setDate(tx.date.split("T")[0]);
      setCategoryId((tx as any).category_id || (tx as any).categoryId || "");
      setOrgUnitId((tx as any).org_unit_id || (tx as any).orgUnitId || "");
      setSourceCaisseId(
        (tx as any).source_caisse_id || (tx as any).sourceCaisseId || "main",
      );
      setSource((tx as any).source || "CAISSE");
      setPersonName((tx as any).person_name || (tx as any).personName || "");
      setEventId((tx as any).event_id || (tx as any).eventId || "");
      setCompensatesFor(
        (tx as any).compensates_for || (tx as any).compensatesFor || "",
      );
      setComment((tx as any).comment || "");
    }
  }, [id, transactions]);

  const tx = transactions.find((t: any) => t.id === id);
  if (!tx) {
    if (!isPowerSyncReadyNow()) {
      return (
        <div data-screen-state="loading" className="min-h-dvh flex items-center justify-center">
          <p className="text-text-tertiary">Chargement…</p>
        </div>
      );
    }
    return (
      <IonPage>
        <IonContent fullscreen className="bg-canvas">
          <div
            data-screen-state="error"
            className="min-h-dvh flex items-center justify-center px-5 text-center"
          >
            <div>
              <p className="text-text-primary font-semibold mb-2">
                Cette transaction est introuvable.
              </p>
              <p className="text-text-tertiary text-sm mb-6">
                Elle a peut-être été supprimée, ou elle appartient à une autre organisation.
              </p>
              <button
                type="button"
                onClick={() => navigate("/finance")}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ color: "var(--accent-primary)" }}
              >
                Retour aux transactions
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const filteredCategories = categories.filter((c: any) => c.type === type);

  const handleOrgUnitChange = (ouId: string) => {
    setOrgUnitId(ouId);
    if (ouId) {
      const ou = orgUnits.find((o: any) => o.id === ouId);
      if (ou?.caisse_id) setSourceCaisseId(ou.caisse_id);
    }
  };

  const submitTransaction = async () => {
    const trimmedAmount = amount.trim();
    const trimmedDesc = description.trim();
    const trimmedCatId = categoryId?.toString().trim();

    if (!trimmedAmount || !trimmedDesc || !trimmedCatId) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setError("");
    const amountCents = Math.round(parseFloat(trimmedAmount) * 100);
    const amountCheck = policy.transaction.validateAmount(amountCents);
    if (!amountCheck.ok) {
      setError(amountCheck.message ?? "Veuillez entrer un montant valide");
      return;
    }
    setSubmitting(true);
    try {
      await updateTransactionPS({
        id,
        type,
        amount: amountCents,
        description,
        date,
        category_id: categoryId,
        org_unit_id: orgUnitId || null,
        source_caisse_id: sourceCaisseId || "main",
        event_id: eventId || null,
        source,
        person_name: source === "PERSONNE" ? personName || null : null,
        compensates_for: compensatesFor || null,
        comment: comment || null,
      });
      navigate(`/transaction/${id}`);
    } catch (e) {
      setSubmitting(false);
      setError(
        periodLockMessage(
          e,
          "Échec de la mise à jour de la transaction. Réessayez.",
        ),
      );
    }
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
      <IonContent fullscreen>
        <h1 className="sr-only">Modifier la transaction</h1>
        <TopHeader title="Modifier" />
        <div
          data-screen-state="ready"
          className="max-w-lg mx-auto w-full px-5 pt-safe-calc pb-safe-calc"
          style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            className="mb-1"
          >
            <button
              onClick={() => navigate(`/transaction/${id}`)}
              className="flex items-center gap-2 text-text-secondary text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
          </motion.div>

          {/* Type selector */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            transition={{ delay: 0.08 }}
            className="flex gap-3 mb-6"
          >
            <button
              onClick={() => setType("INCOME")}
              className={cn(
                "flex-1 py-4 rounded-2xl text-sm font-semibold transition-all shadow-sm",
                type === "INCOME"
                  ? "bg-accent-primary text-on-accent shadow-accent-sm"
                  : "bg-surface border border-border text-text-secondary hover:bg-surface-hover",
              )}
            >
              Entrée
            </button>
            <button
              onClick={() => setType("EXPENSE")}
              className={cn(
                "flex-1 py-4 rounded-2xl text-sm font-semibold transition-all shadow-sm",
                type === "EXPENSE"
                  ? "bg-destructive text-on-accent shadow-accent-sm"
                  : "bg-surface border border-border text-text-secondary hover:bg-surface-hover",
              )}
            >
              Sortie
            </button>
          </motion.div>

          {/* Amount */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            transition={{ delay: 0.16 }}
            className="mb-6"
          >
            <FormField label="Montant (FCFA)" error={error}>
              <IonInput
                type="number"
                inputMode="decimal"
                aria-label="Montant en francs CFA"
                value={amount}
                onIonInput={(e) => setAmount((e.detail.value as string) ?? "")}
                placeholder="0"
                className="w-full"
              />
            </FormField>
          </motion.div>

          {/* Description */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            transition={{ delay: 0.24 }}
            className="mb-6"
          >
            <FormField label="Description">
              <IonInput
                type="text"
                aria-label="Description"
                value={description}
                onIonInput={(e) => setDescription((e.detail.value as string) ?? "")}
                placeholder="Ex: Dîme du mois"
                className="w-full"
              />
            </FormField>
          </motion.div>

          {/* Date */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            transition={{ delay: 0.32 }}
            className="mb-6"
          >
            <FormField label="Date">
              <IonInput
                type="date"
                aria-label="Date"
                value={date}
                onIonInput={(e) => setDate((e.detail.value as string) ?? "")}
                className="w-full"
              />
            </FormField>
          </motion.div>

          {/* Category */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <FormField label="Catégorie">
              <IonSelect
                aria-label="Catégorie"
                value={categoryId}
                onIonChange={(e) => setCategoryId(e.detail.value)}
                className="w-full"
              >
                <IonSelectOption value="">
                  Sélectionner une catégorie
                </IonSelectOption>
                {filteredCategories.map((cat: any) => (
                  <IonSelectOption key={cat.id} value={cat.id}>
                    {cat.label_fr || cat.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </FormField>
          </motion.div>

          {/* Source */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            transition={{ delay: 0.48 }}
            className="mb-6"
          >
            <FormField label="Source">
              <IonSelect
                aria-label="Source"
                value={source}
                onIonChange={(e) => setSource(e.detail.value as any)}
                className="w-full"
              >
                <IonSelectOption value="CAISSE">Caisse</IonSelectOption>
                <IonSelectOption value="COTISATION">Cotisation</IonSelectOption>
                <IonSelectOption value="PERSONNE">Personne</IonSelectOption>
                <IonSelectOption value="AUTRE">Autre</IonSelectOption>
              </IonSelect>
            </FormField>
          </motion.div>

          {/* Caisse */}
          {source === "CAISSE" && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              transition={{ delay: 0.56 }}
              className="mb-6"
            >
              <FormField label="Caisse">
                <IonSelect
                  aria-label="Caisse"
                  value={sourceCaisseId}
                  onIonChange={(e) => setSourceCaisseId(e.detail.value)}
                  className="w-full"
                >
                  {accounts.map((c: any) => (
                    <IonSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </FormField>
            </motion.div>
          )}

          {/* Person name */}
          {source === "PERSONNE" && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              transition={{ delay: 0.56 }}
              className="mb-6"
            >
              <FormField label="Nom de la personne">
                <IonInput
                  type="text"
                  aria-label="Nom de la personne"
                  value={personName}
                  onIonInput={(e) =>
                    setPersonName((e.detail.value as string) ?? "")
                  }
                  placeholder="Nom de la personne"
                  className="w-full"
                />
              </FormField>
            </motion.div>
          )}

          {/* Event */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            transition={{ delay: 0.64 }}
            className="mb-6"
          >
            <FormField label="Événement">
              <IonSelect
                aria-label="Événement"
                value={eventId}
                onIonChange={(e) => setEventId(e.detail.value)}
                className="w-full"
              >
                <IonSelectOption value="">
                  Aucun événement
                </IonSelectOption>
                {events.map((ev: any) => (
                  <IonSelectOption key={ev.id} value={ev.id}>
                    {ev.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </FormField>
          </motion.div>

          {/* Comment */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={CARD_VARIANTS}
            transition={{ delay: 0.72 }}
            className="mb-6"
          >
            <FormField label="Commentaire">
              <IonTextarea
                aria-label="Commentaire"
                value={comment}
                onIonInput={(e) => setComment((e.detail.value as string) ?? "")}
                placeholder="Ajouter un commentaire…"
                rows={3}
                className="w-full"
              />
            </FormField>
          </motion.div>

          {error && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              className="mb-6"
            >
              <MotionCard variant="flat" className="p-4 text-center">
                <p className="text-text-primary text-sm text-center">{error}</p>
              </MotionCard>
            </motion.div>
          )}

          <IonButton
            expand="block"
            onClick={submitTransaction}
            disabled={submitting}
            className={cn(
              "py-4 rounded-2xl text-sm font-semibold shadow-fab",
              type === "INCOME"
                ? "bg-accent-primary text-on-accent"
                : "bg-destructive text-on-accent",
            )}
          >
            {submitting ? (
              <>
                <IonSpinner name="lines" style={{ marginRight: 6 }} />
                Enregistrement…
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </IonButton>
        </div>
        <BottomNav />
      </IonContent>
    </IonPage>
  );
}
