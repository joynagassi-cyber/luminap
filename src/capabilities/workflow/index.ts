/**
 * Workflow Capability — status transitions with immutability guards
 *
 * Universal pattern: any resource can have a status lifecycle with
 * protected transitions. No domain-specific concepts.
 *
 * Usage:
 *   import { workflow } from '@/capabilities/workflow'
 *   await workflow.transition('transaction', tx.id, 'APPROVED', userId)
 */


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
  context?: Record<string, any>
) => GuardResult;

/**
 * Default guard for events — status transitions PLANIFIED → ONGOING → COMPLETED
 * Terminal states (COMPLETED, CANCELLED) are immutable.
 */
export const eventStatusGuard: WorkflowGuard = (
  currentStatus,
  targetStatus
): GuardResult => {
  // Terminal states are immutable
  if (currentStatus === 'COMPLETED' && targetStatus !== 'COMPLETED') {
    return { allowed: false, reason: 'EVENT_COMPLETED_IMMUTABLE' };
  }
  if (currentStatus === 'CANCELLED' && targetStatus !== 'CANCELLED') {
    return { allowed: false, reason: 'EVENT_CANCELLED_IMMUTABLE' };
  }
  // Already at target — no-op, allowed
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }
  // Define allowed transitions per current status
  const allowedTransitions: Record<string, string[]> = {
    PLANIFIED: ['ONGOING', 'CANCELLED'],
    ONGOING: ['COMPLETED', 'CANCELLED'],
  };
  const allowed = allowedTransitions[currentStatus]?.includes(targetStatus) ?? false;
  if (!allowed) {
    return { allowed: false, reason: 'INVALID_EVENT_TRANSITION' };
  }
  return { allowed: true };
};

/**
 * Default guard for transactions (domain-agnostic core)
 */
export const transactionGuard: WorkflowGuard = (
  currentStatus,
  targetStatus
): GuardResult => {
  // APPROVED transactions are immutable
  if (currentStatus === 'APPROVED' && targetStatus !== 'APPROVED') {
    return { allowed: false, reason: 'TRANSACTION_APPROVED_IMMUTABLE' };
  }
  // Already at target — no-op, allowed
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }
  return { allowed: true };
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
  check(resource: string, currentStatus: string, targetStatus: string): GuardResult {
    const guard = this.guards.get(resource);
    if (!guard) return { allowed: true }; // no guard = allow
    return guard(currentStatus, targetStatus);
  }

  /**
   * Perform a guarded status transition
   * Returns null if transition is blocked
   */
  async transition<T extends { id: string; status: string }>(
    resource: string,
    entity: T,
    targetStatus: string,
    context?: Record<string, any>
  ): Promise<{ success: boolean; reason?: string }> {
    const currentStatus = entity.status;
    const result = this.check(resource, currentStatus, targetStatus);
    if (!result.allowed) {
      return { success: false, reason: result.reason };
    }
    // Transition allowed — caller performs the actual state change
    return { success: true };
  }
}

/** Singleton instance */
export const workflow = new WorkflowService();

// Register default guards at module load
workflow.register('transaction', transactionGuard);
workflow.register('event', eventStatusGuard);
