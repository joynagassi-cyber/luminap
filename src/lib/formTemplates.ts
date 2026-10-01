/**
 * Templates de formulaires pré-remplis pour FormBuilder.
 *
 * Chaque template fournit les métadonnées d'un `FormDefinition` (sans id ni
 * orgId : ceux sont attribués à la duplication) + ses champs prêts à l'emploi.
 * L'utilisateur duplique le template depuis le modal de création de
 * FormBuilder et le nomme comme il souhaite.
 */
import type {
  FormDefinition,
  FormFieldDefinition,
} from "@/types";

/** Métadonnées d'un template (tout sauf `id`/`orgId`/`status`/dates). */
export type FormTemplate = {
  key: string;
  name: string;
  description: string;
  targetEntityType?: string;
  fields: FormFieldDefinition[];
};

const F = (
  key: string,
  label: string,
  type: FormFieldDefinition["type"],
  required = false,
  extra: Partial<FormFieldDefinition> = {},
): FormFieldDefinition => ({
  key,
  label,
  type,
  required,
  order: 0,
  options: type === "select" ? undefined : undefined,
  referenceEntityType: type === "reference" ? "member" : undefined,
  ...extra,
});

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    key: "sondage",
    name: "Sondage",
    description: "Collecte l'avis des membres sur un sujet.",
    fields: [
      F("sujet", "Sujet", "text", true),
      F("question", "Question", "textarea", true),
      F("priorite", "Priorité", "select", false, {
        options: ["Haute", "Moyenne", "Basse"],
      }),
      F("commentaire", "Commentaires libres", "textarea", false),
    ],
  },
  {
    key: "enregistrement_membre",
    name: "Enregistrement membre",
    description:
      "Formulaire d'inscription / mise à jour des informations d'un membre.",
    targetEntityType: "member",
    fields: [
      F("full_name", "Nom complet", "text", true, {
        mapsToEntityField: "full_name",
      }),
      F("phone", "Téléphone", "text", true),
      F("email", "E-mail", "text", false),
      F("date_naissance", "Date de naissance", "date", false),
      F("groupe", "Groupe", "select", false, {
        options: ["Catéchèse", "Jeunes", "Chorale", "Diakonats", "Autre"],
      }),
    ],
  },
  {
    key: "rapport_incident",
    name: "Rapport d'incident",
    description: "Signalement d'un incident ou problème technique.",
    fields: [
      F("titre", "Titre", "text", true),
      F("date_incident", "Date de l'incident", "date", true),
      F("lieu", "Lieu", "text", true),
      F("description", "Description détaillée", "textarea", true),
      F("severite", "Sévérité", "select", true, {
        options: ["Faible", "Moyenne", "Élevée", "Critique"],
      }),
      F("photos", "Photos / pièces jointes", "file", false),
    ],
  },
];

/**
 * Duplique un template en `FormDefinition` prête à créer.
 * `orgId` est injecté, un nouvel `id` est généré par l'appelant,
 * les champs reçoivent un `order` séquentiel et des `key` uniques
 * (préfixé par le template pour éviter les collisions de clés).
 */
export function materializeTemplate(
  template: FormTemplate,
  orgId: string,
  overrides: { key?: string; name?: string; description?: string } = {},
): FormDefinition {
  const now = new Date().toISOString();
  const fields = template.fields.map((f, i) => ({ ...f, order: i }));
  return {
    id: "",
    orgId,
    key: overrides.key ?? template.key,
    name: overrides.name ?? template.name,
    description: overrides.description ?? template.description,
    version: 1,
    targetEntityType: template.targetEntityType ?? null,
    status: "DRAFT",
    fields,
    createdAt: now,
    updatedAt: now,
  };
}
