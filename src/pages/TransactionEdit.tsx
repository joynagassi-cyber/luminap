import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useTransactions,
  useCategories,
  useOrgUnits,
  useEvents,
  useAccounts,
  updateTransactionPS,
} from "@/lib/dataLayer";
import { ArrowUpRight, ArrowDownRight, X, Wallet, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

export default function TransactionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // PowerSync with fallback
  const { data: psTransactions } = useTransactions();
  const { data: psCategories } = useCategories();
  const { data: psEvents } = useEvents();
  const { data: psOrgUnits } = useOrgUnits();
  const { data: psAccounts } = useAccounts();

  const transactions = psTransactions ?? [];
  const categories = psCategories ?? [];
  const events = psEvents ?? [];
  const orgUnits = psOrgUnits ?? [];

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

  useEffect(() => {
    const tx = transactions.find((t: any) => t.id === id);
    if (!tx) return;
    // Immunité: approved transactions cannot be edited
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
      setSourceCaisseId((tx as any).source_caisse_id || (tx as any).sourceCaisseId || "main");
      setSource((tx as any).source || "CAISSE");
      setPersonName((tx as any).person_name || (tx as any).personName || "");
      setEventId((tx as any).event_id || (tx as any).eventId || "");
      setCompensatesFor((tx as any).compensates_for || (tx as any).compensatesFor || "");
      setComment((tx as any).comment || "");
    }
  }, [id, transactions]);

  const filteredCategories = categories.filter((c: any) => c.type === type);

  const handleOrgUnitChange = (ouId: string) => {
    setOrgUnitId(ouId);
    if (ouId) {
      const account = psAccounts.find((a: any) => a.id === ouId);
      if (account) setSourceCaisseId(account.id);
    } else {
      setSourceCaisseId("main");
    }
  };

  const handleSubmit = async () => {
    const trimmedAmount = amount?.toString().trim();
    const trimmedDesc = description?.trim();
    const trimmedCatId = categoryId?.toString().trim();
    if (!trimmedAmount || !trimmedDesc || !trimmedCatId) return;
    await updateTransactionPS(id!, {
      type,
      amount: Math.round(parseFloat(amount) * 100),
      description,
      date,
      category_id: categoryId,
      org_unit_id: orgUnitId || null,
      source_caisse_id: sourceCaisseId,
      source,
      person_name: source === "PERSONNE" ? personName || null : null,
      event_id: eventId || null,
      compensates_for: compensatesFor || null,
      comment: comment || null,
    });
    navigate(`/transaction/${id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>TransactionEdit</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="h-screen bg-canvas flex flex-col overflow-hidden">
          <TopHeader title="Modifier" />
          <div className="flex-1 overflow-y-auto px-5 pt-16 pb-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-text-secondary text-sm"
                aria-label="Retour"
              >
                <ArrowUpRight className="w-4 h-4 rotate-180" /> Retour
              </button>
              <h1 className="text-text-primary font-bold text-lg">Modifier</h1>
              <div className="w-16" />
            </div>

            <div className="space-y-4">
              <div
                className="flex rounded-xl p-1"
                style={{ backgroundColor: "#212121" }}
              >
                <button
                  onClick={() => setType("INCOME")}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={
                    type === "INCOME"
                      ? { backgroundColor: "#1DB954", color: "#fff" }
                      : { color: "#B3B3B3" }
                  }
                  aria-label="Entrée"
                >
                  Entrée
                </button>
                <button
                  onClick={() => setType("EXPENSE")}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={
                    type === "EXPENSE"
                      ? { backgroundColor: "#E51332", color: "#fff" }
                      : { color: "#B3B3B3" }
                  }
                  aria-label="Sortie"
                >
                  Sortie
                </button>
              </div>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl text-lg font-bold outline-none text-center"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: "1px solid #282828",
                  }}
                />
              </div>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description de la transaction"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: "1px solid #282828",
                  }}
                />
              </div>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: "1px solid #282828",
                  }}
                />
              </div>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Catégorie
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
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

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
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

              {source === "PERSONNE" && (
                <div>
                  <label className="text-text-tertiary text-xs mb-2 block">
                    Nom de la personne
                  </label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="Nom de la personne"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: "#212121",
                      color: "#fff",
                      border: "1px solid #282828",
                    }}
                  />
                </div>
              )}

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Événement (optionnel)
                </label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
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

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: "1px solid #282828",
                  }}
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95"
                style={{
                  backgroundColor: type === "INCOME" ? "#1DB954" : "#E51332",
                }}
                aria-label="Sauvegarder la transaction"
              >
                Sauvegarder
              </button>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
