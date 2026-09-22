import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Trash2, GripVertical } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { formDefinitionRepo } from "@/lib/formSystem";
import { generateId } from "@/lib/utils";
import { getOrganizationId } from "@/lib/orgContext";
import type { FormDefinition, FormFieldDefinition } from "@/types";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
} from "@ionic/react";

const FIELD_TYPES: { value: FormFieldDefinition["type"]; label: string }[] = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
  { value: "select", label: "Sélection" },
  { value: "boolean", label: "Vrai/Faux" },
  { value: "currency", label: "Montant (FCFA)" },
  { value: "textarea", label: "Texte long" },
  { value: "reference", label: "Référence (entité)" },
  { value: "file", label: "Fichier" },
];

const REFERENCE_ENTITY_TYPES = ["member", "group", "event", "account"] as const;

export function addField(
  typeOrField:
    | FormFieldDefinition["type"]
    | { type: FormFieldDefinition["type"] },
  overrides?: Partial<FormFieldDefinition>,
): FormFieldDefinition {
  // Testable en pur : `addField({ type: "reference" })` ou `addField("reference")`.
  const type =
    typeof typeOrField === "string" ? typeOrField : typeOrField.type;
  return {
    key: generateId(),
    label: `Nouveau champ ${type}`,
    type,
    required: false,
    order: 0,
    options: type === "select" ? ["Option 1", "Option 2"] : undefined,
    validation: undefined,
    // Type reference : défaut raisonné (sélection parmi les membres de l'organisation).
    referenceEntityType: type === "reference" ? "member" : undefined,
    conditional: undefined,
    mapsToEntityField: undefined,
    ...overrides,
  };
}

export default function FormBuilder() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [editingForm, setEditingForm] = useState<FormDefinition | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formKey, setFormKey] = useState("");
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [error, setError] = useState("");

  const loadForms = async () => {
    const list = await formDefinitionRepo.list({ orgId: getOrganizationId() });
    setForms(list);
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleCreate = async () => {
    if (!formName.trim() || !formKey.trim()) {
      setError("Nom et clé requis");
      return;
    }
    const def: FormDefinition = {
      id: generateId(),
      orgId: getOrganizationId(),
      key: formKey.trim(),
      name: formName.trim(),
      description: formDescription.trim(),
      version: 1,
      targetEntityType: null,
      status: "DRAFT",
      fields: fields.map((f, i) => ({ ...f, order: i })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await formDefinitionRepo.create(def);
    await loadForms();
    setShowCreate(false);
    setFormName("");
    setFormDescription("");
    setFormKey("");
    setFields([]);
  };

  const addFieldInline = (type: FormFieldDefinition["type"]) => {
    const newField = addField(type, { order: fields.length });
    setFields((prev) => [...prev, newField]);
  };

  const updateField = (
    index: number,
    updates: Partial<FormFieldDefinition>,
  ) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRequired = (index: number) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, required: !f.required } : f)),
    );
  };

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="h-screen bg-canvas flex flex-col overflow-hidden">
          <TopHeader title="Formulaires" />
          <div className="flex-1 overflow-y-auto px-5 pt-16 pb-28 max-w-lg mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            <div className="flex items-center justify-between mb-5">
              <h1 className="text-text-primary font-bold text-xl">
                Formulaires
              </h1>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #FF8533, var(--accent-primary))",
                }}
              >
                <Plus className="w-4 h-4" /> Créer
              </button>
            </div>

            {forms.length === 0 ? (
              <div
                className="text-center py-16 rounded-xl"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <p className="text-text-primary font-medium text-sm mb-2">
                  Pas encore de formulaire
                </p>
                <p className="text-text-tertiary text-xs mb-4">
                  Créez votre premier formulaire pour collecter des données
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-text-primary text-sm font-semibold">
                        {form.name}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            form.status === "PUBLISHED"
                              ? "#1DB95420"
                              : "#FFB80020",
                          color:
                            form.status === "PUBLISHED" ? "#1DB954" : "#FFB800",
                        }}
                      >
                        {form.status}
                      </span>
                    </div>
                    <p className="text-text-tertiary text-xs mb-2">
                      {form.fields.length} champs · Clé: {form.key}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/form/fill/${form.id}`)}
                        className="flex-1 py-2 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        Remplir
                      </button>
                      <button
                        onClick={() => navigate(`/forms/${form.id}/submissions`)}
                        className="flex-1 py-2 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}
                      >
                        Soumissions
                      </button>
                      <button
                        onClick={async () => {
                          await formDefinitionRepo.update(form.id, {
                            status:
                              form.status === "PUBLISHED"
                                ? "DRAFT"
                                : "PUBLISHED",
                          });
                          await loadForms();
                        }}
                        className="flex-1 py-2 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}
                      >
                        {form.status === "PUBLISHED" ? "Brouillon" : "Publier"}
                      </button>
                    </div>
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
              <div className="absolute inset-0 bg-black/60" />
              <div
                className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8"
                style={{ backgroundColor: "var(--card)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-text-primary font-bold text-lg">
                    Nouveau formulaire
                  </h2>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--surface-hover)" }}
                  >
                    <X className="w-4 h-4 text-text-tertiary" />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <IonInput
                    type="text"
                    value={formName}
                    onIonChange={(e) => setFormName(e.detail.value!)}
                    placeholder="Nom du formulaire *"
                    className="w-full"
                  />
                  <IonInput
                    type="text"
                    value={formKey}
                    onIonChange={(e) =>
                      setFormKey(
                        e.detail.value!.replace(/\s+/g, "_").toLowerCase(),
                      )
                    }
                    placeholder="Clé (ex: demande_cotisation) *"
                    className="w-full"
                  />
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Description (optionnel)"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm  resize-none"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  />
                </div>

                {/* Fields */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-text-tertiary text-xs font-medium">
                      Champs ({fields.length})
                    </p>
                    <div className="relative group">
                      <button
                        onClick={() => {
                          const type =
                            FIELD_TYPES[fields.length % FIELD_TYPES.length]
                              .value;
                          addFieldInline(type);
                        }}
                        className="text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        <Plus className="w-3 h-3 inline mr-1" /> Ajouter
                      </button>
                    </div>
                  </div>
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="rounded-xl p-3 mb-2"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) =>
                            updateField(index, { label: e.target.value })
                          }
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(index, {
                              type: e.target
                                .value as FormFieldDefinition["type"],
                            })
                          }
                          className="px-2 py-1.5 rounded-lg text-xs"
                          style={{
                            backgroundColor: "var(--card)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {FIELD_TYPES.map((ft) => (
                            <option key={ft.value} value={ft.value}>
                              {ft.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => toggleRequired(index)}
                          style={{
                            color: field.required ? "var(--accent-primary)" : "var(--text-tertiary)",
                          }}
                        >
                          <span className="text-xs font-bold">*</span>
                        </button>
                        <button
                          onClick={() => removeField(index)}
                          style={{ color: "#E51332" }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {field.type === "select" && (
                        <textarea
                          value={field.options?.join("\n") || ""}
                          onChange={(e) =>
                            updateField(index, {
                              options: e.target.value
                                .split("\n")
                                .filter(Boolean),
                            })
                          }
                          placeholder="Options (une par ligne)"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg text-xs resize-none"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                      )}
                      {field.type === "reference" && (
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-xs text-text-tertiary flex-shrink-0">
                            Entité cible
                          </label>
                          <select
                            value={field.referenceEntityType ?? "member"}
                            onChange={(e) =>
                              updateField(index, {
                                referenceEntityType: e.target.value,
                              })
                            }
                            className="px-2 py-1.5 rounded-lg text-xs"
                            style={{
                              backgroundColor: "var(--card)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            {REFERENCE_ENTITY_TYPES.map((et) => (
                              <option key={et} value={et}>
                                {et}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 mb-1">
                        <input
                          type="text"
                          value={field.conditional?.showIfField ?? ""}
                          onChange={(e) =>
                            updateField(index, {
                              conditional: {
                                showIfField: e.target.value,
                                showIfValue:
                                  field.conditional?.showIfValue ?? "",
                              },
                            })
                          }
                          placeholder="Afficher si champ (showIfField)"
                          className="px-2 py-1.5 rounded-lg text-xs w-full"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <input
                          type="text"
                          value={String(field.conditional?.showIfValue ?? "")}
                          onChange={(e) =>
                            updateField(index, {
                              conditional: {
                                showIfField:
                                  field.conditional?.showIfField ?? "",
                                showIfValue: e.target.value,
                              },
                            })
                          }
                          placeholder="= valeur (showIfValue)"
                          className="px-2 py-1.5 rounded-lg text-xs w-full"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <input
                          type="text"
                          value={field.validation?.regex ?? ""}
                          onChange={(e) =>
                            updateField(index, {
                              validation: {
                                ...field.validation,
                                regex: e.target.value || undefined,
                              },
                            })
                          }
                          placeholder="Validation regex (optionnel)"
                          className="px-2 py-1.5 rounded-lg text-xs w-full"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <input
                          type="text"
                          value={field.mapsToEntityField ?? ""}
                          onChange={(e) =>
                            updateField(index, {
                              mapsToEntityField: e.target.value || undefined,
                            })
                          }
                          placeholder="Mappage entité (mapsToEntityField)"
                          className="px-2 py-1.5 rounded-lg text-xs w-full"
                          style={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="text-xs mb-3" style={{ color: "#E51332" }}>
                    {error}
                  </p>
                )}
                <IonButton
                  onClick={handleCreate}
                  expand="block"
                  className="w-full mb-3"
                  color="tertiary"
                >
                  Créer le formulaire
                </IonButton>
                <IonButton
                  onClick={() => setShowCreate(false)}
                  expand="block"
                  className="w-full"
                  color="medium"
                  fill="outline"
                >
                  Annuler
                </IonButton>
              </div>
            </div>
          )}

          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
