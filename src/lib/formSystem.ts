import { db } from './db';
import { generateId } from './utils';
import type { FormDefinition, FormSubmission } from '@/types';
import type { StoreName } from './db';

/**
 * FormDefinitionRepository
 */
export const formDefinitionRepo = {
  async create(def: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<FormDefinition> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry: FormDefinition = { ...def, id, createdAt: now, updatedAt: now };
    await db.put('form_definitions' as StoreName, entry);
    return entry;
  },

  async get(id: string): Promise<FormDefinition | null> {
    return db.get<FormDefinition>('form_definitions' as StoreName, id).catch(() => null);
  },

  async list(filters?: { status?: string; orgId?: string }): Promise<FormDefinition[]> {
    const all = await db.getAll<FormDefinition>('form_definitions' as StoreName).catch(() => [] as FormDefinition[]);
    return all.filter(f => {
      if (filters?.status && f.status !== filters.status) return false;
      if (filters?.orgId && f.orgId !== filters.orgId) return false;
      return true;
    });
  },

  async update(id: string, data: Partial<FormDefinition>): Promise<FormDefinition | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    return { ...existing, ...data, updatedAt: new Date().toISOString() };
  },

  async delete(id: string): Promise<void> {
    await db.delete('form_definitions' as StoreName, id);
  },
};

/**
 * FormSubmissionRepository
 */
export const formSubmissionRepo = {
  async create(sub: Omit<FormSubmission, 'id' | 'createdAt' | 'submittedAt'>): Promise<FormSubmission> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry: FormSubmission = { ...sub, id, submittedAt: now, createdAt: now };
    await db.put('form_submissions' as StoreName, entry);
    return entry;
  },

  async get(id: string): Promise<FormSubmission | null> {
    return db.get<FormSubmission>('form_submissions' as StoreName, id).catch(() => null);
  },

  async list(filters?: { formDefinitionId?: string; status?: string; entityId?: string }): Promise<FormSubmission[]> {
    const all = await db.getAll<FormSubmission>('form_submissions' as StoreName).catch(() => [] as FormSubmission[]);
    return all.filter(s => {
      if (filters?.formDefinitionId && s.formDefinitionId !== filters.formDefinitionId) return false;
      if (filters?.status && s.status !== filters.status) return false;
      if (filters?.entityId && s.linkedEntityId !== filters.entityId) return false;
      return true;
    });
  },

  async update(id: string, data: Partial<FormSubmission>): Promise<FormSubmission | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    return { ...existing, ...data };
  },
};

/**
 * validateFormSubmission — validates data against form definition schema
 */
export function validateFormSubmission(
  formDef: FormDefinition,
  data: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const field of formDef.fields) {
    if (field.required && !data[field.key]) {
      errors.push(`Field ${field.label} is required`);
    }
    if (field.type === 'number' && data[field.key] && isNaN(Number(data[field.key]))) {
      errors.push(`Field ${field.label} must be a number`);
    }
    if (field.type === 'date' && data[field.key] && isNaN(Date.parse(data[field.key]))) {
      errors.push(`Field ${field.label} must be a valid date`);
    }
    if (field.validation?.min && data[field.key] !== undefined && Number(data[field.key]) < field.validation.min) {
      errors.push(`Field ${field.label} must be >= ${field.validation.min}`);
    }
    if (field.validation?.max && data[field.key] !== undefined && Number(data[field.key]) > field.validation.max) {
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
  data: Record<string, any>
): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const field of formDef.fields) {
    if (field.mapsToEntityField) {
      mapped[field.mapsToEntityField] = data[field.key];
    }
  }
  return mapped;
}
