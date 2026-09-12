import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  transactionGuard,
  eventStatusGuard,
  memberStatusGuard,
  WorkflowService,
  type GuardResult,
  type WorkflowGuard,
} from "../workflow";

// ─── In-memory PowerSync mock ──────────────────────────────────────────────
const mockExecute = vi.fn(async (_sql: string, _params?: any[]) => ({
  array: [] as any[],
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({ execute: mockExecute }),
}));

vi.mock("@/lib/audit", () => ({
  auditLogRepo: { write: vi.fn(async () => {}), list: vi.fn(async () => []) },
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "test-org",
}));

// Re-import to get mocked auditLogRepo
import { auditLogRepo } from "@/lib/audit";

describe("workflow capability", () => {
  let service: WorkflowService;
  const mockWrite = vi.mocked(auditLogRepo.write);

  beforeEach(() => {
    service = new WorkflowService();
    mockExecute.mockClear();
    mockWrite.mockClear();
  });

  // ─── transactionGuard ──────────────────────────────────────────

  describe("transactionGuard", () => {
    it("allows transition from DRAFT to PENDING", () => {
      const result = transactionGuard("DRAFT", "PENDING");
      expect(result).toEqual({ allowed: true });
    });

    it("allows transition from PENDING to APPROVED", () => {
      const result = transactionGuard("PENDING", "APPROVED");
      expect(result).toEqual({ allowed: true });
    });

    it("allows transition from PENDING to REJECTED", () => {
      const result = transactionGuard("PENDING", "REJECTED");
      expect(result).toEqual({ allowed: true });
    });

    it("blocks transition AWAY from APPROVED (immutability)", () => {
      const result = transactionGuard("APPROVED", "PENDING");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("TRANSACTION_APPROVED_IMMUTABLE");
    });

    it("blocks transition from APPROVED to DRAFT", () => {
      const result = transactionGuard("APPROVED", "DRAFT");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("TRANSACTION_APPROVED_IMMUTABLE");
    });

    it("allows same-status transition (no-op)", () => {
      const result = transactionGuard("DRAFT", "DRAFT");
      expect(result.allowed).toBe(true);
    });

    it("allows same-status APPROVED transition", () => {
      const result = transactionGuard("APPROVED", "APPROVED");
      expect(result.allowed).toBe(true);
    });

    it("allows transition from REJECTED to DRAFT", () => {
      const result = transactionGuard("REJECTED", "DRAFT");
      expect(result.allowed).toBe(true);
    });

    it("allows transition from DRAFT to APPROVED", () => {
      const result = transactionGuard("DRAFT", "APPROVED");
      expect(result.allowed).toBe(true);
    });
  });

  // ─── WorkflowService.check ─────────────────────────────────────

  describe("WorkflowService.check", () => {
    it("returns allowed=true when no guard is registered", () => {
      const result = service.check("unknown-resource", "DRAFT", "PENDING");
      expect(result).toEqual({ allowed: true });
    });

    it("delegates to the registered guard", () => {
      const customGuard: WorkflowGuard = (_c, t) =>
        t === "COMPLETE"
          ? { allowed: false, reason: "BLOCKED" }
          : { allowed: true };
      service.register("my-resource", customGuard);

      const blocked = service.check("my-resource", "ACTIVE", "COMPLETE");
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toBe("BLOCKED");

      const allowed = service.check("my-resource", "ACTIVE", "PAUSED");
      expect(allowed.allowed).toBe(true);
    });

    it("uses the transaction guard registered at module load", async () => {
      // The singleton 'workflow' registers transactionGuard at load time.
      // Here we verify the same mechanism works on a fresh instance.
      const svc = new WorkflowService();
      svc.register("transaction", transactionGuard);

      const result = svc.check("transaction", "APPROVED", "DRAFT");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("TRANSACTION_APPROVED_IMMUTABLE");
    });
  });

  // ─── eventStatusGuard ──────────────────────────────────────────

  describe("eventStatusGuard", () => {
    it("allows PLANIFIED → ONGOING", () => {
      const result = eventStatusGuard("PLANIFIED", "ONGOING");
      expect(result).toEqual({ allowed: true });
    });

    it("allows PLANIFIED → CANCELLED", () => {
      const result = eventStatusGuard("PLANIFIED", "CANCELLED");
      expect(result).toEqual({ allowed: true });
    });

    it("blocks PLANIFIED → COMPLETED (must go through ONGOING)", () => {
      const result = eventStatusGuard("PLANIFIED", "COMPLETED");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INVALID_EVENT_TRANSITION");
    });

    it("allows ONGOING → COMPLETED", () => {
      const result = eventStatusGuard("ONGOING", "COMPLETED");
      expect(result).toEqual({ allowed: true });
    });

    it("allows ONGOING → CANCELLED", () => {
      const result = eventStatusGuard("ONGOING", "CANCELLED");
      expect(result).toEqual({ allowed: true });
    });

    it("blocks ONGOING → PLANIFIED (no backward transition)", () => {
      const result = eventStatusGuard("ONGOING", "PLANIFIED");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INVALID_EVENT_TRANSITION");
    });

    it("blocks transition away from COMPLETED (terminal state)", () => {
      const result = eventStatusGuard("COMPLETED", "ONGOING");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("EVENT_COMPLETED_IMMUTABLE");
    });

    it("blocks transition away from CANCELLED (terminal state)", () => {
      const result = eventStatusGuard("CANCELLED", "PLANIFIED");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("EVENT_CANCELLED_IMMUTABLE");
    });

    it("allows same-status transition (no-op) for COMPLETED", () => {
      const result = eventStatusGuard("COMPLETED", "COMPLETED");
      expect(result.allowed).toBe(true);
    });

    it("allows same-status transition (no-op) for CANCELLED", () => {
      const result = eventStatusGuard("CANCELLED", "CANCELLED");
      expect(result.allowed).toBe(true);
    });
  });

  // ─── memberStatusGuard ──────────────────────────────────────────

  describe("memberStatusGuard", () => {
    it("allows ACTIVE → INACTIVE", () => {
      const result = memberStatusGuard("ACTIVE", "INACTIVE");
      expect(result).toEqual({ allowed: true });
    });

    it("allows INACTIVE → ACTIVE", () => {
      const result = memberStatusGuard("INACTIVE", "ACTIVE");
      expect(result).toEqual({ allowed: true });
    });

    it("allows same-status transition (no-op) for ACTIVE", () => {
      const result = memberStatusGuard("ACTIVE", "ACTIVE");
      expect(result).toEqual({ allowed: true });
    });

    it("allows same-status transition (no-op) for INACTIVE", () => {
      const result = memberStatusGuard("INACTIVE", "INACTIVE");
      expect(result).toEqual({ allowed: true });
    });

    it("blocks invalid current status", () => {
      const result = memberStatusGuard("UNKNOWN", "ACTIVE");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INVALID_MEMBER_STATUS");
    });

    it("blocks invalid target status", () => {
      const result = memberStatusGuard("ACTIVE", "ARCHIVED");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INVALID_MEMBER_STATUS");
    });

    it("blocks both invalid statuses", () => {
      const result = memberStatusGuard("GHOST", "PHANTOM");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INVALID_MEMBER_STATUS");
    });
  });

  // ─── WorkflowService.transition ────────────────────────────────

  describe("WorkflowService.transition", () => {
    const makeTx = (status: string) => ({ id: "tx-1", status });

    it("returns success=true when transition is allowed", async () => {
      service.register("transaction", transactionGuard);
      const result = await service.transition(
        "transaction",
        makeTx("DRAFT"),
        "PENDING",
      );
      expect(result.success).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("returns success=false when transition is blocked by guard", async () => {
      service.register("transaction", transactionGuard);
      const result = await service.transition(
        "transaction",
        makeTx("APPROVED"),
        "DRAFT",
      );
      expect(result.success).toBe(false);
      expect(result.reason).toBe("TRANSACTION_APPROVED_IMMUTABLE");
    });

    it("returns success=true for same-status transition (no-op)", async () => {
      service.register("transaction", transactionGuard);
      const result = await service.transition(
        "transaction",
        makeTx("DRAFT"),
        "DRAFT",
      );
      expect(result.success).toBe(true);
    });

    it("allows transition when no guard is registered", async () => {
      const result = await service.transition(
        "unknown",
        makeTx("DRAFT"),
        "ANY",
      );
      expect(result.success).toBe(true);
    });

    it("blocks invalid member status transition", async () => {
      const makeMember = (status: string) => ({ id: "m-1", status });
      service.register("member", memberStatusGuard);
      const result = await service.transition(
        "member",
        makeMember("ACTIVE"),
        "ARCHIVED",
      );
      expect(result.success).toBe(false);
      expect(result.reason).toBe("INVALID_MEMBER_STATUS");
    });

    it("allows valid member status transition", async () => {
      const makeMember = (status: string) => ({ id: "m-1", status });
      service.register("member", memberStatusGuard);
      const result = await service.transition(
        "member",
        makeMember("ACTIVE"),
        "INACTIVE",
      );
      expect(result.success).toBe(true);
    });

    // ─── Persistence tests ──────────────────────────────────────────────

    it("ACTIVE→INACTIVE member writes UPDATE SQL with correct params", async () => {
      const makeMember = (status: string) => ({ id: "m-1", status });
      service.register("member", memberStatusGuard);
      const result = await service.transition(
        "member",
        makeMember("ACTIVE"),
        "INACTIVE",
        "user-1",
      );
      expect(result.success).toBe(true);
      const sql = mockExecute.mock.calls[0][0] as string;
      const params = mockExecute.mock.calls[0][1] as any[];
      expect(sql).toMatch(/UPDATE members SET status = \?, updated_at = \?/);
      expect(params[0]).toBe("INACTIVE");
      expect(params[2]).toBe("m-1");
    });

    it("blocked transition writes NOTHING to database", async () => {
      const makeMember = (status: string) => ({ id: "m-1", status });
      service.register("member", memberStatusGuard);
      const result = await service.transition(
        "member",
        makeMember("ACTIVE"),
        "ARCHIVED",
      );
      expect(result.success).toBe(false);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("audit entry is written on successful transition", async () => {
      const makeMember = (status: string) => ({ id: "m-1", status });
      service.register("member", memberStatusGuard);
      await service.transition(
        "member",
        makeMember("ACTIVE"),
        "INACTIVE",
        "user-1",
        { comment: "test comment" },
      );
      expect(mockWrite).toHaveBeenCalled();
      const auditCall = mockWrite.mock.calls[0][0];
      expect(auditCall.action).toBe("STATUS_CHANGE");
      expect(auditCall.entityType).toBe("Member");
      expect(auditCall.entityId).toBe("m-1");
      expect(auditCall.beforeState).toEqual({ status: "ACTIVE" });
      expect(auditCall.afterState).toEqual({ status: "INACTIVE" });
      expect(auditCall.userId).toBe("user-1");
    });

    it("same-status transition does NOT write audit entry but still updates SQL", async () => {
      const makeMember = (status: string) => ({ id: "m-1", status });
      service.register("member", memberStatusGuard);
      const result = await service.transition(
        "member",
        makeMember("ACTIVE"),
        "ACTIVE",
      );
      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    });

    it("event transition writes UPDATE events SQL", async () => {
      const makeEvent = (status: string) => ({ id: "e-1", status });
      service.register("event", eventStatusGuard);
      const result = await service.transition(
        "event",
        makeEvent("PLANIFIED"),
        "ONGOING",
        "user-1",
      );
      expect(result.success).toBe(true);
      const sql = mockExecute.mock.calls[0][0] as string;
      expect(sql).toMatch(/UPDATE events SET status = \?, updated_at = \?/);
      const params = mockExecute.mock.calls[0][1] as any[];
      expect(params[0]).toBe("ONGOING");
    });

    it("unknown resource writes SQL but no table mapping blocks it", async () => {
      service.register("unknown", (_c, _t) => ({ allowed: true }));
      const result = await service.transition(
        "unknown",
        { id: "x-1", status: "A" },
        "B",
        "user-1",
      );
      // No table mapping → returns success but writes nothing
      expect(result.success).toBe(true);
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });
});
