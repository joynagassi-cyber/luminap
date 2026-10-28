// @vitest-environment jsdom
/**
 * useOrgMembership (R107) — alimente `isOrgMember` pour la garde de route.
 *
 * Le point critique est la SÛRETÉ : on ne bloque un utilisateur (`not-member`)
 * que sur une preuve POSITIVE de non-appartenance. Tant que la base locale n'a
 * pas synchronisé, un membre réel doit rester `unknown` (fail-open), sinon la
 * branche `needs-membership` bloquerait des utilisateurs légitimes au démarrage.
 *
 * `powersync`, `dataLayer`, `orgContext` et `organization-context` sont mockés —
 * pas de SQLite, pas de réseau.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOrgMembership } from "@/hooks/useOrgMembership";

const mockDb = {
  currentStatus: { hasSynced: false as boolean },
  on: (_e: string, cb: (s: { hasSynced?: boolean }) => void) => {
    statusCb = cb;
  },
  off: () => {},
};

let statusCb: ((s: { hasSynced?: boolean }) => void) | null = null;
let mockOrg = "org-1";
let mockUid = "u1";
let canAccess = false;

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => mockDb,
}));
vi.mock("@/lib/dataLayer", () => ({
  canAccessOrganization: async () => canAccess,
}));
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => mockOrg,
  subscribeOrganization: () => () => {},
}));
vi.mock("@/lib/organization-context", () => ({
  resolveCurrentUserId: () => mockUid,
}));

beforeEach(() => {
  mockDb.currentStatus.hasSynced = false;
  statusCb = null;
  mockOrg = "org-1";
  mockUid = "u1";
  canAccess = false;
});

describe("useOrgMembership — fail-open (R107)", () => {
  it("organisation non résolue → unknown", () => {
    mockOrg = "__no_org__";
    const { result } = renderHook(() => useOrgMembership());
    expect(result.current).toBe("unknown");
  });

  it("utilisateur inconnu → unknown", () => {
    mockUid = "";
    const { result } = renderHook(() => useOrgMembership());
    expect(result.current).toBe("unknown");
  });

  it("appartenance prouvée → member", async () => {
    canAccess = true;
    const { result } = renderHook(() => useOrgMembership());
    await waitFor(() => expect(result.current).toBe("member"));
  });

  it("non-appartenance sur base NON synchronisée → unknown (fail-open)", async () => {
    canAccess = false;
    mockDb.currentStatus.hasSynced = false;
    const { result } = renderHook(() => useOrgMembership());
    // Laisse la micro-tâche se résoudre : le statut ne doit PAS être not-member.
    await waitFor(() => expect(canAccess).toBe(false));
    expect(result.current).toBe("unknown");
  });

  it("non-appartenance APRÈS synchronisation → not-member", async () => {
    canAccess = false;
    mockDb.currentStatus.hasSynced = true;
    const { result } = renderHook(() => useOrgMembership());
    await waitFor(() => expect(result.current).toBe("not-member"));
  });

  it("une fin de synchronisation réévalue un négatif (base vide au boot)", async () => {
    canAccess = false;
    mockDb.currentStatus.hasSynced = false;
    const { result } = renderHook(() => useOrgMembership());
    await waitFor(() => expect(result.current).toBe("unknown"));
    // Le sync se termine : la base est maintenant peuplée, la non-appartenance
    // devient une preuve.
    canAccess = false;
    mockDb.currentStatus.hasSynced = true;
    statusCb?.({ hasSynced: true });
    await waitFor(() => expect(result.current).toBe("not-member"));
  });
});
