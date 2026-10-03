import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Trash2, Edit3 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { customFieldRepo, customFieldValueRepo } from "@/lib/customFields";
import { generateId } from "@/lib/utils";
import { getOrganizationId } from "@/lib/orgContext";
import type { CustomFieldDefinition } from "@/types";
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

const ENTITY_TYPES = [
  "Transaction",
  "Event",
  "Group",
  "Member",
  "Account",
  "Category",
];
const FIELD_TYPES: { value: CustomFieldDefinition["type"]; label: string }[] = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
  { value: "select", label: "Sélection" },
  { value: "boolean", label: "Vrai/Faux" },
];

export default function CustomFields() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [entityType, setEntityType] = useState("Transaction");
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldDefinition["type"]>("text");
  const [options, setOptions] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    customFieldRepo.list().then(setFields);
  }, []);

  const handleCreate = async () => {
    if (!label.trim() || !key.trim()) {
      setError("Label et clé requis");
      return;
    }
    if (creating) return;
    setCreating(true);
    try {
      const def = await customFieldRepo.create({
        orgId: getOrganizationId(),
        entityType,
        key: key.trim().toLowerCase().replace(/\s+/g, "_"),
        label: label.trim(),
        type,
        options:
          type === "select" ? options.split("\n").filter(Boolean) : undefined,
        order: fields.length,
      });
      setFields((prev) => [...prev, def]);
      setShowCreate(false);
      setLabel("");
      setKey("");
      setOptions("");
      setError("");
    } catch {
      setError("Impossible de créer le champ");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await customFieldRepo.delete(id);
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="min-h-dvh">
          <TopHeader title="Champs personnalisés" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            <div className="flex items-center justify-between mb-5">
              <h1 className="text-text-primary font-bold text-xl">
                Champs personnalisés
              </h1>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-on-accent"
                style={{
                  background: "linear-gradient(135deg, var(--accent-light), var(--accent-primary))",
                }}
                aria-label="Créer un nouveau champ"
              >
                <Plus className="w-4 h-4" /> Créer
              </button>
            </div>

            {fields.length === 0 ? (
              <div
                className="text-center py-16 rounded-xl"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <p className="text-text-primary font-medium text-sm mb-2">
                  Pas encore de champ personnalisé
                </p>
                <p className="text-text-tertiary text-xs mb-4">
                  Ajoutez des champs pour collecter des informations
                  complémentaires
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-text-primary text-sm font-semibold">
                          {field.label}
                        </p>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                            color: "var(--accent-primary)",
                          }}
                        >
                          {field.entityType}
                        </span>
                      </div>
                      <p className="text-text-tertiary text-xs">
                        Clé: {field.key} ·{" "}
                        {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(field.id)}
                      style={{ color: "var(--data-expense)" }}
                      aria-label={`Supprimer le champ ${field.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Modal */}
          {showCreate && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center"
              onClick={() => setShowCreate(false)}
            >
              <div className="absolute inset-0 bg-scrim" />
              <div
                className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8"
                style={{ backgroundColor: "var(--card)" }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Nouveau champ"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-text-primary font-bold text-lg">
                    Nouveau champ
                  </h2>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--surface-hover)" }}
                    aria-label="Fermer"
                  >
                    <X className="w-4 h-4 text-text-tertiary" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-text-tertiary text-xs mb-1.5 block">
                      Entité
                    </label>
                    <IonSelect
                      value={entityType}
                      onIonChange={(e: IonChangeCustomEvent<string>) => setEntityType(e.detail.value)}
                      interface="popover"
                    >
                      {ENTITY_TYPES.map((t) => (
                        <IonSelectOption value={t}>
                          {t}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                  <IonItem lines="none" className="bg-card rounded-xl">
                    <IonLabel position="floating" className="text-sm text-text-secondary">Label *</IonLabel>
                    <IonInput
                      type="text"
                      value={label}
                      onIonChange={(e: IonChangeCustomEvent<string>) => setLabel(e.detail.value ?? "")}
                      placeholder="Ex: Montant estimé"
                      slot="input"
                    />
                  </IonItem>
                  <IonItem lines="none" className="bg-card rounded-xl">
                    <IonLabel position="floating" className="text-sm text-text-secondary">Clé *</IonLabel>
                    <IonInput
                      type="text"
                      value={key}
                      onIonChange={(e: IonChangeCustomEvent<string>) =>
                        setKey(
                          (e.detail.value ?? "").replace(/\s+/g, "_").toLowerCase(),
                        )
                      }
                      placeholder="montant_estime"
                      slot="input"
                    />
                  </IonItem>
                  <div>
                    <label className="text-text-tertiary text-xs mb-1.5 block">
                      Type
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {FIELD_TYPES.map((ft) => (
                        <button
                          key={ft.value}
                          onClick={() => setType(ft.value)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium"
                          style={
                            type === ft.value
                              ? {
                                  backgroundColor: "var(--accent-primary)",
                                  color: "var(--text-primary)",
                                }
                              : {
                                  backgroundColor: "var(--surface)",
                                  color: "var(--text-secondary)",
                                  border: "1px solid var(--border)",
                                }
                          }
                        >
                          {ft.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {type === "select" && (
                    <IonItem lines="none" className="bg-card rounded-xl">
                      <IonLabel position="floating" className="text-sm text-text-secondary">Options (une par ligne)</IonLabel>
                      <IonTextarea
                        value={options}
                        onIonChange={(e: IonChangeCustomEvent<string>) => setOptions(e.detail.value ?? "")}
                        placeholder="Option 1\nOption 2"
                        rows={3}
                        aria-label="Options du champ (une par ligne)"
                        slot="input"
                      />
                    </IonItem>
                  )}
                </div>

                {error && (
                  <p className="text-xs mb-3" style={{ color: "var(--data-expense)" }}>
                    {error}
                  </p>
                )}
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full py-3.5 rounded-full font-semibold text-on-accent mb-3"
                  style={{ backgroundColor: "var(--accent-primary)", opacity: creating ? 0.6 : 1 }}
                  aria-label={creating ? "Création du champ en cours" : "Créer le champ"}
                >
                  {creating ? "Création…" : "Créer le champ"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary"
                  style={{ backgroundColor: "var(--surface)" }}
                  aria-label="Annuler"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
