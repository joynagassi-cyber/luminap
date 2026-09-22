import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import {
  formDefinitionRepo,
  formSubmissionRepo,
  validateFormSubmission,
  mapFormFields,
} from "@/lib/formSystem";
import {
  useMembers,
  useGroups,
  useEvents,
  useAccounts,
} from "@/lib/dataLayer";
import { generateId } from "@/lib/utils";
import { getOrganizationId } from "@/lib/orgContext";
import { addMemberPS, addEventPS } from "@/lib/dataLayer";
import type { FormDefinition, FormFieldDefinition } from "@/types";import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonInput,
  IonButton,
} from "@ionic/react";

function ReferenceSelect({
  field,
  data,
  onChange,
}: {
  field: FormFieldDefinition;
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const { data: members } = useMembers();
  const { data: groups } = useGroups();
  const { data: events } = useEvents();
  const { data: accounts } = useAccounts();
  const entities =
    field.referenceEntityType === "group"
      ? groups
      : field.referenceEntityType === "event"
        ? events
        : field.referenceEntityType === "account"
          ? accounts
          : (members ?? []);
  // Les listes PS (membres) sont en snake_case ; les listes fallback (IndexedDB)
  // sont en camelCase → on gère les deux pour éviter d'afficher l'id brut.
  const labelOf = (e: any) => {
    if (e?.name) return e.name;
    if (e?.fullName) return e.fullName;
    const snake = [e?.first_name, e?.last_name].filter(Boolean).join(" ");
    if (snake) return snake;
    const camel = [e?.firstName, e?.lastName].filter(Boolean).join(" ");
    if (camel) return camel;
    return e?.id ?? String(e);
  };
  return (
    <select
      value={data[field.key] ?? ""}
      onChange={(e) => onChange(field.key, e.target.value)}
      className="w-full px-4 py-3 rounded-xl text-text-primary text-sm  appearance-none"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <option value="">— Sélectionner —</option>
      {(Array.isArray(entities) ? entities : []).map((e: any, i: number) => (
        <option key={e?.id ?? i} value={e?.id ?? i}>
          {labelOf(e)}
        </option>
      ))}
    </select>
  );
}

export default function FormFill() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    formDefinitionRepo.get(id!).then((f) => {
      setForm(f);
      setLoading(false);
    });
  }, [id]);

  const handleChange = (key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors([]);
  };

  const handleSubmit = async () => {
    if (!form) return;
    // F.1b — le dispatcher attend des colonnes snake_case (PSMember / PSEvent)
    // alors que mapFormFields produit du camelCase : on convertit avant l'écriture.
    const toSnakeCase = (key: string) =>
      key.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());

    // F.1a — visibilité conditionnelle : un champ caché (condition non remplie)
    // ne doit PAS rester « required » sinon il bloquerait la soumission.
    const isFieldShown = (field: FormFieldDefinition) =>
      !field.conditional ||
      String(data[field.conditional.showIfField]) ===
        String(field.conditional.showIfValue);
    const shownForm: FormDefinition = {
      ...form,
      fields: form.fields.filter(isFieldShown),
    };

    const validation = validateFormSubmission(shownForm, data);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    const mapped = mapFormFields(shownForm, data);
    const submission = await formSubmissionRepo.create({
      orgId: getOrganizationId(),
      formDefinitionId: form.id,
      formVersion: form.version,
      submittedBy: "local-user",
      data,
      status: "SUBMITTED",
    });
    // F.1b — dispatch des champs mappés vers l'entité cible du formulaire.
    // S'il n'y a pas de targetEntityType, ou aucun champ mappé, le résultat
    // reste dans form_submissions (rien n'est écrit ailleurs).
    if (form.targetEntityType && Object.keys(mapped).length > 0) {
      const dispatchers: Record<string, (p: Record<string, any>) => Promise<string>> = {
        member: async (p) => {
          const snake: Record<string, any> = {};
          for (const [k, v] of Object.entries(p)) snake[toSnakeCase(k)] = v;
          // PSMember attend des valeurs par défaut valides.
          snake.status ??= "ACTIVE";
          snake.joined_at ??= new Date().toISOString();
          snake.archived_at ??= null;
          snake.archived_by ??= null;
          snake.archive_reason ??= null;
          return addMemberPS(snake as any);
        },
        event: async (p) => {
          const snake: Record<string, any> = {};
          for (const [k, v] of Object.entries(p)) snake[toSnakeCase(k)] = v;
          snake.status ??= "PLANIFIED";
          snake.type ??= "GENERIC";
          snake.budget ??= 0;
          snake.description ??= "";
          snake.budget_items ??= null;
          return addEventPS(snake as any);
        },
      };
      const dispatcher = dispatchers[form.targetEntityType];
      if (dispatcher) {
        try {
          await dispatcher({
            org_id: getOrganizationId(),
            ...mapped,
            created_from_form_submission_id: submission.id,
          });
        } catch {
          // La soumission est déjà écrite : un échec de dispatch ne doit pas
          // bloquer l'utilisateur, il reste retraceable dans form_submissions.
        }
      }
    }
    setSubmitted(true);
    setTimeout(() => navigate("/forms"), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-text-tertiary text-sm">Chargement...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <TopHeader title="Formulaire" />
        <div className="flex-1 overflow-y-auto px-5 pt-16 pb-28 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-text-secondary text-sm mb-5"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <p className="text-text-tertiary text-sm">Formulaire introuvable</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas flex flex-col">
          <TopHeader title={form.name} />
          <div className="flex-1 overflow-y-auto px-5 pt-16 pb-28 max-w-lg mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
  
            {form.description && (
              <p className="text-text-tertiary text-sm mb-5">
                {form.description}
              </p>
            )}

            {errors.length > 0 && (
              <div
                className="mb-4 p-3 rounded-xl text-sm"
                style={{ backgroundColor: "#E5133220", color: "#E51332" }}
              >
                {errors[0]}
              </div>
            )}

            {submitted ? (
              <div className="text-center py-16">
                <CheckCircle
                  className="w-16 h-16 mx-auto mb-4"
                  style={{ color: "#1DB954" }}
                />
                <p className="text-text-primary font-bold text-lg mb-2">
                  Soumis avec succès !
                </p>
                <p className="text-text-tertiary text-sm">
                  Redirection en cours...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {form.fields
                  .filter(
                    (field) =>
                      !field.conditional ||
                      String(data[field.conditional.showIfField]) ===
                        String(field.conditional.showIfValue),
                  )
                  .map((field) => (
                  <div key={field.key}>
                    <label className="text-text-tertiary text-xs mb-1.5 block">
                      {field.label}{" "}
                      {field.required && (
                        <span style={{ color: "#E51332" }}>*</span>
                      )}
                    </label>
                    {field.type === "boolean" ? (
                      <select
                        value={data[field.key] ?? ""}
                        onChange={(e) =>
                          handleChange(field.key, e.target.value === "true")
                        }
                        className="w-full px-4 py-3 rounded-xl text-text-primary text-sm  appearance-none"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <option value="">— Sélectionner —</option>
                        <option value="true">Oui</option>
                        <option value="false">Non</option>
                      </select>
                    ) : field.type === "select" && field.options ? (
                      <select
                        value={data[field.key] ?? ""}
                        onChange={(e) =>
                          handleChange(field.key, e.target.value)
                        }
                        className="w-full px-4 py-3 rounded-xl text-text-primary text-sm  appearance-none"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <option value="">— Sélectionner —</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={data[field.key] ?? ""}
                        onChange={(e) =>
                          handleChange(field.key, e.target.value)
                        }
                        placeholder={field.label}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl text-text-primary text-sm  resize-none"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      />
                    ) : field.type === "reference" ? (
                      <ReferenceSelect field={field} data={data} onChange={handleChange} />
                    ) : field.type === "file" ? (
                      <input
                        type="file"
                        value={String(data[field.key] ?? "")}
                        onChange={(e) =>
                          handleChange(field.key, e.target.files?.[0]?.name ?? "")
                        }
                        className="w-full px-4 py-3 rounded-xl text-text-primary text-sm "
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      />
                    ) : (
                        value={data[field.key] ?? ""}
                        onChange={(e) =>
                          handleChange(field.key, e.target.value)
                        }
                        placeholder={field.label}
                        className="w-full px-4 py-3 rounded-xl text-text-primary text-sm "
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-full font-semibold text-white transition-all active:scale-95"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Soumettre
                </button>
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
