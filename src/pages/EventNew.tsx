/**
 * EventNew v2 — Création d'événement, redesign premium.
 *
 * Design : fond sombre, sélecteur de type (Événement/Culte), formulaire
 * avec labels propres, gestion du budget avec postes par défaut et
 * personnalisés, bouton d'action principal.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : création d'event ou culte, budget items,
 * notification, navigation vers le détail.
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCategories, useCaisses, useMembers, addEventPS } from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { ArrowLeft, Plus, X, Tag, Calendar, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import DatePicker from "@/components/DatePicker";
import { generateId, formatCurrencyCompact } from "@/lib/utils";
import type { BudgetItem, Event } from "@/types";
import { getOrganizationId } from "@/lib/orgContext";
import { CANONICAL_CATEGORIES } from "@/lib/canonicalCategories";
import { notification } from "@/capabilities/notification";
import {
  IonPage,
  IonContent,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  IonButton,
} from "@ionic/react";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";
import { InfoCard, FormField } from "@/design/components/PageShell";

// Dérivé de la source unique des catégories (R89.a)
const DEFAULT_BUDGET_ITEMS = CANONICAL_CATEGORIES.map((c) => ({
  label: c.labelFr,
  categoryId: c.id,
  allocated: 0,
}));

export default function EventNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const keyboardHeight = useKeyboardAvoidance();
  const { data: members } = useMembers();
  const createCulte = useLocalStore((s) => s.createCulte);

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
  const [status, setStatus] = useState<Event["status"]>("PLANIFIED");
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

      const newEventId = await addEventPS({
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

      notification.sendNotification({
        title: "Nouvel événement planifié",
        message: `« ${name.trim()} » — ${startDate}${endDate ? ` → ${endDate}` : ""}${totalBudget ? ` — budget ${totalBudget.toLocaleString()} FCFA` : ""}`,
        targetRole: "TREASURIER",
        extraData: { eventName: name.trim(), startDate },
      }).catch(() => {});

      navigate(`/event/${newEventId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader
            title="Nouvel événement"
            subtitle="Créez un événement ou un culte pour votre organisation"
            onBack={() => navigate("/events")}
          />
          <div className="max-w-lg mx-auto px-5 pt-2 pb-safe-calc" style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          }}>
            {error && (
              <div
                className="mb-4 p-3.5 rounded-xl text-sm text-center"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--out) 12%, transparent)",
                  color: "var(--out)",
                  border: "1px solid color-mix(in srgb, var(--out) 25%, var(--border))",
                }}
              >
                {error}
              </div>
            )}

            {/* Sélecteur de type */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setEventType("EVENT")}
                className={`flex-1 py-3.5 rounded-xl font-medium text-sm transition-all ${eventType === "EVENT" ? "bg-on-accent text-black shadow-accent" : "bg-surface border border-border text-text-secondary"}`}
              >
                Événement
              </button>
              <button
                onClick={() => setEventType("CULTE")}
                className={`flex-1 py-3.5 rounded-xl font-medium text-sm transition-all ${eventType === "CULTE" ? "bg-on-accent text-black shadow-accent" : "bg-surface border border-border text-text-secondary"}`}
              >
                Culte dominical
              </button>
            </div>

            {/* Paramètres de cotisation (culte seulement) */}
            {eventType === "CULTE" && (
              <InfoCard className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                  <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                    Paramètres de cotisation
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                        Montant obligatoire (FCFA) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                          F
                        </span>
                        <input
                          type="number"
                          aria-label="Montant de cotisation obligatoire en FCFA"
                          value={montantCotisation}
                          onChange={(e) => setMontantCotisation(e.target.value)}
                          min="0"
                          className="w-full pl-8 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                          style={{
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-text-tertiary text-xs mt-3">
                  {members.filter((m) => m.status === "ACTIVE").length} membre
                  {members.filter((m) => m.status === "ACTIVE").length !== 1 ? "s" : ""}{" "}
                  actif{members.filter((m) => m.status === "ACTIVE").length !== 1 ? "s" : ""}{" "}
                  — des cotisations seront créées automatiquement
                </p>
              </InfoCard>
            )}

            <InfoCard className="mb-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
                {/* Nom de l'événement */}
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Nom de l'événement *
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                      type="text"
                      aria-label="Nom de l'événement"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Noël 2026"
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Description
                  </label>
                  <IonTextarea
                    aria-label="Description"
                    value={description}
                    onIonInput={(e: IonChangeCustomEvent<string>) =>
                      setDescription((e.detail.value as string) ?? "")
                    }
                    placeholder="Description de l'événement…"
                    rows={3}
                    className="w-full min-h-[80px] rounded-xl text-text-primary text-sm"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-4 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Date de fin (optionnel)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-4 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                    Statut
                  </label>
                  <IonSelect
                    value={status}
                    onIonChange={(e: IonChangeCustomEvent<string>) => setStatus(e.detail.value as Event["status"])}
                    interface="popover"
                    className="w-full"
                  >
                    <IonSelectOption value="PLANIFIED">Planifié</IonSelectOption>
                    <IonSelectOption value="ONGOING">En cours</IonSelectOption>
                  </IonSelect>
                </div>

                {/* Bouton d'action */}
                <IonButton
                  type="submit"
                  expand="block"
                  disabled={submitting}
                  className="py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-accent"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                    color: "var(--on-accent)",
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? "Création…" : "Créer l'événement"}
                </IonButton>
              </form>
            </InfoCard>

            {/* Budget */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
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
                  {/* Postes par défaut */}
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
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Poste personnalisé */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                        Poste
                      </label>
                      <input
                        type="text"
                        value={newBudgetLabel}
                        onChange={(e) => setNewBudgetLabel(e.target.value)}
                        placeholder="Poste"
                        className="w-full pl-4 pr-4 py-3 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      />
                    </div>
                    <div className="w-24 relative">
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                        Montant
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-xs">
                          F
                        </span>
                        <input
                          type="number"
                          value={newBudgetAmount}
                          onChange={(e) => setNewBudgetAmount(e.target.value)}
                          placeholder="Montant"
                          className="w-full pl-8 pr-4 py-3 rounded-xl text-text-primary text-sm"
                          style={{
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddBudget}
                      className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-1.5"
                      style={{ backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }}
                      aria-label="Ajouter au budget"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  </div>

                  {/* Liste des postes */}
                  {budgetItems.length > 0 && (
                    <div className="space-y-2">
                      {budgetItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-4 py-3 rounded-xl"
                          style={{ backgroundColor: "var(--surface)" }}
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
                            className="p-1.5 rounded-full"
                            style={{ backgroundColor: "color-mix(in srgb, var(--out) 12%, transparent)" }}
                          >
                            <X className="w-4 h-4" style={{ color: "var(--out)" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  {budgetItems.length > 0 && (
                    <div
                      className="p-4 rounded-xl text-center"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid color-mix(in srgb, var(--accent-primary) 19%, transparent)",
                      }}
                    >
                      <p className="text-text-tertiary text-xs">
                        Budget total
                      </p>
                      <p className="text-text-primary font-bold text-lg">
                        {formatCurrencyCompact(totalBudget)} F
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Statut de connexion */}
            <div className="mt-6 p-3 rounded-xl text-xs text-center" style={{
              backgroundColor: "color-mix(in srgb, var(--warn) 12%, transparent)",
              color: "var(--warn)",
              border: "1px solid color-mix(in srgb, var(--warn) 25%, var(--border))",
            }}>
              Mode hors ligne — l'événement sera synchronisé à la reconnexion.
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
