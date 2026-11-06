// @vitest-environment node
/**
 * Façade plateforme réseau (`src/platform/networkState.ts`).
 *
 * Vérifie le contrat : cache synchrone, diffusion aux abonnés, amorçage par la
 * lecture native (@capacitor/network) et réinitialisation de test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockNetworkPlugin } = vi.hoisted(() => ({
  mockNetworkPlugin: {
    getStatus: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

vi.mock("@capacitor/network", () => ({ Network: mockNetworkPlugin }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));

import {
  initNetworkState,
  isOnline,
  subscribeOnline,
  __setOnlineForTests,
  __resetNetworkStateForTests,
} from "@/platform/networkState";

describe("networkState — façade plateforme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNetworkPlugin.addListener.mockReturnValue({ remove: vi.fn() });
    __resetNetworkStateForTests();
  });

  afterEach(() => {
    __resetNetworkStateForTests();
    vi.restoreAllMocks();
  });

  it("expose un état synchrone et diffuse les changements", () => {
    const seen: boolean[] = [];
    const unsub = subscribeOnline((v) => seen.push(v));
    __setOnlineForTests(false);
    expect(isOnline()).toBe(false);
    __setOnlineForTests(true);
    expect(isOnline()).toBe(true);
    unsub();
    __setOnlineForTests(false);
    expect(seen).toEqual([false, true]); // plus rien après désabonnement
  });

  it("s'amorce sur la lecture native @capacitor/network", async () => {
    mockNetworkPlugin.getStatus.mockResolvedValue({ connected: false, connectionType: "none" });
    const result = await initNetworkState();
    expect(mockNetworkPlugin.getStatus).toHaveBeenCalled();
    expect(result).toBe(false);
    expect(isOnline()).toBe(false);
  });

  it("est idempotent (un seul amorçage)", async () => {
    mockNetworkPlugin.getStatus.mockResolvedValue({ connected: true, connectionType: "wifi" });
    await initNetworkState();
    await initNetworkState();
    expect(mockNetworkPlugin.getStatus).toHaveBeenCalledTimes(1);
  });
});
