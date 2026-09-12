import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCategories, useCaisses, useMembers, addEventPS } from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";
import { ArrowLeft, Plus, X, Tag } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import DatePicker from "@/components/DatePicker";
import { generateId, formatCurrencyCompact } from "@/lib/utils";
import type { BudgetItem } from "@/types";
import { getOrganizationId } from "@/lib/orgContext";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonInput,
  IonButton,
} from "@ionic/react";

const DEFAULT_BUDGET_ITEMS = [
  { label: "Dîme", categoryId: "cat-dime", allocated: 0 },
  { label: "Offrande", categoryId: "cat-offrande", allocated: 0 },
  {
    label: "Offrande Mission",
    categoryId: "cat-offrande-mission",
    allocated: 0,
  },
  { label: "Salaire Pasteur", categoryId: "cat-salaire-pasteur", allocated: 0 },
  {
    label: "Frais de Fonctionnement",
    categoryId: "cat-frais-fonc",
    allocated: 0,
  },
  { label: "Mission", categoryId: "cat-mission", allocated: 0 },
  { label: "Entretien", categoryId: "cat-entretien", allocated: 0 },
  { label: "Aumône", categoryId: "cat-aumone", allocated: 0 },
];

export default function EventNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: members } = useMembers();
  const createCulte = useLocalStore((s) => s.createCulte);

  // PowerSync with fallback
  const { data: psCategories } = useCategories();
  const { data: psCaisses } = useCaisses();

  const categories = psCategories ?? [];
  const caisses = psCaisses ?? [];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"PLANIFIED" | "ONGOING">("PLANIFIED");
  const [eventType, setEventType] = useState<"EVENT" | "CULTE">(
    location.state?.defaultType === "CULTE" ? "CULTE" : "EVENT",
  );
  const [montantCotisation, setMontantCotisation] = useState("");
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [showBudget, setShowBudget] = useState(false);
  const [newBudgetLabel, setNewBudgetLabel] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [newBudgetFundedBy, setNewBudgetFundedBy] = useState("main");
  const [error, setError] = useState("");

  const totalBudget = budgetItems.reduce((s, i) => s + i.allocated, 0);

  const handleAddDefaultBudget = (item: (typeof DEFAULT_BUDGET_ITEMS)[0]) => {
    const existing = budgetItems.find((b) => b.label === item.label);
    if (existing) return;
    setBudgetItems((prev) => [
      ...prev,
      {
        id: generateId(),
        label: item.label,
        allocated: 0,
        spent: 0,
        fundedBy: "main",
        categoryId: item.categoryId,
        isCustom: false,
      },
    ]);
  };

  const handleAddBudget = () => {
    if (!newBudgetLabel.trim() || !newBudgetAmount) return;
    const item: BudgetItem = {
      id: generateId(),
      label: newBudgetLabel.trim(),
      allocated: Math.round(parseFloat(newBudgetAmount) * 100),
      spent: 0,
      fundedBy: newBudgetFundedBy,
      isCustom: true,
    };
    setBudgetItems((prev) => [...prev, item]);
    setNewBudgetLabel("");
    setNewBudgetAmount("");
  };

  const handleRemoveBudget = (id: string) =>
    setBudgetItems((prev) => prev.filter((i) => i.id !== id));

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }
    setError("");

    if (eventType === "CULTE") {
      // Le montant de cotisation est requis et doit être choisi par l'utilisateur.
      // L'UI le saisit en FCFA ; on convertit en cents (1 FCFA = 100 cents)
      // pour transmettre au service `createCulte`.
      const fcfa = parseFloat(montantCotisation);
      if (!Number.isFinite(fcfa) || fcfa <= 0) {
        setError("Le montant de cotisation est requis (en FCFA).");
        return;
      }
      const montantCents = Math.round(fcfa * 100);

      await createCulte({
        name: name.trim(),
        startDate,
        montantCotisationCents: montantCents,
      });
      navigate("/cotisations");
      return;
    }

    await addEventPS({
      org_id: getOrganizationId(),
      name: name.trim(),
      description: description.trim(),
      start_date: startDate,
      end_date: endDate || null,
      status,
      type: "EVENT",
      budget: totalBudget,
      budget_items: JSON.stringify(budgetItems),
    });
    navigate("/events");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/events" />
          </IonButtons>
          <IonTitle>Nouvel événement</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-canvas" fullscreen>
        <div className="max-w-lg mx-auto px-5 pb-32 pt-4">
          {error && (
            <div
              className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{ backgroundColor: "#E5133220", color: "#E51332" }}
            >
              {error}
            </div>
          )}

          {/* Type selector */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setEventType("EVENT")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${eventType === "EVENT" ? "text-white" : "text-text-tertiary"}`}
              style={
                eventType === "EVENT"
                  ? { backgroundColor: "var(--accent-primary)" }
                  : { backgroundColor: "#212121" }
              }
            >
              Événement
            </button>
            <button
              onClick={() => setEventType("CULTE")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${eventType === "CULTE" ? "text-white" : "text-text-tertiary"}`}
              style={
                eventType === "CULTE"
                  ? { backgroundColor: "var(--accent-primary)" }
                  : { backgroundColor: "#212121" }
              }
            >
              Culte dominical
            </button>
          </div>

          {/* Cotisation settings (only for cultes) */}
          {eventType === "CULTE" && (
            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "#212121" }}
            >
              <p className="text-text-tertiary text-xs font-medium mb-3 uppercase tracking-wider">
                Paramètres de cotisation
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-text-tertiary text-xs mb-1.5 block">
                    Montant obligatoire (FCFA) *
                  </label>
                  <IonInput
                    type="number"
                    value={montantCotisation}
                    onIonChange={(e) =>
                      setMontantCotisation((e.detail.value as string) ?? "")
                    }
                    min="0"
                    style={{
                      backgroundColor: "#181818",
                      border: "1px solid #282828",
                    }}
                  />
                </div>
              </div>
              <p className="text-text-tertiary text-xs mt-2">
                {members.filter((m) => m.status === "ACTIVE").length} membre
                {members.filter((m) => m.status === "ACTIVE").length !== 1
                  ? "s"
                  : ""}{" "}
                actif
                {members.filter((m) => m.status === "ACTIVE").length !== 1
                  ? "s"
                  : ""}{" "}
                — des cotisations seront créées automatiquement
              </p>
            </div>
          )}

          {/* Name */}
          <div className="mb-5">
            <label className="text-text-tertiary text-xs mb-2 block">
              Nom de l'événement *
            </label>
            <IonInput
              type="text"
              value={name}
              onIonChange={(e) => setName((e.detail.value as string) ?? "")}
              placeholder="Ex: Noël 2026"
              style={{
                backgroundColor: "#212121",
                color: "#fff",
                border: "1px solid #282828",
              }}
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="text-text-tertiary text-xs mb-2 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'événement..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none"
              style={{
                backgroundColor: "#212121",
                color: "#fff",
                border: "1px solid #282828",
              }}
            />
          </div>

          {/* Dates */}
          <div className="mb-5">
            <label className="text-text-tertiary text-xs mb-2 block">
              Date de début *
            </label>
            <IonInput
              type="date"
              value={startDate}
              onIonChange={(e) =>
                setStartDate((e.detail.value as string) ?? "")
              }
              style={{
                backgroundColor: "#212121",
                color: "#fff",
                border: "1px solid #282828",
              }}
            />
          </div>

          <div className="mb-5">
            <label className="text-text-tertiary text-xs mb-2 block">
              Date de fin (optionnel)
            </label>
            <IonInput
              type="date"
              value={endDate}
              onIonChange={(e) => setEndDate((e.detail.value as string) ?? "")}
              style={{
                backgroundColor: "#212121",
                color: "#fff",
                border: "1px solid #282828",
              }}
            />
          </div>

          {/* Status */}
          <div className="mb-5">
            <label className="text-text-tertiary text-xs mb-2 block">
              Statut
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: "#212121",
                color: "#fff",
                border: "1px solid #282828",
              }}
            >
              <option value="PLANIFIED">Planifié</option>
              <option value="ONGOING">En cours</option>
            </select>
          </div>

          {/* Budget */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-text-tertiary text-xs font-medium">
                Budget
              </label>
              <button
                onClick={() => setShowBudget(!showBudget)}
                className="text-xs font-medium"
                style={{ color: "var(--accent-primary)" }}
              >
                {showBudget ? "Masquer" : "Gérer le budget"}
              </button>
            </div>

            {showBudget && (
              <div className="space-y-3 mb-4">
                {/* Default budget items */}
                <div className="space-y-2">
                  {DEFAULT_BUDGET_ITEMS.map((item) => {
                    const existing = budgetItems.find(
                      (b) => b.label === item.label,
                    );
                    if (existing) return null;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleAddDefaultBudget(item)}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all active:scale-95"
                        style={{
                          backgroundColor: "#181818",
                          border: "1px solid #282828",
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom budget item */}
                <div className="flex gap-2">
                  <IonInput
                    type="text"
                    value={newBudgetLabel}
                    onIonChange={(e) =>
                      setNewBudgetLabel((e.detail.value as string) ?? "")
                    }
                    placeholder="Poste"
                    style={{
                      backgroundColor: "#181818",
                      color: "#fff",
                      border: "1px solid #282828",
                    }}
                  />
                  <IonInput
                    type="number"
                    value={newBudgetAmount}
                    onIonChange={(e) =>
                      setNewBudgetAmount((e.detail.value as string) ?? "")
                    }
                    placeholder="Montant"
                    style={{
                      backgroundColor: "#181818",
                      color: "#fff",
                      border: "1px solid #282828",
                    }}
                  />
                  <button
                    onClick={handleAddBudget}
                    className="px-4 py-3 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: "var(--accent-primary)", color: "#fff" }}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Budget items list */}
                {budgetItems.length > 0 && (
                  <div className="space-y-2">
                    {budgetItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ backgroundColor: "#181818" }}
                      >
                        <div>
                          <p className="text-text-primary text-sm font-medium">
                            {item.label}
                          </p>
                          <p className="text-text-tertiary text-xs">
                            {formatCurrencyCompact(item.allocated)} F
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveBudget(item.id)}
                          className="p-1 rounded-full"
                          style={{ backgroundColor: "#E5133220" }}
                        >
                          <X className="w-4 h-4" style={{ color: "#E51332" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Total budget */}
            {budgetItems.length > 0 && (
              <div
                className="p-4 rounded-xl text-center"
                style={{
                  backgroundColor: "#212121",
                  border: "1px solid color-mix(in srgb, var(--accent-primary) 19%, transparent)",
                }}
              >
                <p className="text-text-tertiary text-xs">Budget total</p>
                <p className="text-text-primary font-bold text-lg">
                  {formatCurrencyCompact(totalBudget)} F
                </p>
              </div>
            )}
          </div>

          <IonButton
            onClick={handleSubmit}
            expand="block"
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            Créer l'événement
          </IonButton>
        </div>
        <BottomNav />
      </IonContent>
    </IonPage>
  );
}
