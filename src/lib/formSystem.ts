// Using PowerSync
import { generateId } from "./utils";
import { writeAudit } from "./audit";
import type { FormDefinition, FormSubmission } from "@/types";
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
  for (const field of formDef.fields) {
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
