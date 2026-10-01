// Using PowerSync
import { generateId } from "./utils";
import { writeAudit } from "./audit";
import type { FormDefinition, FormFieldDefinition, FormSubmission } from "@/types";
import { getOrganizationId } from "./orgContext";
import {
  createFormDefinitionPS,
  getFormDefinitionPS,
  listFormDefinitionsPS,
  updateFormDefinitionPS,
  deleteFormDefinitionPS,
  createFormSubmissionPS,
  getFormSubmissionPS,
  listFormSubmissionsPS,
  updateFormSubmissionPS,
  addMemberPS,
  addEventPS,
  createGroupPS,
  executeWrite,
} from "./dataLayer";

/**
 * FormDefinitionRepository — PowerSync-backed
 */
export const formDefinitionRepo = {
  async create(
    def: Omit<FormDefinition, "id" | "createdAt" | "updatedAt">,
  ): Promise<FormDefinition> {
    const entry = await createFormDefinitionPS(def);
    await writeAudit({
      orgId: getOrganizationId(),
      transactionId: null,
      userId: "local-user",
      actorRoleAtTime: null,
      action: "CREATE",
      entityType: "FormDefinition",
      entityId: entry.id,
      beforeState: null,
      afterState: entry,
      comment: null,
    });
    return entry;
  },

  async get(id: string): Promise<FormDefinition | null> {
    return getFormDefinitionPS(id);
  },

  async list(filters?: {
    status?: string;
    orgId?: string;
  }): Promise<FormDefinition[]> {
    return listFormDefinitionsPS(filters);
  },

  async update(
    id: string,
    data: Partial<FormDefinition>,
  ): Promise<FormDefinition | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const updated = await updateFormDefinitionPS(id, data);
    if (!updated) return null;
    await writeAudit({
      orgId: existing.orgId,
      transactionId: null,
      userId: "local-user",
      actorRoleAtTime: null,
      action: "UPDATE",
      entityType: "FormDefinition",
      entityId: id,
      beforeState: existing,
      afterState: updated,
      comment: null,
    });
    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;
    await deleteFormDefinitionPS(id);
    await writeAudit({
      orgId: existing.orgId,
      transactionId: null,
      userId: "local-user",
      actorRoleAtTime: null,
      action: "DELETE",
      entityType: "FormDefinition",
      entityId: id,
      beforeState: existing,
      afterState: null,
      comment: null,
    });
  },
};

/**
 * FormSubmissionRepository — PowerSync-backed
 */
export const formSubmissionRepo = {
  async create(
    sub: Omit<FormSubmission, "id" | "createdAt" | "submittedAt">,
  ): Promise<FormSubmission> {
    const entry = await createFormSubmissionPS(sub);
    await writeAudit({
      orgId: getOrganizationId(),
      transactionId: null,
      userId: sub.submittedBy,
      actorRoleAtTime: null,
      action: "CREATE",
      entityType: "FormSubmission",
      entityId: entry.id,
      beforeState: null,
      afterState: entry,
      comment: null,
    });
    return entry;
  },

  async get(id: string): Promise<FormSubmission | null> {
    return getFormSubmissionPS(id);
  },

  async list(filters?: {
    formDefinitionId?: string;
    status?: string;
    entityId?: string;
  }): Promise<FormSubmission[]> {
    return listFormSubmissionsPS(filters);
  },

  async update(
    id: string,
    data: Partial<FormSubmission>,
  ): Promise<FormSubmission | null> {
    return updateFormSubmissionPS(id, data);
  },
};

/**
 * validateFormSubmission — validates data against form definition schema
 */
export function validateFormSubmission(
  formDef: FormDefinition,
  data: Record<string, any>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  // Un champ conditionnellement MASQUÉ (showIf ne se déclenche pas) n'est
  // ni rendu ni validé — même s'il est `required` : l'UI pré-filtre les
  // champs cachés avant soumission, la lib doit honorer le même contrat.
  const isFieldShown = (field: FormFieldDefinition) =>
    !field.conditional ||
    String(data[field.conditional.showIfField]) ===
      String(field.conditional.showIfValue);
  for (const field of formDef.fields.filter(isFieldShown)) {
    if (
      field.required &&
      (data[field.key] === undefined ||
        data[field.key] === "" ||
        data[field.key] === null)
    ) {
      errors.push(`Field ${field.label} is required`);
    }
    if (
      field.type === "number" &&
      data[field.key] &&
      isNaN(Number(data[field.key]))
    ) {
      errors.push(`Field ${field.label} must be a number`);
    }
    if (
      field.type === "date" &&
      data[field.key] &&
      isNaN(Date.parse(data[field.key]))
    ) {
      errors.push(`Field ${field.label} must be a valid date`);
    }
    if (
      field.validation?.min &&
      data[field.key] !== undefined &&
      Number(data[field.key]) < field.validation.min
    ) {
      errors.push(`Field ${field.label} must be >= ${field.validation.min}`);
    }
    if (
      field.validation?.max &&
      data[field.key] !== undefined &&
      Number(data[field.key]) > field.validation.max
    ) {
      errors.push(`Field ${field.label} must be <= ${field.validation.max}`);
    }
    const val = data[field.key];
    if (val !== undefined && val !== null && val !== "") {
      if (field.validation?.regex) {
        try {
          if (!new RegExp(field.validation.regex).test(String(val))) {
            errors.push(`Field ${field.label} format invalide`);
          }
        } catch {
          /* regex invalide — on ne bloque pas la soumission */
        }
      }
      if (typeof field.validation?.custom === "function") {
        const err = field.validation.custom(val, data);
        if (err) errors.push(err);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * mapFormFields — maps form field data to entity fields
 */
export function mapFormFields(
  formDef: FormDefinition,
  data: Record<string, any>,
): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const field of formDef.fields) {
    if (field.mapsToEntityField) {
      mapped[field.mapsToEntityField] = data[field.key];
    }
  }
  return mapped;
}

/**
 * buildSubmissionsCSV — exports form submissions as a ";"-separated CSV
 * with BOM prefix. Headers are the labels of the form definition fields
 * (falling back to the field keys); one row per submission. Values
 * containing the separator or a quote are wrapped in quotes, with
 * embedded quotes doubled (same escaping as exportCSV).
 */
export function buildSubmissionsCSV(
  rows: FormSubmission[],
  formDef: FormDefinition,
): string {
  const fields = [...formDef.fields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const header = fields.map((f) => f.label || f.key);

  const escapeValue = (v: unknown): string => {
    if (v == null) return "";
    const text =
      typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[";]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const parseData = (sub: FormSubmission): Record<string, any> => {
    if (sub.data && typeof sub.data === "object") return sub.data;
    try {
      return JSON.parse(typeof sub.data === "string" ? sub.data : "{}");
    } catch {
      return {};
    }
  };

  const body = rows.map((sub) => {
    const data = parseData(sub);
    return fields.map((f) => escapeValue(data[f.key])).join(";");
  });

  return "﻿" + [header.join(";"), ...body].join("\n");
}

/**
 * dispatchFormSubmission — écrit le résultat d'une soumission dans l'entité
 * cible du formulaire (si `definition.targetEntityType` est défini et que
 * des champs sont mappés via `mapsToEntityField`, cf. `mapFormFields`).
 *
 * Le `submission` est l'enregistrement déjà écrit dans form_submissions ;
 * le champ mappé est recalculé ici via `mapFormFields` (DRY avec le
 * calcul de FormFill) puis converti en colonnes snake_case des tables PS.
 *
 * Retour : { linkedEntityType, linkedEntityId } — identifiants de l'entité
 * créée (si dispatch réussi), null sinon. Le résultat est aussi réécrit
 * dans la soumission (statut PROCESSED) via `updateFormSubmissionPS`
 * pour la traçabilité ; en cas d'échec (base hors-ligne, type inconnu)
 * la soumission reste retraceable dans form_submissions.
 */
export async function dispatchFormSubmission(
  submission: FormSubmission,
  definition: FormDefinition,
): Promise<{ linkedEntityType: string | null; linkedEntityId: string | null }> {
  const none = { linkedEntityType: null, linkedEntityId: null };

  if (!definition.targetEntityType) return none;

  // Recompose le mapping champs → entité à partir de la définition :
  // les données du formulaire vivent dans submission.data.
  const mapped = mapFormFields(definition, submission.data ?? {});
  if (Object.keys(mapped).length === 0) return none;

  // La soumission porte déjà org_id + created_from_form_submission_id en
  // camelCase (FormFill) : on convertit tout le payload en snake_case
  // pour coller aux tables PowerSync.
  const toSnakeCase = (key: string) =>
    key.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
  const snake: Record<string, any> = {};
  for (const [k, v] of Object.entries({
    orgId: getOrganizationId(),
    ...mapped,
    createdFromFormSubmissionId: submission.id,
  })) {
    snake[toSnakeCase(k)] = v;
  }

  let linkedEntityId: string | null = null;
  try {
    switch (definition.targetEntityType) {
      case "member": {
        const params: Record<string, any> = {
          ...snake,
          first_name: snake.first_name ?? "",
          last_name: snake.last_name ?? "",
          phone: snake.phone ?? "",
          email: snake.email ?? "",
          status: snake.status ?? "ACTIVE",
          joined_at: snake.joined_at ?? new Date().toISOString(),
          archived_at: snake.archived_at ?? null,
          archived_by: snake.archived_by ?? null,
          archive_reason: snake.archive_reason ?? null,
        };
        linkedEntityId = await addMemberPS(params as any);
        break;
      }
      case "event": {
        const params: Record<string, any> = {
          ...snake,
          name: snake.name ?? "",
          description: snake.description ?? "",
          start_date: snake.start_date ?? null,
          end_date: snake.end_date ?? null,
          status: snake.status ?? "PLANIFIED",
          type: snake.type ?? "GENERIC",
          budget: snake.budget ?? 0,
          budget_items: snake.budget_items ?? null,
        };
        linkedEntityId = await addEventPS(params as any);
        break;
      }
      case "group": {
        // Cascade complète (org_units + groups + accounts + caisses) dans
        // createGroupPS ; le nom du groupe vient du champ mappé `name`
        // (snake_case) et la description du champ mappé `description`.
        linkedEntityId = await createGroupPS({
          name: String(snake.name ?? ""),
          type: "GROUP",
          description: String(snake.description ?? ""),
        });
        break;
      }
      case "account": {
        // Pas de createAccountPS dans dataLayer : INSERT direct via
        // executeWrite (colonnes conformes au schéma de la table
        // `accounts` : owner_type IN ('ORGANIZATION','GROUP')).
        const id = generateId();
        const now = new Date().toISOString();
        await executeWrite(
          `INSERT INTO accounts (
            id, org_id, owner_type, owner_id, name, currency, status,
            archived_at, archived_by, archive_reason, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            snake.org_id ?? getOrganizationId(),
            snake.owner_type ?? "ORGANIZATION",
            snake.owner_id ?? getOrganizationId(),
            snake.name ?? "",
            snake.currency ?? "XOF",
            "ACTIVE",
            null,
            null,
            null,
            now,
            now,
          ],
        );
        linkedEntityId = id;
        break;
      }
      default:
        console.error(
          `[formSystem] targetEntityType inconnu : ${definition.targetEntityType}`,
        );
        return none;
    }
  } catch (e) {
    // Pas bloquant — la soumission reste dans form_submissions.
    console.error("[formSystem] dispatch failed", e);
    return none;
  }

  // Traçabilité : on relie l'entité créée à la soumission.
  try {
    await updateFormSubmissionPS(submission.id, {
      linkedEntityType: definition.targetEntityType,
      linkedEntityId,
      status: "PROCESSED",
    });
  } catch (e) {
    // Non bloquant : le dispatch lui-même a réussi.
    console.error("[formSystem] mise à jour de la soumission (traçabilité) échouée", e);
  }

  return {
    linkedEntityType: definition.targetEntityType,
    linkedEntityId,
  };
}
