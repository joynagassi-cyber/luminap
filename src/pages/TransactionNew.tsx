import { useState, useEffect, useRef, useMemo } from "react";
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
import FormField from "@/components/FormField";
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

export default function TransactionNew() {
  const navigate = useNavigate();
  const location = useLocation();

  const preselectedCaisse = (location.state as any)?.caisseId || "";
  // Le type arrive en priorité par query param (`?type=`) : fiable à travers
  // le routeur Ionic (le `location.state` de React Router n'est pas préservé
  // entre les vues de l'IonRouterOutlet). Fallback sur location.state.
  const preselectedType =
    new URLSearchParams(location.search).get("type") ||
    (location.state as any)?.type ||
    "";
  const preselectedEvent =
    new URLSearchParams(location.search).get("eventId") ||
    (location.state as any)?.eventId ||
    "";

  // PowerSync with fallback
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
  // Photos de preuve de dépense (montées dans le bucket `expense_proofs`).
  const [proofPhotos, setProofPhotos] = useState<File[]>([]);
  const [proofUploading, setProofUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Aperçus des preuves : une URL d'objet par fichier, créée UNE fois par
  // fichier (sinon `URL.createObjectURL` s'exécute à chaque render — donc à
  // chaque frappe — et fuit un blob en WebView). Révocation à l'ajout/retrait.
  const proofPhotoUrls = useMemo(
    () =>
      proofPhotos.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [proofPhotos],
  );
  useEffect(
    () => () => proofPhotoUrls.forEach(({ url }) => URL.revokeObjectURL(url)),
    [proofPhotoUrls],
  );
  const amountRef = useRef<any>(null);
  // Garde SYNCHRONE anti double-soumission : `submitting` (état React) n'est
  // appliqué qu'APRÈS le re-rendu, donc deux clics rapprochés sur un appareil
  // lent peuvent appeler `addTransactionPS` deux fois — un enregistrement
  // financier en double. Le verrou `ref` est posé avant tout `await`, donc
  // insensible au timing du re-rendu.
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

  // `categoryId` est initialisé depuis `categories[0]` AU PREMIER rendu. Or
  // `useCategories()` renvoie d'abord une liste vide (PowerSync pas encore
  // hydraté / repli store), donc arriver DIRECTEMENT sur /transaction/new
  // laissait `categoryId = ""` pour de bon : le champ obligatoire « Catégorie »
  // restait vide même après saisie du montant et de la description, et
  // `handleSubmit` refusait silencieusement l'enregistrement
  // (« Veuillez remplir tous les champs obligatoires »). On rattrape donc
  // l'arrivée asynchrone des catégories — sans écraser un choix explicite.
  //
  // Le choix explicite ne vaut que POUR LE TYPE courant : basculer Entrée↔Sortie
  // change la liste des catégories, donc la catégorie sélectionnée n'existe plus
  // et il faut reprendre la 1re du nouveau type (sinon on enregistre une
  // transaction dont la catégorie n'appartient pas à son type).
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

    // Montant et catégorie sont réellement obligatoires (colonnes NOT NULL) ;
    // la DESCRIPTION ne l'est pas : un mouvement se décrit de lui-même par sa
    // catégorie et son montant. On ne bloque donc plus l'enregistrement quand
    // elle est vide (l'utilisateur devait inventer un texte pour « Dîme »).
    if (!trimmedAmount || !trimmedCatId) {
      setError("Veuillez remplir les champs obligatoires (montant, catégorie)");
      // Focus le premier champ manquant (montant) pour l'utilisateur clavier.
      if (!trimmedAmount) {
        setTimeout(() => amountRef.current?.focus?.(), 0);
      }
      return;
    }
    setError("");
    const actorId = getCurrentActorId();
    const isExpense = type === "EXPENSE";
    // Statut dérivé du type, calculé UNE fois. Avant, le code lisait `status`
    // (identifiant libre) qui se résolvait en réalité sur `window.status`
    // (toujours "") : la comparaison `status === "PENDING"` était donc toujours
    // fausse et la notification « dépense en attente d'approbation » n'était
    // JAMAIS envoyée aux trésoriers — échec silencieux.
    //
    // Une ENTRÉE est constatée immédiatement (APPROVED) : l'argent reçu est
    // un fait, comme les cotisations (`cotisation-service` crée déjà en
    // APPROVED). La créer en DRAFT la rendait invisible partout — dashboard
    // (totaux APPROVED, « Derniers mouvements » APPROVED+PENDING), bilan et
    // rapports (APPROVED only) — sans aucun chemin d'approbation (le bouton
    // « Approuver » ne s'affichait que pour PENDING) : bug P0-1, revenus
    // perdus de vue dès la saisie. Une SORTIE reste PENDING : c'est elle
    // qui engage la caisse et attend le visa d'un trésorier.
    const status = isExpense ? "PENDING" : "APPROVED";

    // `transactions.description` est NOT NULL en base : une description vide
    // doit donc être remplacée par un repli lisible (la catégorie choisie),
    // jamais par NULL/''. On ne stocke pas un placeholder trompeur pour autant.
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
        // Entrée approuvée d'office à la saisie : tracer qui/quand, comme le
        // fait `approveTransactionPS` sur le chemin d'approbation manuel.
        approved_by_id: status === "APPROVED" ? actorId : null,
        approved_at: status === "APPROVED" ? new Date().toISOString() : null,
        versement_id: null,
        reversal_of_id: null,
        cotisation_id: null,
      });
    } catch (e) {
      // PR13 — période comptable close : message FR explicite, l'utilisateur
      // corrige la date ou demande la réouverture ; pas d'écran muet.
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

    // Justificatifs (PR9) : upload dans le bucket privé `expense_proofs` +
    // métadonnée `transaction_attachments` (synchronisée). `documents` n'a
    // aucun stream PowerSync : y déposer la preuve la rendait invisible.
    if (isExpense && proofPhotos.length > 0) {
      setProofUploading(true);
      try {
        for (const photo of proofPhotos) {
          await addReceipt(txId, photo, { uploadedBy: actorId });
        }
        setProofPhotos([]);
      } catch {
        // Hors ligne / refus du bucket : la transaction est déjà créée.
        // B-15 : le message doit survivre à la navigation vers le détail
        // qui suit — un simple `setError` sur cet écran démonté aussitôt
        // n'était jamais lu (preuve perdue en silence). Toast applicatif
        // (visible sur l'écran de détail, où `JustificatifsSection`
        // permet de rattacher la photo) + erreur locale conservée.
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

    // Notify the treasurers that a transaction is pending approval
    if (isExpense && status === "PENDING") {
      notification.sendNotification({
        actionType: "TRANSACTION_PENDING",
        title: "Transaction en attente d'approbation",
        message: `Nouvelle dépense de ${trimmedAmount} FCFA — ${safeDescription}`,
        targetRole: "TREASURIER",
        extraData: { transactionId: txId },
      }).catch(() => {});
    }

    // C-03 (A3) — retour haptique d'enregistrement (natif uniquement).
    haptics.success();
    navigate(`/transaction/${txId}`);
  };

  const handleSubmit = async () => {
    // Verrou synchrone : la 2e soumission concurrente sort immédiatement.
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

            {/* Type selector */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setType("INCOME")}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: type === "INCOME" ? "var(--in)" : "var(--surface)",
                  color: type === "INCOME" ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                Entrée
              </button>
              <button
                onClick={() => setType("EXPENSE")}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: type === "EXPENSE" ? "var(--out)" : "var(--surface)",
                  color: type === "EXPENSE" ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                Sortie
              </button>
            </div>

            {/* Amount — FormField : label AU-DESSUS du champ (bug P0-3 :
                l'ancien label flottant se superposait à la valeur) */}
            <FormField
              label="Montant (FCFA)"
              required
              error={fieldErrors.amount || undefined}
              errorId="tx-amount-error"
            >
              <IonInput
                ref={amountRef}
                type="text"
                inputMode="decimal"
                aria-label="Montant en francs CFA"
                aria-invalid={!!fieldErrors.amount}
                aria-describedby={fieldErrors.amount ? "tx-amount-error" : undefined}
                value={amount}
                onIonInput={(e) =>
                  handleAmountChange((e.detail.value as string) ?? "")
                }
                placeholder="0"
              />
            </FormField>

            {/* Description */}
            <FormField label="Description (optionnel)">
              <IonInput
                type="text"
                aria-label="Description"
                value={description}
                onIonInput={(e) =>
                  setDescription((e.detail.value as string) ?? "")
                }
                placeholder="Ex: Dîme du mois"
              />
            </FormField>

            {/* Date */}
            <FormField label="Date">
              <IonInput
                type="date"
                aria-label="Date"
                value={date}
                onIonInput={(e) => setDate((e.detail.value as string) ?? "")}
              />
            </FormField>

            {/* Category — interface alert : liste déroulante tactile lisible
                même avec beaucoup de catégories (bug P0-4) */}
            <FormField label="Catégorie" required>
              <IonSelect
                aria-label="Catégorie"
                interface="alert"
                interfaceOptions={{ header: "Catégorie" }}
                cancelText="Annuler"
                okText="Valider"
                value={categoryId}
                onIonChange={(e) => setCategoryId(e.detail.value)}
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

            {/* Source — 4 options : feuille d'action mobile */}
            <FormField label="Source">
              <IonSelect
                aria-label="Source"
                interface="action-sheet"
                cancelText="Annuler"
                value={source}
                onIonChange={(e) => setSource(e.detail.value as any)}
              >
                <IonSelectOption value="CAISSE">Caisse</IonSelectOption>
                <IonSelectOption value="COTISATION">
                  Cotisation
                </IonSelectOption>
                <IonSelectOption value="PERSONNE">Personne</IonSelectOption>
                <IonSelectOption value="AUTRE">Autre</IonSelectOption>
              </IonSelect>
            </FormField>

            {/* Caisse */}
            {source === "CAISSE" && (
              <FormField label="Caisse">
                <IonSelect
                  aria-label="Caisse"
                  interface="alert"
                  interfaceOptions={{ header: "Caisse" }}
                  cancelText="Annuler"
                  okText="Valider"
                  value={sourceCaisseId}
                  onIonChange={(e) => setSourceCaisseId(e.detail.value)}
                >
                  {caisses.map((c: any) => (
                    <IonSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </FormField>
            )}

            {/* Person name */}
            {source === "PERSONNE" && (
              <FormField label="Nom de la personne">
                <IonInput
                  type="text"
                  aria-label="Nom de la personne"
                  value={personName}
                  onIonInput={(e) =>
                    setPersonName((e.detail.value as string) ?? "")
                  }
                  placeholder="Nom de la personne"
                />
              </FormField>
            )}

            {/* Event */}
            <FormField label="Événement">
              <IonSelect
                aria-label="Événement"
                interface="alert"
                interfaceOptions={{ header: "Événement" }}
                cancelText="Annuler"
                okText="Valider"
                value={eventId}
                onIonChange={(e) => setEventId(e.detail.value)}
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

            {/* Comment */}
            <FormField label="Commentaire" className="mb-6">
              <IonTextarea
                aria-label="Commentaire"
                value={comment}
                onIonInput={(e) =>
                  setComment((e.detail.value as string) ?? "")
                }
                placeholder="Ajouter un commentaire..."
                rows={3}
              />
            </FormField>

            {/* Preuve photo de la dépense (Sortie uniquement) */}
            {type === "EXPENSE" && (
              <div className="mb-6 rounded-xl p-4"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-text-primary">
                    Preuve de la dépense
                  </p>
                  {proofUploading && (
                    <span className="text-xs text-text-tertiary">
                      Envoi...
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary mb-3">
                  Prenez ou choisissez une photo pour attester la dépense
                  (reçu, facture, matériel...). Elle est archivée de manière
                  irrévocable.
                </p>

                {/* Aperçus */}
                {proofPhotoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {proofPhotoUrls.map(({ url }, i) => (
                      <div
                        key={i}
                        className="relative w-20 h-20 rounded-lg overflow-hidden"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        <img
                          src={url}
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

                <div className="flex gap-2">
                  <label
                    className="flex-1 py-2.5 rounded-full text-sm font-medium text-center cursor-pointer flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: "var(--surface-hover)",
                      color: "var(--text-primary)",
                    }}
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
                    className="flex-1 py-2.5 rounded-full text-sm font-medium text-center cursor-pointer flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: "var(--surface-hover)",
                      color: "var(--text-primary)",
                    }}
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
                  <p className="text-xs text-pending mt-2">
                    Hors ligne : la photo ne pourra pas être envoyée avant
                    reconnexion.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div
                className="mb-4 p-3 rounded-xl text-sm text-center"
                style={{ backgroundColor: "color-mix(in srgb, var(--out) 12%, transparent)", color: "var(--out)" }}
              >
                {error}
              </div>
            )}

            {/* Bouton HTML natif (bug P2-6) : un IonButton garde son fond
                accent orange dans le shadow DOM — la couleur posée en
                `style` (vert/rouge selon le type) ne teintait que l'hôte
                et dépassait en artefact aux coins de la pilule. Fond
                accent de l'app pour les deux types : le sélecteur
                Entrée/Sortie porte déjà la sémantique de couleur. */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-full font-semibold text-on-accent text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: "var(--accent-primary)" }}
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
