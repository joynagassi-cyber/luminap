/**
 * Intégration — `invitation.getInvitationByCode()` doit exposer des champs
 * camelCase (le claim par code lit `invite.orgId` / `invite.targetRole`).
 *
 * DÉFAUT d'origine : la méthode renvoyait la ligne PowerSync brute
 * (snake_case) sous le type `Invitation`, donc `InvitationClaim` construisait
 * un payload sans org/rôle → `selectRole` sauté, audit sans organisation.
 *
 * Run with: npx vitest run src/capabilities/__tests__/invitation-get-by-code.test.ts
 */
import { describe, it, expect, vi } from "vitest";

const row = {
  id: "inv-9",
  org_id: "org-Z",
  code: "LUM-ZZ99",
  target_role: "ADMIN",
  target_scope_type: "EVENT",
  target_group_id: null,
  target_member_id: null,
  issued_by: "root-1",
  issued_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2099-01-01T00:00:00.000Z",
  max_uses: 1,
  used_count: 0,
  status: "ACTIVE",
  target_scope_resource: "event",
  target_scope_id: "evt-42",
  grants_payload: "[]",
  tags_payload: "[]",
};

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: async (sql: string) => {
      if (/FROM invitations WHERE code = \?/.test(sql)) return { array: [row] };
      return { array: [] };
    },
  }),
}));
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-Z",
  setOrganizationId: () => {},
}));
vi.mock("@/lib/auth", () => ({
  authService: { getSession: async () => null, getState: () => ({ session: null }) },
}));
vi.mock("@/lib/dataLayer", () => ({
  createInvitationPS: vi.fn(),
  revokeInvitationPS: vi.fn(),
  claimInvitationPS: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({
  auditLogRepo: { write: vi.fn(), list: async () => [], getByEntity: async () => [] },
}));

import { invitation } from "../invitation";

describe("invitation.getInvitationByCode — champs camelCase", () => {
  it("mappe la ligne snake_case en camelCase (payload de claim exploitable)", async () => {
    const inv = await invitation.getInvitationByCode("LUM-ZZ99");
    expect(inv).not.toBeNull();
    expect(inv!.orgId).toBe("org-Z");
    expect(inv!.targetRole).toBe("ADMIN");
    expect(inv!.targetScopeType).toBe("EVENT");
    expect(inv!.targetScopeResource).toBe("event");
    expect(inv!.targetScopeId).toBe("evt-42");
    expect(inv!.expiresAt).toBe("2099-01-01T00:00:00.000Z");
    // Non-vacuité : ces champs seraient `undefined` sans le mapper.
    expect(inv!.orgId).toBeDefined();
    expect(inv!.targetRole).toBeDefined();
  });
});
