import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import {
  formDefinitionRepo,
  formSubmissionRepo,
  validateFormSubmission,
  dispatchFormSubmission,
  parseCurrencyAmount,
} from "@/lib/formSystem";
import {
  useMembers,
  useGroups,
  useEvents,
  useAccounts,
  useCurrentUser,
} from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { notification } from "@/capabilities/notification";
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
  // T2 Forms v2 — soumetteur réel : useCurrentUser ne renvoie jamais null
  // (repli synchrone `id: "local-user"`), le `?? "local-user"` est un garde-fou.
  const currentUser = useCurrentUser();
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

    // T7 Forms v2 — normalisation des champs currency : la saisie brute
    // (ex. « 1,500 ») est convertie en nombre (1500) avant l'écriture de
    // la soumission (la valeur stockée est le nombre, jamais la chaîne).
    // Une saisie NON parseable est laissée telle quelle : la règle currency
    // de `validateFormSubmission` la rejette alors avec un message dédié.
    const normalizedData: Record<string, any> = { ...data };
    for (const field of shownForm.fields) {
      if (field.type !== "currency") continue;
      const raw = normalizedData[field.key];
      if (raw === undefined || raw === null || raw === "") continue;
      const parsed = parseCurrencyAmount(raw);
      if (parsed !== null) normalizedData[field.key] = parsed;
    }

    const validation = validateFormSubmission(shownForm, normalizedData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    const submission = await formSubmissionRepo.create({
      orgId: getOrganizationId(),
      formDefinitionId: form.id,
      formVersion: form.version,
      submittedBy: currentUser?.id ?? "local-user",
      data: normalizedData,
      status: "SUBMITTED",
    });
    // F.1b — dispatch des champs mappés vers l'entité cible du formulaire
    // (member / event / group / account) : la logique vit dans formSystem
    // (DRY avec les tests + réutilisable par les rapports). Les valeurs
    // normalisées (currency en number) sont propagées au dispatch.
    if (form.targetEntityType) {
      await dispatchFormSubmission(
        { ...submission, data: normalizedData },
        shownForm,
      );
    }
    setSubmitted(true);

    // Notify the form organizer that a submission was received
    notification.sendNotification({
      title: "Nouvelle soumission de formulaire",
      message: `« ${form.name ?? "Formulaire"} » a été soumis`,
      targetRole: "ADMIN" as any,
      extraData: { formId: form.id, submissionId: submission.id },
    }).catch(() => {});

    // Naviguer rapidement pour ne pas laisser « Soumis avec succès ! »
    // clignoter sous la nouvelle page (délai réduit à 600 ms).
    setTimeout(() => navigate("/forms"), 600);
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="bg-canvas">
          <TopHeader title="Formulaire" />
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-text-tertiary text-sm">Chargement...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!form) {
    return (
      <IonPage>
        <IonContent className="bg-canvas">
          <TopHeader title="Formulaire" />
          <div className="px-5 pt-safe-calc pb-safe-calc max-w-lg mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <p className="text-text-tertiary text-sm">Formulaire introuvable</p>
          </div>
          <BottomNav />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <TopHeader title={form.name} />
        <div className="px-5 pt-safe-calc pb-safe-calc max-w-lg mx-auto">
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
                style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)", color: "var(--data-expense)" }}
              >
                {errors[0]}
              </div>
            )}

            {submitted ? (
              <div className="text-center py-16">
                <CheckCircle
                  className="w-16 h-16 mx-auto mb-4"
                  style={{ color: "var(--data-income)" }}
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
                        <span style={{ color: "var(--data-expense)" }}>*</span>
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
                    ) : field.type === "currency" ? (
                      // T7 Forms v2 — rendu dédié currency : préfixe du symbole
                      // de devise ($ par défaut) + parsing en nombre safe
                      // (virgule FR / point US / séparateurs de milliers,
                      // `parseCurrencyAmount` borne à 2 décimales). La valeur
                      // stockée dans `data` reste la saisie brute (string) ;
                      // la normalisation en number se fait juste avant la
                      // soumission (voir handleSubmit).
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary text-sm pointer-events-none select-none">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={data[field.key] ?? ""}
                          onChange={(e) =>
                            handleChange(field.key, e.target.value)
                          }
                          placeholder={field.label || "Montant"}
                          className="w-full pl-9 pr-4 py-3 rounded-xl text-text-primary text-sm "
                          style={{
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        />
                      </div>
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
                      <input
                        type="text"
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
      </IonContent>
    </IonPage>
  );
}
