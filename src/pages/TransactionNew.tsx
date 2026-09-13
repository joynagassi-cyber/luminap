import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  useTransactions,
  useCategories,
  useCaisses,
  useEvents,
  addTransactionPS,
  addDocumentPS,
} from "@/lib/dataLayer";
import { uploadLuminaFile } from "@/lib/storageService";
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
import { useOnlineStatus } from "@/lib/dataLayer";
import { policy } from "@/capabilities/policy";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
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
  const preselectedEvent = (location.state as any)?.eventId || "";

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

  const handleSubmit = async () => {
    const trimmedAmount = amount.trim();
    const trimmedDesc = description.trim();
    const trimmedCatId = categoryId?.toString().trim();

    if (!trimmedAmount || !trimmedDesc || !trimmedCatId) {
      setError("Veuillez remplir tous les champs obligatoires");
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
    const txId = await addTransactionPS({
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

    // Preuves de la dépense : montée des photos dans le bucket privé
    // `expense_proofs` + métadonnée `documents` (liée à la transaction).
    if (isExpense && proofPhotos.length > 0) {
      setProofUploading(true);
      try {
        for (const photo of proofPhotos) {
          const path = await uploadLuminaFile(
            "expense_proofs",
            photo,
            txId,
          );
          await addDocumentPS({
            title: `Preuve de dépense — ${trimmedDesc}`,
            purpose: "Attestation irréfutable de la dépense",
            bucket: "expense_proofs",
            file_path: path,
            file_size: photo.size,
            mime_type: photo.type || "image/*",
            entity_type: "EXPENSE_PROOF",
            entity_id: txId,
            status: "ACTIVE",
            uploaded_by: sessionId,
          });
        }
        setProofPhotos([]);
      } catch {
        // Hors ligne / refus du bucket : la transaction est déjà créée,
        // la preuve restera accessible une fois rebranché.
        setError(
          "Transaction enregistrée. L'envoi de la photo a échoué (hors ligne ?). La preuve pourra être relancée depuis le détail.",
        );
        setProofPhotos([]);
      } finally {
        setProofUploading(false);
      }
    }

    navigate(`/transaction/${txId}`);
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="h-screen bg-canvas flex flex-col overflow-hidden">
          <TopHeader title="Nouvelle transaction" />
          <div className="flex-1 overflow-y-auto px-5 pt-16 pb-28">
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
                  backgroundColor: type === "INCOME" ? "#1DB954" : "#212121",
                  color: type === "INCOME" ? "#fff" : "#B3B3B3",
                }}
              >
                Entrée
              </button>
              <button
                onClick={() => setType("EXPENSE")}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: type === "EXPENSE" ? "#E51332" : "#212121",
                  color: type === "EXPENSE" ? "#fff" : "#B3B3B3",
                }}
              >
                Sortie
              </button>
            </div>

            {/* Amount */}
            <div className="mb-5">
              <label className="text-text-tertiary text-xs mb-2 block">
                Montant (FCFA)
              </label>
              <IonInput
                type="number"
                value={amount}
                onIonChange={(e) =>
                  handleAmountChange((e.detail.value as string) ?? "")
                }
                placeholder="0"
                style={{
                  backgroundColor: "#212121",
                  color: "#fff",
                  border: fieldErrors.amount
                    ? "1px solid #E51332"
                    : "1px solid #282828",
                }}
              />
              {fieldErrors.amount && (
                <p className="text-[#E51332] text-xs mt-1">
                  {fieldErrors.amount}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="text-text-tertiary text-xs mb-2 block">
                Description
              </label>
              <IonInput
                type="text"
                value={description}
                onIonChange={(e) =>
                  setDescription((e.detail.value as string) ?? "")
                }
                placeholder="Ex: Dîme du mois"
                style={{
                  backgroundColor: "#212121",
                  color: "#fff",
                  border: "1px solid #282828",
                }}
              />
            </div>

            {/* Date */}
            <div className="mb-5">
              <label className="text-text-tertiary text-xs mb-2 block">
                Date
              </label>
              <IonInput
                type="date"
                value={date}
                onIonChange={(e) => setDate((e.detail.value as string) ?? "")}
                style={{
                  backgroundColor: "#212121",
                  color: "#fff",
                  border: "1px solid #282828",
                }}
              />
            </div>

            {/* Category */}
            <div className="mb-5">
              <label className="text-text-tertiary text-xs mb-2 block">
                Catégorie
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm "
                style={{
                  backgroundColor: "#212121",
                  color: "#fff",
                  border: "1px solid #282828",
                }}
              >
                <option value="">Sélectionner une catégorie</option>
                {filteredCategories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label_fr || cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div className="mb-5">
              <label className="text-text-tertiary text-xs mb-2 block">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl text-sm "
                style={{
                  backgroundColor: "#212121",
                  color: "#fff",
                  border: "1px solid #282828",
                }}
              >
                <option value="CAISSE">Caisse</option>
                <option value="COTISATION">Cotisation</option>
                <option value="PERSONNE">Personne</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>

            {/* Caisse */}
            {source === "CAISSE" && (
              <div className="mb-5">
                <label className="text-text-tertiary text-xs mb-2 block">
                  Caisse
                </label>
                <select
                  value={sourceCaisseId}
                  onChange={(e) => setSourceCaisseId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm "
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: "1px solid #282828",
                  }}
                >
                  {caisses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Person name */}
            {source === "PERSONNE" && (
              <div className="mb-5">
                <label className="text-text-tertiary text-xs mb-2 block">
                  Nom de la personne
                </label>
                <IonInput
                  type="text"
                  value={personName}
                  onIonChange={(e) =>
                    setPersonName((e.detail.value as string) ?? "")
                  }
                  placeholder="Nom de la personne"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: "1px solid #282828",
                  }}
                />
              </div>
            )}

            {/* Event */}
            <div className="mb-5">
              <label className="text-text-tertiary text-xs mb-2 block">
                Événement (optionnel)
              </label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm "
                style={{
                  backgroundColor: "#212121",
                  color: "#fff",
                  border: "1px solid #282828",
                }}
              >
                <option value="">Aucun événement</option>
                {events.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="text-text-tertiary text-xs mb-2 block">
                Commentaire (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm  resize-none"
                style={{
                  backgroundColor: "#212121",
                  color: "#fff",
                  border: "1px solid #282828",
                }}
              />
            </div>

            {/* Preuve photo de la dépense (Sortie uniquement) */}
            {type === "EXPENSE" && (
              <div className="mb-6 rounded-xl p-4"
                style={{ backgroundColor: "#1e1e1e", border: "1px solid #282828" }}
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
                {proofPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {proofPhotos.map((p, i) => (
                      <div
                        key={i}
                        className="relative w-20 h-20 rounded-lg overflow-hidden"
                        style={{ border: "1px solid #282828" }}
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
                          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
                          aria-label={`Supprimer la preuve ${i + 1}`}
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <label
                    className="flex-1 py-2.5 rounded-full text-sm font-medium text-center cursor-pointer flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: "#282828",
                      color: "#fff",
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
                      backgroundColor: "#282828",
                      color: "#fff",
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
                  <p className="text-xs text-[#FFB800] mt-2">
                    Hors ligne : la photo ne pourra pas être envoyée avant
                    reconnexion.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div
                className="mb-4 p-3 rounded-xl text-sm text-center"
                style={{ backgroundColor: "#E5133220", color: "#E51332" }}
              >
                {error}
              </div>
            )}

            <IonButton
              expand="block"
              onClick={handleSubmit}
              style={{
                backgroundColor: type === "INCOME" ? "#1DB954" : "#E51332",
              }}
            >
              Enregistrer la transaction
            </IonButton>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
