import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NetworkAdapter } from "../NetworkAdapter";

// vi.hoisted runs before hoisted vi.mock, so mocks are available inside the factory
const { mockNetworkPlugin } = vi.hoisted(() => ({
  mockNetworkPlugin: {
    getStatus: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

vi.mock("@capacitor/network", () => ({
  Network: mockNetworkPlugin,
}));

// Stub window for node environment
vi.stubGlobal("window", globalThis);

// ─── Tests ────────────────────────────────────────────────────

describe("NetworkAdapter", () => {
  beforeEach(() => {
    NetworkAdapter.injectMockPlugin(mockNetworkPlugin);
    vi.clearAllMocks();
  });

  afterEach(() => {
    NetworkAdapter.resetMockPlugin();
    vi.restoreAllMocks();
  });

  describe("isConnected", () => {
    it("returns true when Network.getStatus reports connected", async () => {
      mockNetworkPlugin.getStatus.mockResolvedValue({
        connected: true,
        connectionType: "wifi",
      });

      const adapter = NetworkAdapter.getInstance();
      const result = await adapter.isConnected();
      expect(result).toBe(true);
    });

    it("returns false when Network.getStatus reports not connected", async () => {
      mockNetworkPlugin.getStatus.mockResolvedValue({
        connected: false,
        connectionType: "none",
      });

      const adapter = NetworkAdapter.getInstance();
      const result = await adapter.isConnected();
      expect(result).toBe(false);
    });

    it("falls back to navigator.onLine when plugin throws", async () => {
      mockNetworkPlugin.getStatus.mockRejectedValue(new Error("plugin error"));
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });

      const adapter = NetworkAdapter.getInstance();
      const result = await adapter.isConnected();
      expect(result).toBe(true);

      Object.defineProperty(navigator, "onLine", {
        value: originalOnLine,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("getConnectionType", () => {
    it("returns the connection type from plugin", async () => {
      mockNetworkPlugin.getStatus.mockResolvedValue({
        connected: true,
        connectionType: "cellular",
      });

      const adapter = NetworkAdapter.getInstance();
      const result = await adapter.getConnectionType();
      expect(result).toBe("cellular");
    });

    it('returns "unknown" when plugin throws', async () => {
      mockNetworkPlugin.getStatus.mockRejectedValue(new Error("fail"));

      const adapter = NetworkAdapter.getInstance();
      const result = await adapter.getConnectionType();
      expect(result).toBe("unknown");
    });
  });

  describe("getStatus", () => {
    it("returns combined status object", async () => {
      mockNetworkPlugin.getStatus.mockResolvedValue({
        connected: true,
        connectionType: "wifi",
      });

      const adapter = NetworkAdapter.getInstance();
      const status = await adapter.getStatus();
      expect(status).toEqual({ connected: true, connectionType: "wifi" });
    });
  });

  describe("addStatusListener", () => {
    it("registers listener via plugin in capacitor env", async () => {
      const callback = vi.fn();
      mockNetworkPlugin.addListener.mockReturnValue({ remove: vi.fn() });

      const adapter = NetworkAdapter.getInstance();
      const unsubscribe = await adapter.addStatusListener(callback);
      expect(mockNetworkPlugin.addListener).toHaveBeenCalledWith(
        "networkStatusChange",
        callback,
      );
      expect(typeof unsubscribe).toBe("function");
      (unsubscribe as () => void)();
    });

    it("removes listener when unsubscribe is called", async () => {
      const removeMock = vi.fn();
      mockNetworkPlugin.addListener.mockReturnValue({ remove: removeMock });

      const adapter = NetworkAdapter.getInstance();
      const callback = vi.fn();
      const unsubscribe = await adapter.addStatusListener(callback);
      (unsubscribe as () => void)();
      expect(removeMock).toHaveBeenCalled();
    });

    it("falls back to window events when no mock plugin", () => {
      // Reset without injecting mock to test browser fallback
      NetworkAdapter.resetMockPlugin();
      const originalAddEventListener = window.addEventListener;
      const addEventListenerMock = vi.fn();
      (window as any).addEventListener = addEventListenerMock;

      const adapter = NetworkAdapter.getInstance();
      const callback = vi.fn();
      adapter.addStatusListener(callback);
        "online",
        expect.any(Function),
      );
      expect(addEventListenerMock).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );

      (window as any).addEventListener = originalAddEventListener;
      NetworkAdapter.injectMockPlugin(mockNetworkPlugin);
    });
  });

  describe("singleton", () => {
    it("returns the same instance", () => {
      const a = NetworkAdapter.getInstance();
      const b = NetworkAdapter.getInstance();
      expect(a).toBe(b);
    });
  });
});
