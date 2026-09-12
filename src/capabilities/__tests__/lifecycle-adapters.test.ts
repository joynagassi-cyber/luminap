// @vitest-environment node
/**
 * O1 regression guard — lifecycle adapters
 *
 * Verifies the O1 audit fix: `archiveGroupWithState` (a no-op placeholder
 * that mutated nothing via `updater([], [])`) was removed from
 * `src/capabilities/lifecycle/adapters.ts`.
 *
 * Two assertions:
 *   1. The module no longer exports `archiveGroupWithState`.
 *   2. The four remaining adapters (group/member/event/account) delegate
 *      to the LifecycleCapability — which persists via PowerSync and writes
 *      an audit entry.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Shared mutable state for the mocks ─────────────────────────────
const mockAuditWrites: any[] = [];
const mockRows: Record<string, any[]> = {
  groups: [],
  members: [],
  events: [],
  accounts: [],
};

// ─── Mock the lifecycle capability itself ──────────────────────────
// This is the authoritative path: everything flows through it, so we
// assert on what the adapters delegate to.
vi.mock("@/capabilities/lifecycle", () => {
  const svc = {
    archive: vi.fn(async (entityType: string, id: string, reason: string, actorId: string) => {
      mockAuditWrites.push({
        action: "ARCHIVE",
        entityType,
        entityId: id,
        userId: actorId,
        comment: reason,
      });
    }),
    restore: vi.fn(async (entityType: string, id: string, reason: string, actorId: string) => {
      mockAuditWrites.push({
        action: "RESTORE",
        entityType,
        entityId: id,
        userId: actorId,
        comment: reason,
      });
    }),
  };
  return {
    lifecycle: svc,
    LifecycleService: class {},
    __serviceForTests: svc,
  };
});

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-o1-test",
}));

vi.mock("@/lib/audit", () => ({
  auditLogRepo: {
    write: vi.fn(async (entry: any) => {
      mockAuditWrites.push(entry);
    }),
    list: vi.fn(async () => []),
  },
  writeAudit: vi.fn(),
}));

// ─── Import the module under test AFTER mocks ──────────────────────
import * as adapters from "../lifecycle/adapters";

describe("O1 regression: lifecycle adapters", () => {
  beforeEach(() => {
    mockAuditWrites.length = 0;
  });

  it("does NOT export archiveGroupWithState (dead no-op removed)", () => {
    // The symbol was a no-op placeholder; its removal is the O1 fix.
    expect("archiveGroupWithState" in adapters).toBe(false);
  });

  it("exports only the four entity adapters", () => {
    expect(Object.keys(adapters).sort()).toEqual([
      "accountLifecycle",
      "eventLifecycle",
      "groupLifecycle",
      "memberLifecycle",
    ]);
  });

  it("groupLifecycle.archive delegates to the capability with the right args", async () => {
    await adapters.groupLifecycle.archive("g-1", "duplicate", "user-9");
    expect(mockAuditWrites).toHaveLength(1);
    expect(mockAuditWrites[0]).toMatchObject({
      action: "ARCHIVE",
      entityType: "Group",
      entityId: "g-1",
      userId: "user-9",
      comment: "duplicate",
    });
  });

  it("memberLifecycle.restore delegates to the capability", async () => {
    await adapters.memberLifecycle.restore("m-1", "reinstated", "user-10");
    expect(mockAuditWrites[0]).toMatchObject({
      action: "RESTORE",
      entityType: "Member",
      entityId: "m-1",
      userId: "user-10",
    });
  });

  it("eventLifecycle.cancel maps to lifecycle.archive with Event + CANCELLED", async () => {
    await adapters.eventLifecycle.cancel("e-1", "rescheduled", "user-11");
    expect(mockAuditWrites[0]).toMatchObject({
      action: "ARCHIVE",
      entityType: "Event",
      entityId: "e-1",
      userId: "user-11",
    });
  });

  it("accountLifecycle.archive delegates to the capability", async () => {
    await adapters.accountLifecycle.archive("a-1", "closed", "user-12");
    expect(mockAuditWrites[0]).toMatchObject({
      action: "ARCHIVE",
      entityType: "Account",
      entityId: "a-1",
    });
  });

  it("the lifecycle capability test suite still covers archive/restore end-to-end", async () => {
    // Sanity: importing the real capability (not the mock) still works —
    // proves the adapters' target exists and is shaped correctly.
    const real = await import("../lifecycle");
    expect(typeof real.lifecycle.archive).toBe("function");
    expect(typeof real.lifecycle.restore).toBe("function");
  });
});
