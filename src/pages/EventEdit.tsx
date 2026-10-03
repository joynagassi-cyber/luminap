import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEvents, useCategories, updateEventPS } from "@/lib/dataLayer";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { getOrganizationId } from "@/lib/orgContext";
import type { Event } from "@/types";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonSelect,
  IonSelectOption,
  IonChangeCustomEvent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
} from "@ionic/react";

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const keyboardHeight = useKeyboardAvoidance();

  // PowerSync with fallback
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
    setDescription(event.description || "");
    setStartDate((event as any).start_date || (event as any).startDate);
    setEndDate((event as any).end_date || (event as any).endDate || "");
    setStatus(event.status as any);
    setBudget(String(Math.round((event.budget || 0) / 100)));
    setLoading(false);
  }, [event, psLoading]);

  if (loading || !event) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-text-tertiary">Chargement...</p>
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
      <IonContent className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Modifier l'événement" />
          <div
            className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc"
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

            {error && (
              <div
                className="mb-4 p-3 rounded-xl text-sm text-center"
                style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)", color: "var(--data-expense)" }}
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              <IonItem
                lines="none"
                className="bg-card rounded-xl"
                style={fieldErrors.name ? { border: "1px solid var(--data-expense)" } : undefined}
              >
                <IonLabel position="floating" className="text-sm text-text-secondary">Nom de l'événement *</IonLabel>
                <IonInput
                  type="text"
                  value={name}
                  onIonChange={(e: IonChangeCustomEvent<string>) => setName(e.detail.value ?? "")}
                  slot="input"
                />
                {fieldErrors.name && (
                  <p className="text-expense text-xs mt-1">{fieldErrors.name}</p>
                )}
              </IonItem>

              <IonItem lines="none" className="bg-card rounded-xl">
                <IonLabel position="floating" className="text-sm text-text-secondary">Description</IonLabel>
                <IonTextarea
                  value={description}
                  onIonChange={(e: IonChangeCustomEvent<string>) => setDescription(e.detail.value ?? "")}
                  rows={3}
                  slot="input"
                />
              </IonItem>

              <IonItem
                lines="none"
                className="bg-card rounded-xl"
                style={fieldErrors.startDate ? { border: "1px solid var(--data-expense)" } : undefined}
              >
                <IonLabel position="floating" className="text-sm text-text-secondary">Date de début *</IonLabel>
                <IonInput
                  type="date"
                  value={startDate}
                  onIonChange={(e: IonChangeCustomEvent<string>) => setStartDate(e.detail.value ?? "")}
                  slot="input"
                />
                {fieldErrors.startDate && (
                  <p className="text-expense text-xs mt-1">{fieldErrors.startDate}</p>
                )}
              </IonItem>

              <IonItem
                lines="none"
                className="bg-card rounded-xl"
                style={fieldErrors.endDate ? { border: "1px solid var(--data-expense)" } : undefined}
              >
                <IonLabel position="floating" className="text-sm text-text-secondary">Date de fin</IonLabel>
                <IonInput
                  type="date"
                  value={endDate}
                  onIonChange={(e: IonChangeCustomEvent<string>) => setEndDate(e.detail.value ?? "")}
                  slot="input"
                />
                {fieldErrors.endDate && (
                  <p className="text-expense text-xs mt-1">{fieldErrors.endDate}</p>
                )}
              </IonItem>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Statut
                </label>
                <IonSelect
                  value={status}
                  onIonChange={(e: IonChangeCustomEvent<string>) => setStatus(e.detail.value as Event["status"])}
                  interface="popover"
                >
                  <IonSelectOption value="PLANIFIED">Planifié</IonSelectOption>
                  <IonSelectOption value="ONGOING">En cours</IonSelectOption>
                  <IonSelectOption value="COMPLETED">Terminé</IonSelectOption>
                  <IonSelectOption value="CANCELLED">Annulé</IonSelectOption>
                </IonSelect>
              </div>

              <IonItem
                lines="none"
                className="bg-card rounded-xl"
                style={fieldErrors.budget ? { border: "1px solid var(--data-expense)" } : undefined}
              >
                <IonLabel position="floating" className="text-sm text-text-secondary">Budget (FCFA)</IonLabel>
                <IonInput
                  type="number"
                  inputMode="numeric"
                  value={budget}
                  onIonChange={(e: IonChangeCustomEvent<string>) => setBudget(e.detail.value ?? "")}
                  placeholder="0"
                  slot="input"
                />
                {fieldErrors.budget && (
                  <p className="text-expense text-xs mt-1">{fieldErrors.budget}</p>
                )}
              </IonItem>

              <button
                onClick={handleSave}
                disabled={submitting}
                className="w-full py-4 rounded-full font-semibold text-on-accent text-sm transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {submitting ? "Sauvegarde..." : "Sauvegarder les modifications"}
              </button>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
