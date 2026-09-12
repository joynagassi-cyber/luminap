import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  useTransactions,
  useCategories,
  useCaisses,
  useEvents,
  addTransactionPS,
} from "@/lib/dataLayer";
import { ArrowLeft, Wallet, Calendar } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { generateId } from "@/lib/utils";
import { getOrganizationId } from "@/lib/orgContext";
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
  const preselectedType = (location.state as any)?.type || "";
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
    await addTransactionPS({
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
    });
    navigate("/");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Nouvelle transaction</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="h-screen bg-canvas flex flex-col overflow-hidden">
          <TopHeader title="Nouvelle transaction" />
          <div className="flex-1 overflow-y-auto px-5 pt-16 pb-6">
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
