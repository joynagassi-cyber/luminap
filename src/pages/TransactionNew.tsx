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
  IonTextarea,
  IonButton,
  IonSpinner,
} from "@ionic/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";
import { FormField } from "@/design/forms/FormField";

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
  const amountRef = useRef<HTMLInputElement | null>(null);
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
    if (categoryId) return;
    const first = filteredCategories[0]?.id;
    if (first) setCategoryId(first);
  }, [categoryId, filteredCategories]);

  const submitTransaction = async () => {
    const trimmedAmount = amount.trim();
    const trimmedDesc = description.trim();
    const trimmedCatId = categoryId?.toString().trim();

    if (!trimmedAmount || !trimmedDesc || !trimmedCatId) {
      setError("Veuillez remplir tous les champs obligatoires");
      if (!trimmedAmount) {
        setTimeout(() => amountRef.current?.focus?.(), 0);
      }
      return;
    }
    setError("");
    const sessionId = localStorage.getItem("lumina-session") || "local-user";
    const isExpense = type === "EXPENSE";

    const amountCents = Math.round(parseFloat(trimmedAmount) * 100);
    const amountCheck = policy.transaction.validateAmount(amountCents);
    if (!amountCheck.ok) {
      setError(amountCheck.message ?? "Veuillez entrer un montant valide");
      return;
    }
    setSubmitting(true);
    let txId: string;
    try {
      txId = await addTransactionPS({
        org_id: getOrganizationId(),
        type,
        amount: Math.round(parseFloat(trimmedAmount) * 100),
        description,
        date,
        status: isExpense ? "PENDING" : "DRAFT",
        category_id: categoryId,
        org_unit_id: null,
        source_caisse_id: sourceCaisseId || "main",
        event_id: eventId || null,
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

    if (isExpense && proofPhotos.length > 0) {
      setProofUploading(true);
      try {
        for (const photo of proofPhotos) {
          await addReceipt(txId, photo, { uploadedBy: sessionId });
        }
        setProofPhotos([]);
      } catch {
        setError(
          "Transaction enregistrée. L'envoi de la photo a échoué (hors ligne ?). La preuve pourra être relancée depuis le détail.",
        );
        setProofPhotos([]);
      } finally {
        setProofUploading(false);
      }
    }

    setSubmitting(false);

    if (isExpense) {
      notification
        .sendNotification({
          title: "Transaction en attente d'approbation",
          message: `Nouvelle dépense de ${trimmedAmount} FCFA — ${trimmedDesc}`,
          targetRole: "TREASURIER",
          extraData: { transactionId: txId },
        })
        .catch(() => {});
    }

    navigate(`/transaction/${txId}`);
  };

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      await submitTransaction();
    } finally {
      submitLockRef.current = false;
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
        <h1 className="sr-only">Nouvelle transaction</h1>
        <TopHeader title="Nouvelle transaction" />
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
              onClick={() => navigate(-1)}
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
              <Wallet className="w-4 h-4 mr-2" /> Entrée
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
              <Wallet className="w-4 h-4 mr-2" /> Sortie
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
            <FormField
              label="Montant (FCFA)"
              error={fieldErrors.amount}
              helperText={fieldErrors.amount ? undefined : "Saisissez le montant en francs CFA"}
            >
              <IonInput
                ref={amountRef as any}
                type="number"
                inputMode="decimal"
                aria-label="Montant en francs CFA"
                aria-invalid={!!fieldErrors.amount}
                value={amount}
                onIonInput={(e) =>
                  handleAmountChange((e.detail.value as string) ?? "")
                }
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
            <FormField
              label="Description"
              helperText="Ex: Dîme du mois"
            >
              <IonInput
                type="text"
                aria-label="Description"
                value={description}
                onIonInput={(e) =>
                  setDescription((e.detail.value as string) ?? "")
                }
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
                  {caisses.map((c: any) => (
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
            <FormField label="Commentaire" helperText="Ajouter un commentaire...">
              <IonTextarea
                aria-label="Commentaire"
                value={comment}
                onIonInput={(e) =>
                  setComment((e.detail.value as string) ?? "")
                }
                placeholder="Ajouter un commentaire..."
                rows={3}
                className="w-full"
              />
            </FormField>
          </motion.div>

          {/* Preuve photo de la dépense (Sortie uniquement) */}
          {type === "EXPENSE" && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              transition={{ delay: 0.8 }}
              className="mb-6"
            >
              <MotionCard variant="flat" className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-text-primary">
                    Preuve de la dépense
                  </p>
                  {proofUploading && (
                    <span className="text-xs text-text-tertiary">Envoi…</span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary mb-3">
                  Prenez ou choisissez une photo pour attester la dépense
                  (reçu, facture, matériel…). Elle est archivée de manière
                  irrévocable.
                </p>

                {proofPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {proofPhotos.map((p, i) => (
                      <div
                        key={i}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-border"
                      >
                        <img
                          src={URL.createObjectURL(p)}
                          alt={`Preuve ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProofPhotos((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "var(--scrim)" }}
                          aria-label={`Supprimer la preuve ${i + 1}`}
                        >
                          <X className="w-3 h-3 text-on-accent" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <label
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-center cursor-pointer flex items-center justify-center gap-2 border border-border bg-surface text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Prendre une photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setProofPhotos((prev) => [...prev, f]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-center cursor-pointer flex items-center justify-center gap-2 border border-border bg-surface text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Depuis la galerie
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length)
                          setProofPhotos((prev) => [...prev, ...files]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {!isOnline && proofPhotos.length === 0 && (
                  <p className="text-xs text-text-tertiary mt-2">
                    Hors ligne : la photo ne pourra pas être envoyée avant
                    reconnexion.
                  </p>
                )}
              </MotionCard>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              className="mb-6"
            >
              <MotionCard variant="flat" className="p-4 text-center">
                <p className="text-text-primary text-sm text-center">
                  {error}
                </p>
              </MotionCard>
            </motion.div>
          )}

          <IonButton
            expand="block"
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              "py-4 rounded-2xl text-sm font-semibold shadow-fab",
              type === "INCOME" ? "bg-accent-primary text-on-accent" : "bg-destructive text-on-accent",
            )}
          >
            {submitting ? (
              <>
                <IonSpinner name="lines" style={{ marginRight: 6 }} />
                Enregistrement…
              </>
            ) : (
              "Enregistrer la transaction"
            )}
          </IonButton>
        </div>
        <BottomNav />
      </IonContent>
    </IonPage>
  );
}
