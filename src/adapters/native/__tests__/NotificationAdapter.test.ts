import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  NotificationAdapter,
  type PermissionStatus,
  type PushNotificationSchema,
} from "../NotificationAdapter";

// vi.hoisted runs before hoisted vi.mock, so mocks are available inside the factory
const { mockPushPlugin } = vi.hoisted(() => ({
  mockPushPlugin: {
    requestPermissions: vi.fn(),
    checkPermissions: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    addListener: vi.fn(),
    createChannel: vi.fn(),
    deleteChannel: vi.fn(),
    getDeliveredNotifications: vi.fn(),
    removeDeliveredNotifications: vi.fn(),
    removeAllDeliveredNotifications: vi.fn(),
    listChannels: vi.fn(),
    removeAllListeners: vi.fn(),
  } as any,
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: mockPushPlugin,
}));

// Stub window for node environment
vi.stubGlobal("window", globalThis);

// ─── Tests ──────────────────────────────────────────────────────

describe("NotificationAdapter", () => {
  beforeEach(() => {
    NotificationAdapter.injectMockPlugin(mockPushPlugin);
    vi.clearAllMocks();
  });

  afterEach(() => {
    NotificationAdapter.resetMockPlugin();
    vi.restoreAllMocks();
  });

  describe("isNative", () => {
    it("returns true when mock plugin is injected", () => {
      const adapter = NotificationAdapter.getInstance();
      expect(adapter.isNative()).toBe(true);
    });

    it("returns false when no mock plugin is injected", () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      expect(adapter.isNative()).toBe(false);
    });
  });

  describe("requestPermission", () => {
    it("returns true when permission is granted", async () => {
      mockPushPlugin.requestPermissions.mockResolvedValue({
        receive: "GRANTED",
      });
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.requestPermission();
      expect(result).toBe(true);
      expect(mockPushPlugin.requestPermissions).toHaveBeenCalled();
    });

    it("returns false when permission is denied", async () => {
      mockPushPlugin.requestPermissions.mockResolvedValue({
        receive: "DENIED",
      });
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.requestPermission();
      expect(result).toBe(false);
    });

    it("returns false when plugin throws", async () => {
      mockPushPlugin.requestPermissions.mockRejectedValue(
        new Error("permission denied"),
      );
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.requestPermission();
      expect(result).toBe(false);
    });

    it("returns false in non-native environment", async () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.requestPermission();
      expect(result).toBe(false);
      expect(mockPushPlugin.requestPermissions).not.toHaveBeenCalled();
      NotificationAdapter.injectMockPlugin(mockPushPlugin);
    });
  });

  describe("checkPermission", () => {
    it("returns GRANTED in non-native environment", async () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.checkPermission();
      expect(result).toEqual({ receive: "GRANTED" });
      NotificationAdapter.injectMockPlugin(mockPushPlugin);
    });

    it("delegates to plugin in native env", async () => {
      const expected: PermissionStatus = { receive: "LIMITED" as any };
      mockPushPlugin.checkPermissions.mockResolvedValue(expected);
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.checkPermission();
      expect(result).toEqual(expected);
    });
  });

  describe("register", () => {
    it("returns error when not in native environment", async () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.register();
      expect(result.token).toBe("");
      expect(result.error).toBeDefined();
      NotificationAdapter.injectMockPlugin(mockPushPlugin);
    });

    it("resolves with token on success", async () => {
      mockPushPlugin.register.mockResolvedValue(undefined);
      mockPushPlugin.addListener.mockReturnValue({ remove: vi.fn() });
      const adapter = NotificationAdapter.getInstance();
      // Start register first to populate addListener calls
      const resultPromise = adapter.register();
      // Simulate registration event
      const registrationCall = mockPushPlugin.addListener.mock.calls.find(
        (c: any[]) => c[0] === "registration",
      );
      (registrationCall?.[1] as (token: any) => void)({
        value: "fcm-token-abc123",
      });
      const result = await resultPromise;
      expect(result.token).toBe("fcm-token-abc123");
      expect(result.error).toBeNull();
    });

    it("resolves with error on registration failure", async () => {
      mockPushPlugin.register.mockResolvedValue(undefined);
      mockPushPlugin.addListener.mockReturnValue({ remove: vi.fn() });
      const adapter = NotificationAdapter.getInstance();
      // Start register first to populate addListener calls
      const resultPromise = adapter.register();
      // Simulate registration error event
      const errorCall = mockPushPlugin.addListener.mock.calls.find(
        (c: any[]) => c[0] === "registrationError",
      );
      (errorCall?.[1] as (err: any) => void)(new Error("registration failed"));
      const result = await resultPromise;
      expect(result.token).toBe("");
      expect(result.error).toContain("registration failed");
    });
  });

  describe("unregister", () => {
    it("calls plugin unregister in native env", async () => {
      const adapter = NotificationAdapter.getInstance();
      await adapter.unregister();
      expect(mockPushPlugin.unregister).toHaveBeenCalled();
    });

    it("is a no-op in browser env", async () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      await adapter.unregister();
      expect(mockPushPlugin.unregister).not.toHaveBeenCalled();
      NotificationAdapter.injectMockPlugin(mockPushPlugin);
    });
  });

  describe("addEventListener", () => {
    it("registers pushNotificationReceived listener", async () => {
      const callback = vi.fn();
      mockPushPlugin.addListener.mockReturnValue({ remove: vi.fn() });

      const adapter = NotificationAdapter.getInstance();
      const unsubscribe = await adapter.addEventListener(callback);
      expect(mockPushPlugin.addListener).toHaveBeenCalledWith(
        "pushNotificationReceived",
        expect.any(Function),
      );
      expect(typeof unsubscribe).toBe("function");
      (unsubscribe as () => void)();
    });

    it("returns no-op in browser env", async () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      const callback = vi.fn();
      const unsubscribe = await adapter.addEventListener(callback);
      (unsubscribe as () => void)();
      expect(callback).not.toHaveBeenCalled();
      NotificationAdapter.injectMockPlugin(mockPushPlugin);
    });
  });

  describe("addActionListener", () => {
    it("registers pushNotificationActionPerformed listener", async () => {
      const callback = vi.fn();
      mockPushPlugin.addListener.mockReturnValue({ remove: vi.fn() });

      const adapter = NotificationAdapter.getInstance();
      const unsubscribe = await adapter.addActionListener(callback);
      expect(mockPushPlugin.addListener).toHaveBeenCalledWith(
        "pushNotificationActionPerformed",
        expect.any(Function),
      );
      (unsubscribe as () => void)();
    });
  });

  describe("addRegistrationListener", () => {
    it("registers registration listener", async () => {
      const callback = vi.fn();
      mockPushPlugin.addListener.mockReturnValue({ remove: vi.fn() });

      const adapter = NotificationAdapter.getInstance();
      const unsubscribe = await adapter.addRegistrationListener(callback);
      expect(mockPushPlugin.addListener).toHaveBeenCalledWith(
        "registration",
        callback,
      );
      (unsubscribe as () => void)();
    });

    it("returns no-op in browser env", async () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      const callback = vi.fn();
      const unsubscribe = await adapter.addRegistrationListener(callback);
      (unsubscribe as () => void)();
      expect(callback).not.toHaveBeenCalled();
      NotificationAdapter.injectMockPlugin(mockPushPlugin);
    });
  });

  describe("channel management", () => {
    it("createChannel delegates to plugin in native env", async () => {
      const adapter = NotificationAdapter.getInstance();
      await adapter.createChannel({ id: "main", name: "Main" });
      expect(mockPushPlugin.createChannel).toHaveBeenCalled();
    });

    it("createChannel is no-op in browser env", async () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      await adapter.createChannel({ id: "x", name: "X" });
      expect(mockPushPlugin.createChannel).not.toHaveBeenCalled();
      NotificationAdapter.injectMockPlugin(mockPushPlugin);
    });

    it("deleteChannel delegates to plugin", async () => {
      const adapter = NotificationAdapter.getInstance();
      await adapter.deleteChannel("main");
      expect(mockPushPlugin.deleteChannel).toHaveBeenCalledWith({ id: "main" });
    });
  });

  describe("delivered notifications", () => {
    it("getDeliveredNotifications returns list from plugin", async () => {
      const mockNotifs: PushNotificationSchema[] = [
        { id: "notif1", title: "notif1", body: "body1", data: {} },
      ];
      mockPushPlugin.getDeliveredNotifications.mockResolvedValue({
        notifications: mockNotifs,
      });
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.getDeliveredNotifications();
      expect(result).toEqual(mockNotifs);
    });

    it("returns empty array in browser env", async () => {
      NotificationAdapter.resetMockPlugin();
      const adapter = NotificationAdapter.getInstance();
      const result = await adapter.getDeliveredNotifications();
      expect(result).toEqual([]);
      NotificationAdapter.injectMockPlugin(mockPushPlugin);
    });

    it("removeDeliveredNotifications delegates to plugin", async () => {
      const notifs: PushNotificationSchema[] = [{ id: "x", title: "x", body: "y", data: {} }];
      const adapter = NotificationAdapter.getInstance();
      await adapter.removeDeliveredNotifications(notifs);
      expect(mockPushPlugin.removeDeliveredNotifications).toHaveBeenCalled();
    });

    it("removeAllDeliveredNotifications delegates to plugin", async () => {
      const adapter = NotificationAdapter.getInstance();
      await adapter.removeAllDeliveredNotifications();
      expect(mockPushPlugin.removeAllDeliveredNotifications).toHaveBeenCalled();
    });
  });

  describe("singleton", () => {
    it("returns the same instance", () => {
      const a = NotificationAdapter.getInstance();
      const b = NotificationAdapter.getInstance();
      expect(a).toBe(b);
    });
  });
});
