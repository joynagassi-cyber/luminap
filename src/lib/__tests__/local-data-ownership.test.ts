// @vitest-environment jsdom
/**
 * PM18 — fuite de données locales entre comptes sur le même appareil.
 *
 * Défaut visé : `lumina-config` (nom d'église), `lumina-firstName` /
 * `lumina-lastName` (Profil), `lumina-role`, `lumina-active-org` vivent dans le
 * NAVIGATEUR, pas par compte, et ne sont jamais réécrits au login. Un compte B
 * qui se connecte sur l'appareil de A voyait donc l'église / le nom de A.
 *
 * Preuve : `ensureLocalDataOwnedBy(userId)`
 *  - 1er compte sur l'appareil → mémorise, ne purge PAS ;
 *  - MÊME compte → no-op (cache hors-ligne préservé) ;
 *  - AUTRE compte → purge les clés `lumina-*` puis mémorise le nouveau.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({ execute: () => ({ rowsAffected: 0 }) }),
  getPowerSyncConnector: () => ({}),
  initPowerSync: async () => {},
  disconnectPowerSync: async () => {},
}));

vi.mock("@/lib/cache", () => ({
  get: async () => null,
  set: async () => {},
  invalidate: () => {},
  clear: () => {},
  asyncGetOrSet: async () => null,
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  subscribeOrganization: () => () => {},
  setOrganizationId: vi.fn(),
  resetOrganizationId: vi.fn(),
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: { setState: vi.fn(), getState: () => ({}) },
}));

import { ensureLocalDataOwnedBy } from "@/lib/dataLayer";

describe("ensureLocalDataOwnedBy — PM18", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("1er compte : mémorise le propriétaire, ne purge rien", async () => {
    localStorage.setItem("lumina-config", '{"churchName":"Église A"}');
    const purged = await ensureLocalDataOwnedBy("user-a");
    expect(purged).toBe(false);
    expect(localStorage.getItem("lumina-local-owner")).toBe("user-a");
    expect(localStorage.getItem("lumina-config")).toBe('{"churchName":"Église A"}');
  });

  it("MÊME compte : no-op (cache hors-ligne préservé)", async () => {
    await ensureLocalDataOwnedBy("user-a");
    localStorage.setItem("lumina-firstName", "Alice");
    const purged = await ensureLocalDataOwnedBy("user-a");
    expect(purged).toBe(false);
    expect(localStorage.getItem("lumina-firstName")).toBe("Alice");
  });

  it("AUTRE compte : purge les données locales de A puis mémorise B", async () => {
    localStorage.setItem("lumina-local-owner", "user-a");
    localStorage.setItem("lumina-config", '{"churchName":"Église A"}');
    localStorage.setItem("lumina-firstName", "Alice");
    localStorage.setItem("lumina-active-org", "org-a");
    localStorage.setItem("lumina-role", "PASTEUR_PRINCIPAL");

    const purged = await ensureLocalDataOwnedBy("user-b");

    expect(purged).toBe(true);
    expect(localStorage.getItem("lumina-local-owner")).toBe("user-b");
    expect(localStorage.getItem("lumina-config")).toBeNull();
    expect(localStorage.getItem("lumina-firstName")).toBeNull();
    expect(localStorage.getItem("lumina-active-org")).toBeNull();
    expect(localStorage.getItem("lumina-role")).toBeNull();
  });

  it("userId null : aucun effet", async () => {
    localStorage.setItem("lumina-config", '{"churchName":"Église A"}');
    const purged = await ensureLocalDataOwnedBy(null);
    expect(purged).toBe(false);
    expect(localStorage.getItem("lumina-config")).toBe('{"churchName":"Église A"}');
    expect(localStorage.getItem("lumina-local-owner")).toBeNull();
  });
});
