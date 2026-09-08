/**
 * @deprecated Use src/capabilities/lifecycle/index.ts (LifecycleService) instead.
 * ArchiveRegistry is a legacy implementation superseded by LifecycleService.
 * This file will be removed in a future stabilization phase.
 */
import { getPowerSyncDatabase } from '@/lib/powersync';
import { generateId } from './utils';
import { auditLogRepo } from './audit';
import type { ArchivableEntity } from '@/types';
import { getOrganizationId } from './orgContext';

export interface ArchivePolicy {
  canArchive(entityId: string): Promise<{ ok: boolean; reason?: string }>;
  onArchive?: (entityId: string) => Promise<void>;
  onRestore?: (entityId: string) => Promise<void>;
  canRestore(entityId: string): Promise<{ ok: boolean; reason?: string }>;
}

const ENTITY_STORE_MAP: Record<ArchivableEntity, string> = {
  Group: 'groups',
  Event: 'events',
  Member: 'members',
  Account: 'accounts',
  Category: 'categories',
  Role: 'org_units',
};

export class ArchiveRegistry {
  private policies = new Map<ArchivableEntity, ArchivePolicy>();

  register(entityType: ArchivableEntity, policy: ArchivePolicy): void {
    this.policies.set(entityType, policy);
  }

  async archive(entityType: ArchivableEntity, entityId: string, reason: string, actorId: string): Promise<void> {
    const policy = this.policies.get(entityType);
    if (!policy) throw new Error(`No archive policy for ${entityType}`);
    const check = await policy.canArchive(entityId);
    if (!check.ok) throw new Error(check.reason ?? 'Cannot archive');

    const storeName = ENTITY_STORE_MAP[entityType];
    const db = getPowerSyncDatabase();
    const result = await db.execute(`SELECT * FROM ${storeName} WHERE id = ?`, [entityId]);
    const entity: any = result?.result?.[0];
    if (!entity) throw new Error(`Entity ${entityType} with id ${entityId} not found`);

    const now = new Date().toISOString();
    const archivedEntity = { ...entity, status: 'ARCHIVED', archivedAt: now, archivedBy: actorId, archiveReason: reason, updatedAt: now };
    await db.execute(
      `UPDATE ${storeName} SET status = 'ARCHIVED', archived_at = ?, archived_by = ?, archive_reason = ?, updated_at = ? WHERE id = ?`,
      [now, actorId, reason, now, entityId]
    );
    await policy.onArchive?.(entityId);
    await auditLogRepo.write({ orgId: getOrganizationId(), transactionId: null, userId: actorId, actorRoleAtTime: null, action: 'ARCHIVE', entityType, entityId, beforeState: entity, afterState: archivedEntity, comment: reason });
  }

  async restore(entityType: ArchivableEntity, entityId: string, reason: string, actorId: string): Promise<void> {
    const policy = this.policies.get(entityType);
    if (!policy) throw new Error(`No archive policy for ${entityType}`);
    const check = await policy.canRestore(entityId);
    if (!check.ok) throw new Error(check.reason ?? 'Cannot restore');

    const storeName = ENTITY_STORE_MAP[entityType];
    const db = getPowerSyncDatabase();
    const result = await db.execute(`SELECT * FROM ${storeName} WHERE id = ?`, [entityId]);
    const entity: any = result?.result?.[0];
    if (!entity) throw new Error(`Entity ${entityType} with id ${entityId} not found`);

    const now = new Date().toISOString();
    const restoredEntity = { ...entity, status: 'ACTIVE', archivedAt: null, archivedBy: null, archiveReason: null, updatedAt: now };
    await db.execute(
      `UPDATE ${storeName} SET status = 'ACTIVE', archived_at = NULL, archived_by = NULL, archive_reason = NULL, updated_at = ? WHERE id = ?`,
      [now, entityId]
    );
    await policy.onRestore?.(entityId);
    await auditLogRepo.write({ orgId: getOrganizationId(), transactionId: null, userId: actorId, actorRoleAtTime: null, action: 'RESTORE', entityType, entityId, beforeState: entity, afterState: restoredEntity, comment: reason });
  }

  async listArchived(filters?: { entityType?: ArchivableEntity; period?: { start: string; end: string }; actorId?: string }): Promise<any[]> {
    const entries = await auditLogRepo.list({ entityType: filters?.entityType, startDate: filters?.period?.start, endDate: filters?.period?.end });
    return entries.filter((e: any) => e.action === 'ARCHIVE' || e.action === 'RESTORE');
  }
}

export const archiveRegistry = new ArchiveRegistry();
