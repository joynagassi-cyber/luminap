import { getPowerSyncDatabase } from "@/lib/powersync";
import { generateId } from "./utils";
import type { AuditEntry } from "@/types";
import { getOrganizationId } from "./orgContext";
import { get, set, invalidate } from "./cache";

/**
 * AuditLogRepository
 * Système d'audit canonique: every mutation is logged with before/after snapshots and actorRoleAtTime.
 * Invariant NeverBreak #6: AuditLog sur toute mutation.
 */
export interface AuditLogRepository {
  write(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void>;
  list(filters?: {
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    action?: string;
    actorId?: string;
  }): Promise<AuditEntry[]>;
  getByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}

const defaultAuditEntry = {
  id: "",
  orgId: getOrganizationId(),
  transactionId: null as string | null,
  userId: "local-user",
  actorRoleAtTime: null as string | null,
  action: "CREATE" as const,
  entityType: "Transaction",
  entityId: "",
  beforeState: null as any,
  afterState: null as any,
  comment: null as string | null,
  createdAt: "",
};

export const auditLogRepo: AuditLogRepository = {
  async write(entry) {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();
    const fullEntry: AuditEntry = {
      ...defaultAuditEntry,
      ...entry,
      id: generateId(),
      createdAt: now,
    };
    await db.execute(
      `INSERT INTO audit_entries (id, org_id, transaction_id, user_id, actor_role_at_time, action, entity_type, entity_id, before_state, after_state, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullEntry.id,
        fullEntry.orgId,
        fullEntry.transactionId,
        fullEntry.userId,
        fullEntry.actorRoleAtTime,
        fullEntry.action,
        fullEntry.entityType,
        fullEntry.entityId,
        JSON.stringify(fullEntry.beforeState),
        JSON.stringify(fullEntry.afterState),
        fullEntry.comment,
        fullEntry.createdAt,
      ],
    );
    invalidate("audit:");
    return Promise.resolve();
  },

  async list(filters = {}) {
    const orgId = getOrganizationId();
    const cacheKey = `audit:list:${JSON.stringify(filters)}`;
    const cached = get<AuditEntry[]>(cacheKey);
    if (cached) return cached;

    const db = getPowerSyncDatabase();
    let query =
      "SELECT id, org_id, transaction_id, user_id, actor_role_at_time, action, entity_type, entity_id, created_at FROM audit_entries";
    const params: any[] = [orgId];
    const conditions: string[] = ["org_id = ?"];

    if (filters.entityType) {
      conditions.push("entity_type = ?");
      params.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push("entity_id = ?");
      params.push(filters.entityId);
    }
    if (filters.startDate) {
      conditions.push("created_at >= ?");
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push("created_at <= ?");
      params.push(filters.endDate);
    }
    if (filters.action) {
      conditions.push("action = ?");
      params.push(filters.action);
    }
    if (filters.actorId) {
      conditions.push("user_id = ?");
      params.push(filters.actorId);
    }

    query += " WHERE " + conditions.join(" AND ");
    query += " ORDER BY created_at DESC";

    const result = await db.execute(query, params);
    const entries = (result?.array || []).map((a: any) => ({
      id: a.id,
      orgId: a.org_id,
      transactionId: a.transaction_id,
      userId: a.user_id,
      actorRoleAtTime: a.actor_role_at_time,
      action: a.action,
      entityType: a.entity_type,
      entityId: a.entity_id,
      beforeState: null,
      afterState: null,
      comment: null,
      createdAt: a.created_at,
    }));
    set(cacheKey, entries, { tier: "cpu" });
    return entries;
  },

  async getByEntity(entityType, entityId) {
    return this.list({ entityType, entityId });
  },
};

/**
 * Convenience function to write an audit entry from any Use Case.
 * Usage:
 *   await writeAudit({
 *     entityType: 'Transaction',
 *     entityId: tx.id,
 *     action: 'CREATE',
 *     actorId: userId,
 *     actorRoleAtTime: user.role,
 *     beforeState: null,
 *     afterState: tx,
 *   });
 */
export async function writeAudit(
  entry: Omit<AuditEntry, "id" | "createdAt">,
): Promise<void> {
  await auditLogRepo.write(entry);
}
