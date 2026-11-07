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
import { showError } from "@/utils/toast";
import {
  ArrowLeft,
  Wallet,
  Calendar,
  Camera,
  ImagePlus,
  X,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import LuField from "@/design-system/components/LuField";
import LuSegmented from "@/design-system/components/LuSegmented";
import LuAmount from "@/design-system/components/LuAmount";
import LuCard from "@/design-system/components/LuCard";
import TopHeader from "@/components/TopHeader";
import { generateId } from "@/lib/utils";
import { getOrganizationId } from "@/lib/orgContext";
import { getCurrentActorId } from "@/lib/auth";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { haptics } from "@/lib/haptics";
import { useOnlineStatus } from "@/lib/dataLayer";
import { policy } from "@/capabilities/policy";
import { notification } from "@/capabilities/notification";
import { periodLockMessage } from "@/lib/periodLock";
import { parseAmountToCents } from "@/lib/amountInput";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonInput,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from "@ionic/react";
import { TrendingUp, TrendingDown, Building2 } from "lucide-react";

export default function TransactionNew() {
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedCaisse = (location.state as any)?.caisseId || "";
  const preselectedType =
    new URLSearchParams(location.search).get("type") ||
    (location.state as any)?.type ||
    "";
  const preselectedEvent =
    new URLSearchParams(location.search).get("eventId") ||
    (location.state as any)?.eventId ||
    "";

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
    if (!val.trim()) return "";
    const cents = parseAmountToCents(val);
    if (cents === null || cents <= 0) return "Le montant doit être supérieur à 0";
    if (cents > 999999999 * 100) return "Montant maximum atteint";
    return "";
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const err = validateAmount(val);
    setFieldErrors((prev) => ({ ...prev, amount: err }));
  };

  const filteredCategories = categories.filter((c: any) => c.type === type);

  const lastTypeRef = useRef(type);
  useEffect(() => {
    const typeChanged = lastTypeRef.current !== type;
    lastTypeRef.current = type;
    if (typeChanged || !categoryId) {
      setCategoryId(filteredCategories[0]?.id ?? "");
    }
  }, [type, categoryId, filteredCategories]);

  const submitTransaction = async () => {
    const trimmedAmount = amount.trim();
    const trimmedDesc = description.trim();
    const trimmedCatId = categoryId?.toString().trim();

    if (!trimmedAmount || !trimmedCatId) {
      setError("Veuillez remplir les champs obligatoires (montant, catégorie)");
      if (!trimmedAmount) {
        setTimeout(() => amountRef.current?.focus?.(), 0);
      }
      return;
    }
    setError("");
    const actorId = getCurrentActorId();
    const isExpense = type === "EXPENSE";
    const status = isExpense ? "PENDING" : "APPROVED";

    const safeDescription =
      trimmedDesc ||
      (categories.find((c: any) => c.id === trimmedCatId) as any)?.label_fr ||
      (categories.find((c: any) => c.id === trimmedCatId) as any)?.label ||
      "Transaction";

    const amountCents = parseAmountToCents(trimmedAmount);
    if (amountCents === null) {
      setError("Veuillez entrer un montant valide");
      return;
    }
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
        amount: amountCents,
        description: safeDescription,
        date,
        status,
        category_id: categoryId,
        org_unit_id: null,
        source_caisse_id: sourceCaisseId || "main",
        event_id: eventId || null,
        source: source || "CAISSE",
        person_name: source === "PERSONNE" ? personName || null : null,
        compensates_for: null,
        comment: comment || null,
        created_by_id: actorId,
        approved_by_id: status === "APPROVED" ? actorId : null,
        approved_at: status === "APPROVED" ? new Date().toISOString() : null,
        versement_id: null,
        reversal_of_id: null,
        cotisation_id: null,
      });
    } catch (e) {
      setSubmitting(false);
      haptics.error();
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
          await addReceipt(txId, photo, { uploadedBy: actorId });
        }
        setProofPhotos([]);
      } catch {
        setError(
          "Transaction enregistrée. L'envoi de la photo a échoué (hors ligne ?). La preuve pourra être relancée depuis le détail.",
        );
        showError(
          "Transaction enregistrée, mais la photo n'a pas pu être envoyée. Rattachez-la depuis le détail (section Justificatifs).",
        );
        setProofPhotos([]);
      } finally {
        setProofUploading(false);
      }
    }

    setSubmitting(false);

    if (isExpense && status === "PENDING") {
      notification.sendNotification({
        actionType: "TRANSACTION_PENDING",
        title: "Transaction en attente d'approbation",
        message: `Nouvelle dépense de ${trimmedAmount} FCFA — ${safeDescription}`,
        targetRole: "TREASURIER",
        extraData: { transactionId: txId },
      }).catch(() => {});
    }

    haptics.success();
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
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            {/* Type selector (LuSegmented) */}
            <div className="mb-5">
              <LuSegmented
                options={[
                  { value: "INCOME", label: "Entrée", icon: <TrendingUp className="w-4 h-4" /> },
                  { value: "EXPENSE", label: "Sortie", icon: <TrendingDown className="w-4 h-4" /> },
                ]}
                value={type}
                onChange={(val) => setType(val as "INCOME" | "EXPENSE")}
                variant="signed"
                aria-label="Type de transaction"
              />
            </div>

            {/* Amount field (LuField + LuAmount) */}
            <div className="mb-5">
              <LuField
                label="Montant (XOF)"
                value={amount}
                onChange={handleAmountChange}
                error={fieldErrors.amount || ""}
                helper="Entrez le montant en unités majeures (ex: 142830)"
                placeholder="0"
                inputMode="numeric"
                type="text"
                trailing={<span className="text-text-muted">XOF</span>}
              />
              {/* Optional display preview */}
              {amount && !fieldErrors.amount && (
                <div className="mt-2">
                  <LuAmount
                    amount={parseInt(amount.replace(/ /g, ""), 10) || 0}
                    currency="XOF"
                    size="body"
                    signed={type === "EXPENSE"}
                    style={{ color: type === "EXPENSE" ? "var(--lu-expense)" : "var(--lu-income)" }}
                  />
                </div>
              )}
            </div>

            {/* Category selector (LuField) */}
            <div className="mb-5">
              <LuField
                label="Catégorie"
                value={(categories.find((c: any) => c.id === categoryId) as any)?.label_fr || (categories.find((c: any) => c.id === categoryId) as any)?.label || ""}
                onChange={() => {}} // Trigger category picker (simplified for preview)
                placeholder="Sélectionner une catégorie"
                trailing={<Calendar className="w-4 h-4 text-text-muted" />}
                readOnly
              />
            </div>

            {/* Caisse selector (LuField) */}
            <div className="mb-5">
              <LuField
                label="Caisse"
                value={caisses.find(c => c.id === sourceCaisseId)?.name || ""}
                onChange={() => {}} // Trigger caisse picker (simplified for preview)
                placeholder="Sélectionner une caisse"
                trailing={<Building2 className="w-4 h-4 text-text-muted" />}
                readOnly
              />
            </div>

            {/* Description (LuField) */}
            <div className="mb-5">
              <LuField
                label="Description"
                value={description}
                onChange={(val) => setDescription(val)}
                placeholder="Détails de la transaction"
                trailing={<Calendar className="w-4 h-4 text-text-muted" />}
              />
            </div>

            {/* Date (LuField) */}
            <div className="mb-5">
              <LuField
                label="Date"
                value={date}
                onChange={(val) => setDate(val)}
                type="date"
                placeholder="AAAA-MM-JJ"
                trailing={<Calendar className="w-4 h-4 text-text-muted" />}
              />
            </div>

            {/* Receipt image (LuCard tile for action) */}
            {proofPhotos.length > 0 && (
              <div className="mb-5">
                <LuCard variant="tile" label="Preuve" icon={<Camera className="w-4 h-4" />} onClick={() => {}}>
                  <div className="flex flex-wrap gap-2">
                    {proofPhotos.map((p, i) => (
                      <img
                        key={i}
                        src={URL.createObjectURL(p)}
                        alt={`Preuve ${i + 1}`}
                        className="w-20 h-20 rounded-lg object-cover border border-border"
                      />
                    ))}
                  </div>
                </LuCard>
              </div>
            )}

            {error && (
              <div
                className="mb-4 p-3 rounded-xl text-sm text-center"
                style={{ backgroundColor: "color-mix(in srgb, var(--lu-expense) 12%, transparent)", color: "var(--lu-expense)" }}
              >
                {error}
              </div>
            )}

            {/* Bouton HTML natif */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-full font-semibold text-on-accent text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--lu-accent)" }}
            >
              {submitting ? (
                <>
                  <IonSpinner name="lines" style={{ width: 18, height: 18 }} />
                  Enregistrement…
                </>
              ) : (
                "Enregistrer la transaction"
              )}
            </button>
          </div>
          <BottomNav />
      </IonContent>
    </IonPage>
  );
}
