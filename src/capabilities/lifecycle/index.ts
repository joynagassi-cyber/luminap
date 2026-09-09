/**
 * Lifecycle Capability — archive/restore with audit trail
 *
 * Universal pattern: any entity with a status lifecycle can be archived
 * and restored. Protected by policy (canArchive/canRestore),
 * persisted via PowerSync, and logged in the audit log.
 *
 * No domain-specific concepts. Entity-type-specific behaviour is
 * provided by the caller through the Policy interface.
 *
 * Usage:
 *   import { lifecycle } from '@/capabilities/lifecycle'
 *   await lifecycle.archive('group', id, 'reason', actorId)
 *   await lifecycle.restore('group', id, 'reason', actorId)
 */

import type { ArchivableEntity } from "@/types";
import { getPowerSyncDatabase } from "@/lib/powersync";
import { getOrganizationId } from "@/lib/orgContext";
import { auditLogRepo } from "@/lib/audit";

/**
 * Policy — entity-type-specific rules for archive/restore
 *
 * Callers register a policy per entity type to enforce domain rules
 * (e.g. cannot archive an event with pending transactions).
 */
export interface LifecyclePolicy {
  /** Check if the entity can be archived. Called before any mutation. */
  canArchive(
    entityId: string,
    context?: Record<string, any>,
  ): Promise<{ ok: boolean; reason?: string }>;
  /** Check if the entity can be restored. Called before any mutation. */
  canRestore(
    entityId: string,
    context?: Record<string, any>,
  ): Promise<{ ok: boolean; reason?: string }>;
  /** Side-effect after archiving (e.g. cascading to related entities). */
  onArchive?: (entityId: string) => Promise<void>;
  /** Side-effect after restoring (e.g. cascading to related entities). */
  onRestore?: (entityId: string) => Promise<void>;
}

/**
 * Supported lifecycle statuses per entity type.
 * Event uses CANCELLED instead of ARCHIVED — handled in transition logic.
 */
type LifecycleStatus = "ACTIVE" | "ARCHIVED" | "CANCELLED";

/** Entity table mapping */
const ENTITY_TABLE: Record<ArchivableEntity, string> = {
  Group: "groups",
  Event: "events",
  Member: "members",
  Account: "accounts",
  Category: "categories",
  Role: "org_units",
};

/**
 * Lifecycle service — gates transitions through policies, persists via PS,
 * and writes audit entries. Zero domain logic.
 */
export class LifecycleService {
  private policies = new Map<ArchivableEntity, LifecyclePolicy>();

  /** Register a policy for an entity type */
  register(entityType: ArchivableEntity, policy: LifecyclePolicy): void {
    this.policies.set(entityType, policy);
  }

  /** Get the registered policy for an entity type (if any) */
  getPolicy(entityType: ArchivableEntity): LifecyclePolicy | undefined {
    return this.policies.get(entityType);
  }

  /**
   * Archive an entity.
   * Throws if the policy rejects the transition.
   */
  async archive(
    entityType: ArchivableEntity,
    entityId: string,
    reason: string,
    actorId: string,
  ): Promise<void> {
    const policy = this.policies.get(entityType);
    if (policy) {
      const check = await policy.canArchive(entityId);
      if (!check.ok)
        throw new Error(check.reason ?? `Cannot archive ${entityType}`);
    }

    const table = ENTITY_TABLE[entityType];
    const db = getPowerSyncDatabase();

    // Read current state
    const result = await db.execute(`SELECT * FROM ${table} WHERE id = ?`, [
      entityId,
    ]);
    const entity: any = result?.result?.[0];
    if (!entity)
      throw new Error(`Entity ${entityType} with id ${entityId} not found`);

    const now = new Date().toISOString();

    // Determine status and archive fields based on entity type
    const isEvent = entityType === "Event";
    const newStatus = isEvent ? "CANCELLED" : ("ARCHIVED" as LifecycleStatus);
    const archivedAt = isEvent ? null : now;
    const archivedBy = isEvent ? null : actorId;
    const archiveReason = isEvent ? null : reason;

    // Build update — only set columns that exist on the table
    const updates: string[] = [`status = ?`, `updated_at = ?`];
    const params: any[] = [newStatus, now];

    if (!isEvent) {
      updates.push("archived_at = ?", "archived_by = ?", "archive_reason = ?");
      params.push(archivedAt, archivedBy, archiveReason);
    }

    params.push(entityId);
    await db.execute(
      `UPDATE ${table} SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    // Write audit
    await auditLogRepo.write({
      orgId: getOrganizationId(),
      transactionId: null,
      userId: actorId,
      actorRoleAtTime: null,
      action: "ARCHIVE",
      entityType,
      entityId,
      beforeState: entity,
      afterState: {
        ...entity,
        status: newStatus,
        archivedAt,
        archivedBy,
        archiveReason,
        updatedAt: now,
      },
      comment: reason,
    });

    // Side-effect
    await policy?.onArchive?.(entityId);
  }

  /**
   * Restore an entity.
   * Throws if the policy rejects the transition.
   */
  async restore(
    entityType: ArchivableEntity,
    entityId: string,
    reason: string,
    actorId: string,
  ): Promise<void> {
    const policy = this.policies.get(entityType);
    if (policy) {
      const check = await policy.canRestore(entityId);
      if (!check.ok)
        throw new Error(check.reason ?? `Cannot restore ${entityType}`);
    }

    const table = ENTITY_TABLE[entityType];
    const db = getPowerSyncDatabase();

    // Read current state
    const result = await db.execute(`SELECT * FROM ${table} WHERE id = ?`, [
      entityId,
    ]);
    const entity: any = result?.result?.[0];
    if (!entity)
      throw new Error(`Entity ${entityType} with id ${entityId} not found`);

    const now = new Date().toISOString();

    // Determine restored status and clear archive fields
    const isEvent = entityType === "Event";
    const newStatus = isEvent ? "PLANIFIED" : ("ACTIVE" as LifecycleStatus);
    const archivedAt = isEvent ? (entity.archived_at ?? null) : null;
    const archivedBy = isEvent ? (entity.archived_by ?? null) : null;
    const archiveReason = isEvent ? (entity.archive_reason ?? null) : null;

    // Build update — clear archive fields for non-event types
    const updates: string[] = [`status = ?`, `updated_at = ?`];
    const params: any[] = [newStatus, now];

    if (!isEvent) {
      updates.push(
        "archived_at = NULL",
        "archived_by = NULL",
        "archive_reason = NULL",
      );
    }

    params.push(entityId);
    await db.execute(
      `UPDATE ${table} SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    // Write audit
    await auditLogRepo.write({
      orgId: getOrganizationId(),
      transactionId: null,
      userId: actorId,
      actorRoleAtTime: null,
      action: "RESTORE",
      entityType,
      entityId,
      beforeState: entity,
      afterState: {
        ...entity,
        status: newStatus,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        updatedAt: now,
      },
      comment: reason,
    });

    // Side-effect
    await policy?.onRestore?.(entityId);
  }

  /**
   * List archived/cancelled entities from audit log.
   */
  async listArchived(filters?: {
    entityType?: ArchivableEntity;
    period?: { start: string; end: string };
    actorId?: string;
  }): Promise<any[]> {
    const entries = await auditLogRepo.list({
      entityType: filters?.entityType,
      startDate: filters?.period?.start,
      endDate: filters?.period?.end,
      actorId: filters?.actorId,
    });
    return entries.filter(
      (e: any) => e.action === "ARCHIVE" || e.action === "RESTORE",
    );
  }

  /**
   * Check if an entity is currently archived/cancelled.
   */
  async isLifecycleActive(
    entityType: ArchivableEntity,
    entityId: string,
  ): Promise<boolean> {
    const table = ENTITY_TABLE[entityType];
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      `SELECT status FROM ${table} WHERE id = ?`,
      [entityId],
    );
    const entity: any = result?.result?.[0];
    if (!entity) return false;
    return entity.status !== "ARCHIVED" && entity.status !== "CANCELLED";
  }
}

/** Singleton instance */
export const lifecycle = new LifecycleService();
