/**
 * T10 / T9 — Invitation file transport (4ᵉ canal) tests.
 *
 * The file transport reuses the SAME engine as the QR flow: it exports the
 * persisted invitation as a shareable JSON payload, and imports/claims it
 * through `parseQRPayload` + `invitation.claimInvitation`. Idempotency stays
 * the server trigger's job — we only assert the export shape, the import
 * round-trip, and that a malformed file is rejected.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ─────────────────────────────────────────────────────────────────
const persistedInvitation: any = {
  id: "inv-1",
  org_id: "org-A",
  code: "LUM-AAAA11",
  target_role: "MEMBRE",
  target_scope_type: "ORG",
  target_group_id: null,
  target_member_id: null,
  issued_by: "root-1",
  issued_at: "2026-09-01T00:00:00.000Z",
  expires_at: "2099-09-08T00:00:00.000Z", // far future so claim doesn't reject
  max_uses: 1,
  used_count: 0,
  status: "ACTIVE",
};

let claimed: any[] = [];
vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: async (sql: string, params: any[] = []) => {
      // getInvitation(id) → SELECT ... FROM invitations WHERE id = ?
      if (/FROM invitations WHERE id = \?/.test(sql)) {
        const row =
          persistedInvitation.id === params[0] ? [persistedInvitation] : [];
        return { array: row };
      }
      // claimInvitation inserts a PENDING profile — accept and record it.
      if (/INSERT INTO profiles/.test(sql)) {
        claimed.push(params[0]);
        return { array: [] };
      }
      return { array: [] };
    },
  }),
}));

vi.mock("@/lib/dataLayer", () => ({
  createInvitationPS: vi.fn(async () => "inv-1"),
  revokeInvitationPS: vi.fn(async () => {}),
  claimInvitationPS: vi.fn(async (invitationId: string, deviceId: string, resultingUserId: string, status: string) => {
    claimed.push({ invitationId, deviceId, resultingUserId, status });
    return "claim-1";
  }),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-A",
  setOrganizationId: () => {},
}));

vi.mock("@/lib/audit", () => ({
  auditLogRepo: { write: vi.fn(async () => {}), list: async () => [], getByEntity: async () => [] },
  writeAudit: vi.fn(async () => {}),
}));

import {
  invitation,
  exportInvitationToFile,
  importInvitationFromFile,
  claimInvitationFromFile,
  parseQRPayload,
} from "../invitation";

describe("invitation file transport (T9)", () => {
  beforeEach(() => {
    claimed = [];
  });

  it("exportInvitationToFile returns a valid v1 JSON payload with the real code", async () => {
    const json = await exportInvitationToFile("inv-1");
    const payload = JSON.parse(json);
    expect(payload).toMatchObject({
      v: 1,
      orgId: "org-A",
      invitationId: "inv-1",
      code: "LUM-AAAA11",
      role: "MEMBRE",
      scope: { type: "ORG" },
    });
    // Re-parseable by the same engine as the QR flow.
    const re = parseQRPayload(json);
    expect(re).not.toBeNull();
    expect(re!.invitationId).toBe("inv-1");
  });

  it("exportInvitationToFile throws when the invitation is unknown", async () => {
    await expect(exportInvitationToFile("missing")).rejects.toThrow(
      "INVITATION_NOT_FOUND",
    );
  });

  it("importInvitationFromFile parses a valid payload", () => {
    const payload = importInvitationFromFile(
      JSON.stringify({
        v: 1,
        orgId: "org-A",
        invitationId: "inv-1",
        code: "LUM-AAAA11",
        role: "MEMBRE",
        scope: { type: "ORG" },
        memberId: null,
        issuedAt: "2026-09-01T00:00:00.000Z",
        expiresAt: "2026-09-08T00:00:00.000Z",
      }),
    );
    expect(payload?.invitationId).toBe("inv-1");
    expect(payload?.code).toBe("LUM-AAAA11");
  });

  it("importInvitationFromFile returns null for malformed content", () => {
    expect(importInvitationFromFile("not-json")).toBeNull();
    expect(importInvitationFromFile('{"v":2}')).toBeNull(); // wrong version
  });

  it("claimInvitationFromFile rejects an invalid file", async () => {
    await expect(
      claimInvitationFromFile("garbage", "device-1", "actor-1"),
    ).rejects.toThrow("INVALID_INVITATION_FILE");
  });

  it("claimInvitationFromFile claims through the same engine as QR", async () => {
    const json = await exportInvitationToFile("inv-1");
    const res = await claimInvitationFromFile(json, "device-1", "actor-1");
    expect(res.claimId).toBe("claim-1");
    // The claim op was routed through dataLayer's claimInvitationPS.
    expect(claimed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ invitationId: "inv-1", status: "PENDING_SYNC" }),
      ]),
    );
  });
});
