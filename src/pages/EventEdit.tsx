import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLocalStore } from "@/store/useLocalStore";
import { useEvents, useCategories } from "@/lib/dataLayer";
import { ArrowLeft, Calendar, Plus, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { generateId } from "@/lib/utils";
import type { Event, Category } from "@/types";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    events: idbEvents,
    categories: idbCategories,
    updateEvent,
    isLoading,
  } = useLocalStore();

  // PowerSync with fallback
  const { data: psEvents } = useEvents();
  const { data: psCategories } = useCategories();

  const events = psEvents ?? idbEvents;
  const categories = psCategories ?? idbCategories;

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
    if (!event || isLoading) return;
    setName(event.name);
    setDescription(event.description || "");
    setStartDate(event.start_date || event.startDate);
    setEndDate(event.end_date || event.endDate || "");
    setStatus(event.status);
    setBudget(String(Math.round((event.budget || 0) / 100)));
    setLoading(false);
  }, [event, isLoading]);

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
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
      await updateEvent(id!, {
        name: name.trim(),
        description: description.trim(),
        startDate,
        endDate: endDate || null,
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
      <IonHeader>
        <IonToolbar>
          <IonTitle>EventEdit</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Modifier l'événement" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            {error && (
              <div
                className="mb-4 p-3 rounded-xl text-sm text-center"
                style={{ backgroundColor: "#E5133220", color: "#E51332" }}
              >
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Nom de l'événement *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: fieldErrors.name
                      ? "1px solid #E51332"
                      : "1px solid #282828",
                  }}
                />
                {fieldErrors.name && (
                  <p className="text-[#E51332] text-xs mt-1">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm  resize-none"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: "1px solid #282828",
                  }}
                />
              </div>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: fieldErrors.startDate
                      ? "1px solid #E51332"
                      : "1px solid #282828",
                  }}
                />
                {fieldErrors.startDate && (
                  <p className="text-[#E51332] text-xs mt-1">
                    {fieldErrors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: fieldErrors.endDate
                      ? "1px solid #E51332"
                      : "1px solid #282828",
                  }}
                />
                {fieldErrors.endDate && (
                  <p className="text-[#E51332] text-xs mt-1">
                    {fieldErrors.endDate}
                  </p>
                )}
              </div>

              <div>
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
                  <option value="COMPLETED">Terminé</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </div>

              <div>
                <label className="text-text-tertiary text-xs mb-2 block">
                  Budget (FCFA)
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#212121",
                    color: "#fff",
                    border: fieldErrors.budget
                      ? "1px solid #E51332"
                      : "1px solid #282828",
                  }}
                />
                {fieldErrors.budget && (
                  <p className="text-[#E51332] text-xs mt-1">
                    {fieldErrors.budget}
                  </p>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={submitting}
                className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "#FF6B00" }}
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
