/**
 * Workflow Capability — status transitions with immutability guards
 *
 * Universal pattern: any resource can have a status lifecycle with
 * protected transitions. Guards run first; on success the transition
 * is persisted via PowerSync and logged in the audit log.
 *
 * Usage:
 *   import { workflow } from '@/capabilities/workflow'
 *   await workflow.transition('transaction', tx, 'APPROVED', userId)
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import { auditLogRepo } from "@/lib/audit";
import { getOrganizationId } from "@/lib/orgContext";

/**
 * Guard result — standardised across all workflow implementations
 */
export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Workflow guard — checks if a status transition is allowed
 */
export type WorkflowGuard = (
  currentStatus: string,
  targetStatus: string,
  context?: Record<string, any>,
) => GuardResult;

/**
 * Default guard for events — status transitions PLANIFIED → ONGOING → COMPLETED
 * Terminal states (COMPLETED, CANCELLED) are immutable.
 */
export const eventStatusGuard: WorkflowGuard = (
  currentStatus,
  targetStatus,
): GuardResult => {
  // Terminal states are immutable
  if (currentStatus === "COMPLETED" && targetStatus !== "COMPLETED") {
    return { allowed: false, reason: "EVENT_COMPLETED_IMMUTABLE" };
  }
  if (currentStatus === "CANCELLED" && targetStatus !== "CANCELLED") {
    return { allowed: false, reason: "EVENT_CANCELLED_IMMUTABLE" };
  }
  // Already at target — no-op, allowed
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }
  // Define allowed transitions per current status
  const allowedTransitions: Record<string, string[]> = {
    PLANIFIED: ["ONGOING", "CANCELLED"],
    ONGOING: ["COMPLETED", "CANCELLED"],
  };
  const allowed =
    allowedTransitions[currentStatus]?.includes(targetStatus) ?? false;
  if (!allowed) {
    return { allowed: false, reason: "INVALID_EVENT_TRANSITION" };
  }
  return { allowed: true };
};

/**
 * Default guard for members — status transitions ACTIVE ↔ INACTIVE
 */
export const memberStatusGuard: WorkflowGuard = (
  currentStatus,
  targetStatus,
): GuardResult => {
  // Valid member statuses
  const validStatuses = ["ACTIVE", "INACTIVE"];
  if (
    !validStatuses.includes(currentStatus) ||
    !validStatuses.includes(targetStatus)
  ) {
    return { allowed: false, reason: "INVALID_MEMBER_STATUS" };
  }
  // Already at target — no-op, allowed
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }
  // ACTIVE and INACTIVE are mutually reversible
  return { allowed: true };
};
export const transactionGuard: WorkflowGuard = (
  currentStatus,
  targetStatus,
): GuardResult => {
  // APPROVED transactions are immutable
  if (currentStatus === "APPROVED" && targetStatus !== "APPROVED") {
    return { allowed: false, reason: "TRANSACTION_APPROVED_IMMUTABLE" };
  }
  // Already at target — no-op, allowed
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }
  return { allowed: true };
};

/** Map resource type to PowerSync table name */
const RESOURCE_TABLE: Record<string, string> = {
  transaction: "transactions",
  event: "events",
  member: "members",
};

/**
 * Workflow service — applies guards then performs transition
 */
export class WorkflowService {
  private guards: Map<string, WorkflowGuard> = new Map();

  /** Register a guard for a resource type */
  register(resource: string, guard: WorkflowGuard): void {
    this.guards.set(resource, guard);
  }

  /**
   * Check if a transition is allowed (dry-run)
   */
  check(
    resource: string,
    currentStatus: string,
    targetStatus: string,
  ): GuardResult {
    const guard = this.guards.get(resource);
    if (!guard) return { allowed: true }; // no guard = allow
    return guard(currentStatus, targetStatus);
  }

  /**
   * Perform a guarded status transition and persist it via PowerSync.
   * Writes an audit entry on success.
   * Returns null if transition is blocked by the guard.
   */
  async transition<T extends { id: string; status: string }>(
    resource: string,
    entity: T,
    targetStatus: string,
    actorId?: string,
    context?: Record<string, any>,
  ): Promise<{ success: boolean; reason?: string }> {
    const currentStatus = entity.status;
    const result = this.check(resource, currentStatus, targetStatus);
    if (!result.allowed) {
      return { success: false, reason: result.reason };
    }
    // Same-status no-op — still worth auditing
    const sameStatus = currentStatus === targetStatus;

    const table = RESOURCE_TABLE[resource];
    if (!table) {
      // Unknown resource — guard passed but we can't persist
      return { success: true };
    }

    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();

    await db.execute(
      `UPDATE ${table} SET status = ?, updated_at = ? WHERE id = ?`,
      [targetStatus, now, entity.id],
    );

    if (!sameStatus) {
      await auditLogRepo.write({
        orgId: getOrganizationId(),
        transactionId: null,
        userId: actorId ?? "local-user",
        actorRoleAtTime: context?.actorRoleAtTime ?? null,
        action: "STATUS_CHANGE",
        entityType: resource.charAt(0).toUpperCase() + resource.slice(1),
        entityId: entity.id,
        beforeState: { status: currentStatus },
        afterState: { status: targetStatus },
        comment: context?.comment ?? null,
      });
    }

    return { success: true };
  }
}

/** Singleton instance */
export const workflow = new WorkflowService();

// Register default guards at module load
workflow.register("transaction", transactionGuard);
workflow.register("event", eventStatusGuard);
workflow.register("member", memberStatusGuard);
