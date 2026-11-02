/**
 * EventEdit v2 — Édition d'événement, redesign premium.
 *
 * Design : carte unique avec formulaire propre, labels flottants corrigés,
 * sélecteur de statut, bouton d'action principal en bas.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : validation, mise à jour PowerSync,
 * gestion d'erreur, événement introuvable.
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useEvents,
  useCategories,
  updateEventPS,
  isPowerSyncReadyNow,
} from "@/lib/dataLayer";
import { ArrowLeft, Calendar, Tag, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { getOrganizationId } from "@/lib/orgContext";
import type { Event } from "@/types";
import {
  IonPage,
  IonContent,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
} from "@ionic/react";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";
import { InfoCard, FormField } from "@/design/components/PageShell";

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const keyboardHeight = useKeyboardAvoidance();

  const { data: psEvents, isLoading: psLoading } = useEvents();
  const { data: psCategories } = useCategories();

  const events = psEvents ?? [];
  const categories = psCategories ?? [];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const event = events.find((e: any) => e.id === id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<Event["status"]>("PLANIFIED");
  const [budget, setBudget] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!event || psLoading) return;
    setName(event.name || "");
    setDescription(event.description || "");
    setStartDate((event as any).start_date || (event as any).startDate);
    setEndDate((event as any).end_date || (event as any).endDate || "");
    setStatus(event.status as any);
    setBudget(String(Math.round((event.budget || 0) / 100)));
    setLoading(false);
  }, [event, psLoading]);

  if (loading || !event) {
    if (!event && isPowerSyncReadyNow()) {
      return (
        <IonPage>
          <IonContent fullscreen className="bg-canvas">
            <div
              data-screen-state="error"
              className="min-h-dvh flex flex-col items-center justify-center py-12 px-6 text-center"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <Tag className="w-8 h-8 text-text-tertiary" />
              </div>
              <h2 className="text-text-primary font-bold text-xl mb-2">
                Événement introuvable
              </h2>
              <p className="text-text-tertiary text-sm mb-6">
                Cet événement a peut-être été supprimé, ou il appartient à une
                autre organisation.
              </p>
              <button
                type="button"
                onClick={() => navigate("/events")}
                className="w-full sm:w-auto py-3.5 px-6 rounded-xl font-medium text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                  color: "var(--on-accent)",
                }}
              >
                Retour aux événements
              </button>
            </div>
          </IonContent>
        </IonPage>
      );
    }
    return (
      <div data-screen-state="loading" className="min-h-dvh flex flex-col items-center justify-center py-12 px-6">
        <div className="w-8 h-8 rounded-full border-4 border-border border-t-accent-primary animate-spin" />
        <p className="mt-4 text-text-tertiary text-sm">Chargement…</p>
      </div>
    );
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Le nom est requis";
    if (!startDate) errors.startDate = "La date de début est requise";
    if (endDate && endDate < startDate)
      errors.endDate = "La date de fin doit être après le début";
    const budgetNum = parseFloat(budget);
    if (budgetNum < 0) errors.budget = "Le budget doit être positif";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setError("");
    setSubmitting(true);

    try {
      await updateEventPS(id!, {
        name: name.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate || null,
        status,
        budget: Math.round(parseFloat(budget) * 100),
      });
      navigate(`/event/${id}`);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader
            title="Modifier l'événement"
            subtitle={event.name}
            onBack={() => navigate(-1)}
          />
          <div className="max-w-lg mx-auto px-5 pt-2 pb-safe-calc" style={{
            paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
          }}>
            <div className="space-y-5">
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

              <InfoCard className="mb-6">
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
                  {/* Nom de l'événement */}
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Nom de l'événement *
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, name: "" }));
                        }}
                        placeholder="Ex: Culte du dimanche, Réunion de conseil…"
                        aria-label="Nom de l'événement"
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: fieldErrors.name
                            ? "1px solid var(--out)"
                            : "1px solid var(--border)",
                        }}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="text-xs mt-1.5 text-text-alert" style={{ color: "var(--out)" }}>
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Description
                    </label>
                    <IonTextarea
                      value={description}
                      onIonInput={(e: IonChangeCustomEvent<string>) => setDescription(e.detail.value ?? "")}
                      rows={3}
                      placeholder="Décrivez l'événement…"
                      className="w-full min-h-[80px] rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "var(--surface)",
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
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, startDate: "" }));
                        }}
                        aria-label="Date de début"
                        className="w-full pl-4 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: fieldErrors.startDate
                            ? "1px solid var(--out)"
                            : "1px solid var(--border)",
                        }}
                      />
                      {fieldErrors.startDate && (
                        <p className="text-xs mt-1.5 text-text-alert" style={{ color: "var(--out)" }}>
                          {fieldErrors.startDate}
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                        Date de fin
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, endDate: "" }));
                        }}
                        aria-label="Date de fin"
                        className="w-full pl-4 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: fieldErrors.endDate
                            ? "1px solid var(--out)"
                            : "1px solid var(--border)",
                        }}
                      />
                      {fieldErrors.endDate && (
                        <p className="text-xs mt-1.5 text-text-alert" style={{ color: "var(--out)" }}>
                          {fieldErrors.endDate}
                        </p>
                      )}
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
                      <IonSelectOption value="COMPLETED">Terminé</IonSelectOption>
                      <IonSelectOption value="CANCELLED">Annulé</IonSelectOption>
                    </IonSelect>
                  </div>

                  {/* Budget */}
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Budget (FCFA)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                        F
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={budget}
                        onChange={(e) => {
                          setBudget(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, budget: "" }));
                        }}
                        placeholder="0"
                        aria-label="Budget en francs CFA"
                        className="w-full pl-8 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: fieldErrors.budget
                            ? "1px solid var(--out)"
                            : "1px solid var(--border)",
                        }}
                      />
                    </div>
                    {fieldErrors.budget && (
                      <p className="text-xs mt-1.5 text-text-alert" style={{ color: "var(--out)" }}>
                        {fieldErrors.budget}
                      </p>
                    )}
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
                    {submitting ? (
                      <IonSpinner className="w-5 h-5" />
                    ) : (
                      "Sauvegarder les modifications"
                    )}
                  </IonButton>
                </form>
              </InfoCard>

              {/* Statut de connexion */}
              {!isPowerSyncReadyNow() && (
                <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{
                  backgroundColor: "color-mix(in srgb, var(--warn) 12%, transparent)",
                  color: "var(--warn)",
                  border: "1px solid color-mix(in srgb, var(--warn) 25%, var(--border))",
                }}>
                  Mode hors ligne — les modifications seront synchronisées à la reconnexion.
                </div>
              )}
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
