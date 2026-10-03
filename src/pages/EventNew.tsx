// Fixed: Capacitor — keyboard-avoidance on the form page (Android/iOS hardware keyboard)
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCategories, useCaisses, useMembers, addEventPS } from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { ArrowLeft, Plus, X, Tag } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import DatePicker from "@/components/DatePicker";
import { generateId, formatCurrencyCompact } from "@/lib/utils";
import type { BudgetItem, Event } from "@/types";
import { getOrganizationId } from "@/lib/orgContext";
import { notification } from "@/capabilities/notification";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonInput,
  IonTextarea,
  IonButton,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonChangeCustomEvent,
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
  const keyboardHeight = useKeyboardAvoidance();
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
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);
    try {
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

      // Notify the treasurers / admins that a new event was planned
      notification.sendNotification({
        title: "Nouvel événement planifié",
        message: `« ${name.trim()} » — ${startDate}${endDate ? ` → ${endDate}` : ""}${totalBudget ? ` — budget ${totalBudget.toLocaleString()} FCFA` : ""}`,
        targetRole: "TREASURIER" as any,
        extraData: { eventName: name.trim(), startDate },
      }).catch(() => {});

      navigate("/events");
    } finally {
      setSubmitting(false);
    }
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
        <div
          className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe"
          style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          }}
        >
          {error && (
            <div
              className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)", color: "var(--data-expense)" }}
            >
              {error}
            </div>
          )}

          {/* Type selector */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setEventType("EVENT")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${eventType === "EVENT" ? "text-on-accent" : "text-text-tertiary"}`}
              style={
                eventType === "EVENT"
                  ? { backgroundColor: "var(--accent-primary)" }
                  : { backgroundColor: "var(--surface)" }
              }
            >
              Événement
            </button>
            <button
              onClick={() => setEventType("CULTE")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${eventType === "CULTE" ? "text-on-accent" : "text-text-tertiary"}`}
              style={
                eventType === "CULTE"
                  ? { backgroundColor: "var(--accent-primary)" }
                  : { backgroundColor: "var(--surface)" }
              }
            >
              Culte dominical
            </button>
          </div>

          {/* Cotisation settings (only for cultes) */}
          {eventType === "CULTE" && (
            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <p className="text-text-tertiary text-xs font-medium mb-3 uppercase tracking-wider">
                Paramètres de cotisation
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {/* M24 — grammaire canonique IonItem + IonLabel + IonInput */}
                  <IonItem lines="none" className="bg-card rounded-xl">
                    <IonLabel position="floating" className="text-sm text-text-secondary">
                      Montant obligatoire (FCFA) *
                    </IonLabel>
                    <IonInput
                      type="number"
                      aria-label="Montant de cotisation obligatoire en FCFA"
                      value={montantCotisation}
                      onIonChange={(e: IonChangeCustomEvent<string>) =>
                        setMontantCotisation((e.detail.value as string) ?? "")
                      }
                      min="0"
                      slot="input"
                      style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </IonItem>
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

          {/* Name — M24 : grammaire canonique IonItem + IonLabel + IonInput */}
          <IonItem lines="none" className="mb-5 bg-card rounded-xl">
            <IonLabel position="floating" className="text-sm text-text-secondary">
              Nom de l'événement *
            </IonLabel>
            <IonInput
              type="text"
              aria-label="Nom de l'événement"
              value={name}
              onIonChange={(e: IonChangeCustomEvent<string>) =>
                setName((e.detail.value as string) ?? "")
              }
              placeholder="Ex: Noël 2026"
              slot="input"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            />
          </IonItem>

          {/* Description */}
          <div className="mb-5">
            <label className="text-text-tertiary text-xs mb-2 block">
              Description
            </label>
            <IonTextarea
              aria-label="Description"
              value={description}
              onIonChange={(e: IonChangeCustomEvent<string>) =>
                setDescription((e.detail.value as string) ?? "")
              }
              placeholder="Description de l'événement..."
              rows={3}
              style={{
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          {/* Dates — M24 : grammaire canonique IonItem + IonLabel + IonInput */}
          <IonItem lines="none" className="mb-5 bg-card rounded-xl">
            <IonLabel position="floating" className="text-sm text-text-secondary">
              Date de début *
            </IonLabel>
            <IonInput
              type="date"
              value={startDate}
              onIonChange={(e: IonChangeCustomEvent<string>) =>
                setStartDate((e.detail.value as string) ?? "")
              }
              slot="input"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            />
          </IonItem>

          <IonItem lines="none" className="mb-5 bg-card rounded-xl">
            <IonLabel position="floating" className="text-sm text-text-secondary">
              Date de fin (optionnel)
            </IonLabel>
            <IonInput
              type="date"
              value={endDate}
              onIonChange={(e: IonChangeCustomEvent<string>) =>
                setEndDate((e.detail.value as string) ?? "")
              }
              slot="input"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            />
          </IonItem>

          {/* Status — M24 : grammaire canonique IonItem + IonLabel + IonSelect */}
          <IonItem lines="none" className="mb-5 bg-card rounded-xl">
            <IonLabel position="floating" className="text-sm text-text-secondary">
              Statut
            </IonLabel>
            <IonSelect
              value={status}
              onIonChange={(e: IonChangeCustomEvent<string>) => setStatus(e.detail.value as Event["status"])}
              interface="popover"
              slot="input"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <IonSelectOption value="PLANIFIED">Planifié</IonSelectOption>
              <IonSelectOption value="ONGOING">En cours</IonSelectOption>
            </IonSelect>
          </IonItem>

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
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
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
                      backgroundColor: "var(--card)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
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
                      backgroundColor: "var(--card)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <button
                    onClick={handleAddBudget}
                    className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-1.5"
                    style={{ backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }}
                    aria-label="Ajouter au budget"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter au budget
                  </button>
                </div>

                {/* Budget items list */}
                {budgetItems.length > 0 && (
                  <div className="space-y-2">
                    {budgetItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ backgroundColor: "var(--card)" }}
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
                          style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)" }}
                        >
                          <X className="w-4 h-4" style={{ color: "var(--data-expense)" }} />
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
                  backgroundColor: "var(--surface)",
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
            disabled={submitting}
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            {submitting ? "Création…" : "Créer l'événement"}
          </IonButton>
        </div>
        <BottomNav />
      </IonContent>
    </IonPage>
  );
}
