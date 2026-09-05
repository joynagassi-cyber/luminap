import { db } from './db';
import { generateId } from './utils';
import type { CustomFieldDefinition, CustomFieldValue } from '@/types';
import type { StoreName } from './db';

export const customFieldRepo = {
  async create(def: Omit<CustomFieldDefinition, 'id'>): Promise<CustomFieldDefinition> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry = { ...def, id, createdAt: now, updatedAt: now } as CustomFieldDefinition;
    await db.put('custom_field_definitions' as StoreName, entry);
    return entry;
  },
  async get(id: string): Promise<CustomFieldDefinition | null> {
    return db.get<CustomFieldDefinition>('custom_field_definitions' as StoreName, id).catch(() => null);
  },
  async list(entityType?: string): Promise<CustomFieldDefinition[]> {
    const all = await db.getAll<CustomFieldDefinition>('custom_field_definitions' as StoreName).catch(() => [] as CustomFieldDefinition[]);
    if (!entityType) return all;
    return all.filter(f => f.entityType === entityType);
  },
  async update(id: string, data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    return { ...existing, ...data };
  },
  async delete(id: string): Promise<void> {
    await db.delete('custom_field_definitions' as StoreName, id);
  },
};

export const customFieldValueRepo = {
  async upsert(value: Omit<CustomFieldValue, 'id'>): Promise<CustomFieldValue> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry = { ...value, id, createdAt: now, updatedAt: now } as CustomFieldValue;
    await db.put('custom_field_values' as StoreName, entry);
    return entry;
  },
  async getByEntity(entityType: string, entityId: string): Promise<CustomFieldValue[]> {
    const all = await db.getAll<CustomFieldValue>('custom_field_values' as StoreName).catch(() => [] as CustomFieldValue[]);
    return all.filter(v => v.entityType === entityType && v.entityId === entityId);
  },
  async delete(id: string): Promise<void> {
    await db.delete('custom_field_values' as StoreName, id);
  },
};
