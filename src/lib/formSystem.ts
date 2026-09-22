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
