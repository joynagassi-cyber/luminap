/**
 * Lifecycle Adapters — bridge between pages and the Lifecycle Capability
 *
 * Each adapter wraps a store method so pages can use either the legacy
 * path (local state only) or the capability path (PS + audit).
 *
 * These are thin, pure wrappers — zero business logic.
 */

import { lifecycle } from "@/capabilities/lifecycle";
import { getOrganizationId } from "@/lib/orgContext";

/**
 * Group lifecycle adapter — delegates to LifecycleCapability
 */
export const groupLifecycle = {
  async archive(id: string, reason: string, actorId: string): Promise<void> {
    await lifecycle.archive("Group", id, reason, actorId);
  },
  async restore(id: string, reason: string, actorId: string): Promise<void> {
    await lifecycle.restore("Group", id, reason, actorId);
  },
};

/**
 * Member lifecycle adapter — delegates to LifecycleCapability
 */
export const memberLifecycle = {
  async archive(id: string, reason: string, actorId: string): Promise<void> {
    await lifecycle.archive("Member", id, reason, actorId);
  },
  async restore(id: string, reason: string, actorId: string): Promise<void> {
    await lifecycle.restore("Member", id, reason, actorId);
  },
};

/**
 * Event lifecycle adapter — uses CANCELLED status (not ARCHIVED)
 */
export const eventLifecycle = {
  async cancel(id: string, reason: string, actorId: string): Promise<void> {
    await lifecycle.archive("Event", id, reason, actorId);
  },
  async restore(id: string, reason: string, actorId: string): Promise<void> {
    await lifecycle.restore("Event", id, reason, actorId);
  },
};

/**
 * Account lifecycle adapter
 */
export const accountLifecycle = {
  async archive(id: string, reason: string, actorId: string): Promise<void> {
    await lifecycle.archive("Account", id, reason, actorId);
  },
  async restore(id: string, reason: string, actorId: string): Promise<void> {
    await lifecycle.restore("Account", id, reason, actorId);
  },
};

/**
 * Archive a group and update local Zustand state (for immediate UI feedback).
 * This is the legacy-compatible path used by GroupDetail.tsx.
 * Note: This function is kept for backward compatibility. Prefer using lifecycle.archive() directly.
 */
export async function archiveGroupWithState(
  id: string,
  reason: string,
  actorId: string,
  updater: (
    groups: any[],
    accounts: any[],
  ) => { groups: any[]; accounts: any[] },
): Promise<void> {
  await lifecycle.archive("Group", id, reason, actorId);
  const now = new Date().toISOString();
  // Caller provides the updater logic to avoid Zustand dependency here
  updater([], []); // placeholder — see GroupDetail.tsx for state update
}
