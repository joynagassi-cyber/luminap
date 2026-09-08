// Using PowerSync
import { generateId } from './utils';
import { writeAudit } from './audit';
import type { CustomFieldDefinition, CustomFieldValue } from '@/types';
import { getOrganizationId } from './orgContext';
import {
  createCustomFieldDefinitionPS,
  getCustomFieldDefinitionPS,
  listCustomFieldDefinitionsPS,
  updateCustomFieldDefinitionPS,
  deleteCustomFieldDefinitionPS,
  upsertCustomFieldValuePS,
  getCustomFieldValuesByEntityPS,
  deleteCustomFieldValuePS,
} from '@/lib/dataLayer';

export const customFieldRepo = {
  async create(def: Omit<CustomFieldDefinition, 'id'>): Promise<CustomFieldDefinition> {
    const entry = await createCustomFieldDefinitionPS(def);
    await writeAudit({
      orgId: getOrganizationId(),
      transactionId: null,
      userId: 'local-user',
      actorRoleAtTime: null,
      action: 'CREATE',
      entityType: 'CustomFieldDefinition',
      entityId: entry.id,
      beforeState: null,
      afterState: entry,
      comment: null,
    });
    return entry;
  },
  async get(id: string): Promise<CustomFieldDefinition | null> {
    return getCustomFieldDefinitionPS(id);
  },
  async list(entityType?: string): Promise<CustomFieldDefinition[]> {
    return listCustomFieldDefinitionsPS(entityType);
  },
  async update(id: string, data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition | null> {
    return updateCustomFieldDefinitionPS(id, data);
  },
  async delete(id: string): Promise<void> {
    await deleteCustomFieldDefinitionPS(id);
  },
};

export const customFieldValueRepo = {
  async upsert(value: Omit<CustomFieldValue, 'id'>): Promise<CustomFieldValue> {
    const entry = await upsertCustomFieldValuePS(value);
    return entry;
  },
  async getByEntity(entityType: string, entityId: string): Promise<CustomFieldValue[]> {
    return getCustomFieldValuesByEntityPS(entityType, entityId);
  },
  async delete(id: string): Promise<void> {
    await deleteCustomFieldValuePS(id);
  },
};
