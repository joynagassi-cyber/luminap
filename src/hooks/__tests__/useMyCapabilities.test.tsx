/**
 * Chantier B — useMyCapabilities : projection en lecture des capacités.
 *
 * Le hook ne réimplémente AUCUNE décision (D5) : il interroge la décision
 * unique (`federation.canAccess`) et le chemin legacy
 * (`security.hasPermission`). On stubbe donc les deux, ainsi que la source de
 * l'utilisateur courant (`useCurrentUser`), pour vérifier :
 *   - `capabilities` contient TOUTES les capacités, avec `allowed` juste ;
 *   - `allowed` est la projection des capacités accordées ;
 *   - `role` est le rôle parsé ;
 *   - `loading` retombe à false après résolution.
 *
 * Run with: npx vitest run src/hooks/__tests__/useMyCapabilities.test.tsx
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ─── Mocks hoistés ──────────────────────────────────────────────────────────
const federationMock = vi.hoisted(() => ({ canAccess: vi.fn() }));
const securityMock = vi.hoisted(() => ({ hasPermission: vi.fn() }));
const dataLayerMock = vi.hoisted(() => ({
  useCurrentUser: vi.fn(),
  subscribePowerSyncReady: vi.fn(() => () => {}),
}));

vi.mock("@/capabilities/federation", () => ({ federation: federationMock }));
vi.mock("@/capabilities/security", () => ({ security: securityMock }));
vi.mock("@/lib/dataLayer", () => dataLayerMock);

import { useMyCapabilities } from "@/hooks/useMyCapabilities";
import { CAPABILITIES } from "@/lib/capabilities";

const USER_ID = "u1";
const ORG = "org-A";

/** federation accorde exactement ces `resource:action`. */
function federationGrants(permissions: string[]) {
  const allowed = new Set(permissions);
  federationMock.canAccess.mockImplementation(
    async (_u: string, _o: string, resource: string, action: string) =>
      allowed.has(`${resource}:${action}`),
  );
}

/** chemin legacy : seul le rôle porte ces permissions. */
function legacyGrants(permissions: string[]) {
  const allowed = new Set(permissions);
  securityMock.hasPermission.mockImplementation(
    (_role: string, permission: string) => allowed.has(permission),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dataLayerMock.subscribePowerSyncReady.mockReturnValue(() => {});
  dataLayerMock.useCurrentUser.mockReturnValue({
    id: USER_ID,
    email: "a@b.c",
    firstName: "A",
    lastName: "B",
    role: "MEMBRE",
    org: { id: ORG, name: "Org", type: "Eglise", accentColor: "#000" },
  });
  federationGrants([]);
  legacyGrants([]);
});

describe("useMyCapabilities", () => {
  it("expose TOUTES les capacités, allowed reflétant la décision", async () => {
    // federation accorde transaction:create → finance.manage.
    // legacy (MEMBRE) accorde transaction:read + event:read → finance.view + events.view.
    federationGrants(["transaction:create"]);
    legacyGrants(["transaction:read", "event:read"]);

    const { result } = renderHook(() => useMyCapabilities(ORG));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.capabilities).toHaveLength(CAPABILITIES.length);
    const ids = result.current.allowed.map((c) => c.id).sort();
    expect(ids).toEqual(["events.view", "finance.manage", "finance.view"]);
  });

  it("marque allowed=false les capacités non accordées", async () => {
    federationGrants([]);
    legacyGrants([]);

    const { result } = renderHook(() => useMyCapabilities(ORG));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allowed).toEqual([]);
    expect(result.current.capabilities.every((c) => !c.allowed)).toBe(true);
    expect(
      result.current.capabilities.find((c) => c.capability.id === "admin.roles")
        ?.source,
    ).toBe("neither");
  });

  it("parse le rôle de l'utilisateur courant", async () => {
    const { result } = renderHook(() => useMyCapabilities(ORG));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe("MEMBRE");
  });

  it("un refus fédéré n'empêche pas le legacy d'accorder (union)", async () => {
    // federation refuse tout ; seul le rôle accorde report:export.
    federationGrants([]);
    legacyGrants(["report:export"]);

    const { result } = renderHook(() => useMyCapabilities(ORG));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ids = result.current.allowed.map((c) => c.id);
    expect(ids).toContain("finance.export");
    const exportCap = result.current.capabilities.find(
      (c) => c.capability.id === "finance.export",
    );
    expect(exportCap?.allowed).toBe(true);
    expect(exportCap?.source).toBe("legacy");
  });

  it("une fédération en erreur ne fait pas planter le hook (legacy tranche)", async () => {
    federationMock.canAccess.mockRejectedValue(new Error("DB not ready"));
    legacyGrants(["transaction:read"]);

    const { result } = renderHook(() => useMyCapabilities(ORG));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allowed.map((c) => c.id)).toEqual(["finance.view"]);
  });
});
