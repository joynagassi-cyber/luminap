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

// O1 closed: `archiveGroupWithState` was a no-op placeholder whose
// `updater([], [])` mutated nothing. No caller remained (GroupDetail uses
// `lifecycle.archive` directly and PowerSync local reactivity for
// refresh), so the dead function has been removed. Archival is always
// persisted via PowerSync + audit — there is no local-only state to
// update.
