/**
 * T10 — Central administration capability tests.
 *
 * Covers the lifecycle/delegation actions in `organization/central.ts` and
 * verifies that every mutation is journalized through the canonical audit
 * system (Invariant NeverBreak #6). The PS write ops and the audit logger
 * are mocked so we assert on the *composition* (correct op + correct audit),
 * not on a real PowerSync DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ─────────────────────────────────────────────────────────────────
const calls: Array<[string, ...any[]]> = [];
vi.mock("@/lib/dataLayer", () => ({
  createOrganizationPS: vi.fn(async (input: any) => {
    calls.push(["create", input]);
    return input.id;
  }),
  setOrganizationStatusPS: vi.fn(async (orgId: string, status: string, actorId: string, reason?: string) => {
    calls.push(["status", orgId, status, actorId, reason]);
  }),
  grantOrgAdminPS: vi.fn(async (input: any) => {
    calls.push(["grant", input]);
    return "grant-1";
  }),
  revokeOrgAdminPS: vi.fn(async (grantId: string) => {
    calls.push(["revoke", grantId]);
  }),
}));

const auditEntries: any[] = [];
vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn(async (entry: any) => {
    auditEntries.push(entry);
  }),
}));

const dbRows: any[] = [];
vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: async () => ({ array: dbRows }),
  }),
}));

import {
  suspendOrganization,
  reactivateOrganization,
  archiveOrganization,
  createOrganization,
  assignOrgAdmin,
  revokeOrgAdmin,
  getOrgStats,
  getRecentActivity,
} from "../organization/central";

// ─── Lifecycle actions ────────────────────────────────────────────────────

describe("central org lifecycle", () => {
  beforeEach(() => {
    calls.length = 0;
    auditEntries.length = 0;
    dbRows.length = 0;
  });

  it("suspendOrganization → SUSPENDED op + audit UPDATE", async () => {
    await suspendOrganization("org-A", "actor-1", { id: "org-A", status: "ACTIVE" } as any);
    expect(calls).toContainEqual(["status", "org-A", "SUSPENDED", "actor-1", undefined]);
    expect(auditEntries[0]).toMatchObject({
      orgId: "org-A",
      userId: "actor-1",
      actorRoleAtTime: "CENTRAL_ADMIN",
      action: "UPDATE",
      entityType: "Organization",
      entityId: "org-A",
    });
    expect(auditEntries[0].afterState).toEqual({ status: "SUSPENDED" });
  });

  it("reactivateOrganization → ACTIVE op (clears suspension)", async () => {
    await reactivateOrganization("org-A", "actor-1");
    expect(calls[0][0]).toBe("status");
    expect(calls[0][2]).toBe("ACTIVE");
    expect(auditEntries[0].afterState).toEqual({ status: "ACTIVE" });
  });

  it("archiveOrganization → ARCHIVED with reason (history preserved)", async () => {
    await archiveOrganization("org-A", "actor-1", "fin de mandat");
    expect(calls).toContainEqual(["status", "org-A", "ARCHIVED", "actor-1", "fin de mandat"]);
    expect(auditEntries[0].action).toBe("ARCHIVE");
    expect(auditEntries[0].afterState).toEqual({
      status: "ARCHIVED",
      archiveReason: "fin de mandat",
    });
  });
});

// ─── Creation ─────────────────────────────────────────────────────────────

describe("createOrganization", () => {
  beforeEach(() => {
    calls.length = 0;
    auditEntries.length = 0;
  });

  it("creates a PENDING org with default type CHURCH + audit CREATE", async () => {
    const id = await createOrganization({ id: "org-new", name: "École X" }, "actor-9");
    expect(id).toBe("org-new");
    expect(calls[0]).toEqual([
      "create",
      { id: "org-new", name: "École X", type: "CHURCH" },
    ]);
    expect(auditEntries[0]).toMatchObject({
      action: "CREATE",
      entityType: "Organization",
      entityId: "org-new",
    });
  });
});

// ─── Admin grants ─────────────────────────────────────────────────────────

describe("admin grants", () => {
  beforeEach(() => {
    calls.length = 0;
    auditEntries.length = 0;
  });

  it("assignOrgAdmin → ACTIVE grant + audit", async () => {
    const grantId = await assignOrgAdmin({
      adminProfileId: "admin-1",
      orgId: "org-B",
      grantedBy: "root-1",
    });
    expect(grantId).toBe("grant-1");
    expect(auditEntries[0]).toMatchObject({
      action: "CREATE",
      entityType: "OrgAdminGrant",
      orgId: "org-B",
      entityId: "grant-1",
    });
  });

  it("revokeOrgAdmin → REVOKED + audit REVOKE", async () => {
    await revokeOrgAdmin("grant-1", "org-B", "root-1", { status: "ACTIVE" });
    expect(calls).toContainEqual(["revoke", "grant-1"]);
    expect(auditEntries[0].action).toBe("REVOKE");
  });
});

// ─── Reads (KPIs + activity) ──────────────────────────────────────────────

describe("getOrgStats / getRecentActivity", () => {
  beforeEach(() => {
    dbRows.length = 0;
  });

  it("getOrgStats aggregates by status from local registry", async () => {
    dbRows.push(
      { status: "ACTIVE", n: 3 },
      { status: "SUSPENDED", n: 1 },
      { status: "ARCHIVED", n: 2 },
    );
    const stats = await getOrgStats("actor-1");
    expect(stats.total).toBe(6);
    expect(stats.byStatus).toEqual({
      PENDING: 0,
      ACTIVE: 3,
      SUSPENDED: 1,
      ARCHIVED: 2,
    });
  });

  it("getRecentActivity maps audit rows to activity items", async () => {
    dbRows.push({
      action: "UPDATE",
      entity_type: "Organization",
      entity_id: "org-A",
      comment: "suspendue",
      created_at: "2026-09-01T00:00:00.000Z",
      user_id: "actor-1",
    });
    const act = await getRecentActivity("org-A", 10);
    expect(act[0]).toMatchObject({
      action: "UPDATE",
      entityType: "Organization",
      entityId: "org-A",
      comment: "suspendue",
      actorId: "actor-1",
    });
  });
});
