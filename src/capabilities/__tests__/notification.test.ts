import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NotificationCapability,
  type NotificationSendData,
} from "../notification";

// ─── OneSignal mocks ──────────────────────────────────────────────
// Shared mutable store — plugin methods mutate this directly, getTags reads it fresh each call
const mockTags: Record<string, string> = {};

function createMockPlugin() {
  const plugin = {
    initialize: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    // Top-level tag helpers (as on the real OneSignalService)
    setTag: vi.fn((key: string, value: string) => {
      mockTags[key] = value;
    }),
    setTags: vi.fn((tags: Record<string, string>) => {
      Object.assign(mockTags, tags);
    }),
    removeTag: vi.fn(),
    addTags: vi.fn(), // alias, delegates to setTags in the service
    getOnesignalId: vi.fn().mockResolvedValue("mock-player-id"),
    getExternalId: vi.fn().mockResolvedValue(null),
    getToken: vi.fn().mockResolvedValue("mock-device-token"),
    trackEvent: vi.fn(),
    Notifications: {
      requestPermission: vi.fn().mockResolvedValue(true),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      clearAll: vi.fn(),
      removeNotification: vi.fn(),
    },
    User: {
      addTag: vi.fn((key: string, value: string) => {
        mockTags[key] = value;
      }),
      addTags: vi.fn((tags: Record<string, string>) => {
        Object.assign(mockTags, tags);
      }),
      removeTag: vi.fn(),
      // Always returns a fresh copy so tests can mutate mockTags and see changes reflected
      getTags: vi.fn(() => Promise.resolve({ ...mockTags })),
      addOutcome: vi.fn(),
      addUniqueOutcome: vi.fn(),
      addOutcomeWithValue: vi.fn(),
    },
    Debug: { setLogLevel: vi.fn() },
    Location: {
      requestPermission: vi.fn(),
      setShared: vi.fn(),
      isShared: vi.fn().mockResolvedValue(false),
    },
    Session: {
      addOutcome: vi.fn(),
      addUniqueOutcome: vi.fn(),
      addOutcomeWithValue: vi.fn(),
    },
  };

  // service.requestPermission delegates to Notifications.requestPermission(true)
  (plugin as any).requestPermission = vi.fn().mockImplementation(async () => {
    return plugin.Notifications.requestPermission(true);
  });

  return plugin;
}

const mockPlugin = createMockPlugin();

vi.mock("@/lib/onesignal", () => ({
  getOneSignalService: () => mockPlugin,
  initOneSignal: async () => {
    mockPlugin.initialize();
  },
  OneSignalService: class {},
}));

// ─── PowerSync mock (notifications persistence, audit O4) ───────
const mockExecutions: Array<{ sql: string; params: any[] }> = [];
vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: async (sql: string, params: any[] = []) => {
      mockExecutions.push({ sql, params });
      return { array: [] };
    },
  }),
}));
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-test-1",
}));

describe("notification capability", () => {
  let notif: NotificationCapability;

  beforeEach(() => {
    notif = new NotificationCapability();
    vi.clearAllMocks();
    mockExecutions.length = 0;
    // Reassign the shared reference so the plugin's getTags() call reads the clean state
    Object.keys(mockTags).forEach((k) => delete mockTags[k]);
  });

  // ─── initialize ───────────────────────────────────────────────

  describe("initialize", () => {
    it("calls initOneSignal which calls plugin.initialize", async () => {
      await notif.initialize();
      expect(mockPlugin.initialize).toHaveBeenCalled();
    });

    it("is a no-op on subsequent calls", async () => {
      await notif.initialize();
      await notif.initialize();
      expect(mockPlugin.initialize).toHaveBeenCalledTimes(1);
    });
  });

  // ─── login ─────────────────────────────────────────────────────

  describe("login", () => {
    it("calls OneSignal login and sets role/user_id tags", async () => {
      await notif.initialize();
      await notif.login("user-1", "MEMBRE");
      expect(mockPlugin.login).toHaveBeenCalledWith("user-1");
      expect(mockPlugin.setTag).toHaveBeenCalledWith("role", "MEMBRE");
      expect(mockPlugin.setTag).toHaveBeenCalledWith("user_id", "user-1");
    });

    it("initializes automatically if not already initialized", async () => {
      const newNotif = new NotificationCapability();
      await newNotif.login("user-2", "TREASURIER");
      expect(mockPlugin.login).toHaveBeenCalledWith("user-2");
    });
  });

  // ─── logout ────────────────────────────────────────────────────

  describe("logout", () => {
    it("calls OneSignal logout after initialize", async () => {
      await notif.initialize();
      await notif.logout();
      expect(mockPlugin.logout).toHaveBeenCalled();
    });

    it("is a no-op if not initialized", async () => {
      await notif.logout();
      expect(mockPlugin.logout).not.toHaveBeenCalled();
    });
  });

  // ─── requestPermission ─────────────────────────────────────────

  describe("requestPermission", () => {
    it("returns true when permission is granted", async () => {
      mockPlugin.Notifications.requestPermission.mockResolvedValue(true);
      await notif.initialize();
      const result = await notif.requestPermission();
      expect(result).toBe(true);
    });

    it("returns false when permission is denied", async () => {
      mockPlugin.Notifications.requestPermission.mockResolvedValue(false);
      await notif.initialize();
      const result = await notif.requestPermission();
      expect(result).toBe(false);
    });

    it("returns false when not initialized and permission fails", async () => {
      mockPlugin.Notifications.requestPermission.mockRejectedValue(
        new Error("not ready"),
      );
      await notif.initialize();
      const result = await notif.requestPermission();
      expect(result).toBe(false);
    });
  });

  // ─── sendNotification ──────────────────────────────────────────

  describe("sendNotification", () => {
    const baseData: NotificationSendData = { title: "Hello", message: "World" };

    it("records extra tags for targetRole", async () => {
      await notif.initialize();
      await notif.sendNotification({ ...baseData, targetRole: "MEMBRE" });
      expect(mockPlugin.setTags).toHaveBeenCalled();
      const callArgs = mockPlugin.setTags.mock.calls[0][0] as Record<
        string,
        string
      >;
      expect(callArgs.target_role).toBe("MEMBRE");
      expect(callArgs.last_notification_title).toBe("Hello");
      expect(callArgs.last_notification_message).toBe("World");
    });

    it("records extra tags for targetUserId", async () => {
      await notif.initialize();
      await notif.sendNotification({ ...baseData, targetUserId: "user-42" });
      const callArgs = mockPlugin.setTags.mock.calls[0][0] as Record<
        string,
        string
      >;
      expect(callArgs.target_user_id).toBe("user-42");
    });

    it("passes extraData as prefixed tags", async () => {
      await notif.initialize();
      await notif.sendNotification({
        ...baseData,
        extraData: { event: "meeting" },
      });
      const callArgs = mockPlugin.setTags.mock.calls[0][0] as Record<
        string,
        string
      >;
      expect(callArgs.extra_event).toBe("meeting");
    });

    it("initializes automatically if needed", async () => {
      const fresh = new NotificationCapability();
      await fresh.sendNotification(baseData);
      expect(mockPlugin.initialize).toHaveBeenCalled();
    });

    it("persists the notification to the PowerSync notifications table (O4)", async () => {
      await notif.initialize();
      await notif.sendNotification({
        ...baseData,
        targetRole: "TREASURIER",
        targetUserId: "user-42",
      });
      const insert = mockExecutions.find((e) =>
        /INSERT INTO notifications/i.test(e.sql),
      );
      expect(insert).toBeDefined();
      expect(insert!.params).toEqual([
        "org-test-1",
        "TREASURIER",
        "Hello",
        expect.stringContaining('"targetUserId":"user-42"'),
        "user-42",
        expect.stringMatching(/^\d{4}-/),
      ]);
      // The OneSignal tag path still runs alongside persistence
      expect(mockPlugin.setTags).toHaveBeenCalled();
    });

    it("stamps action_type PUSH when no targetRole is given", async () => {
      await notif.initialize();
      await notif.sendNotification(baseData);
      const insert = mockExecutions.find((e) =>
        /INSERT INTO notifications/i.test(e.sql),
      );
      expect(insert!.params[1]).toBe("PUSH");
    });
  });

  // ─── subscribeToTopic ──────────────────────────────────────────

  describe("subscribeToTopic", () => {
    it("appends a new topic to the tags array", async () => {
      mockTags["topics"] = JSON.stringify(["announcements"]);
      await notif.initialize();
      await notif.subscribeToTopic("weekly-update");
      const topics: string[] = JSON.parse(mockTags["topics"]);
      expect(topics).toContain("announcements");
      expect(topics).toContain("weekly-update");
    });

    it("does not duplicate an existing topic", async () => {
      mockTags["topics"] = JSON.stringify(["announcements"]);
      await notif.initialize();
      await notif.subscribeToTopic("announcements");
      const topics: string[] = JSON.parse(mockTags["topics"]);
      expect(topics.filter((t) => t === "announcements")).toHaveLength(1);
    });

    it("creates the topics array when none exists", async () => {
      await notif.initialize();
      await notif.subscribeToTopic("general");
      const topics: string[] = JSON.parse(mockTags["topics"]);
      expect(topics).toEqual(["general"]);
    });
  });

  // ─── unsubscribeFromTopic ──────────────────────────────────────

  describe("unsubscribeFromTopic", () => {
    it("removes the topic from the tags array", async () => {
      mockTags["topics"] = JSON.stringify(["a", "b", "c"]);
      await notif.initialize();
      await notif.unsubscribeFromTopic("b");
      const topics: string[] = JSON.parse(mockTags["topics"]);
      expect(topics).toEqual(["a", "c"]);
    });

    it("leaves other topics intact", async () => {
      mockTags["topics"] = JSON.stringify(["announcements", "weekly-update"]);
      await notif.initialize();
      await notif.unsubscribeFromTopic("announcements");
      const topics: string[] = JSON.parse(mockTags["topics"]);
      expect(topics).toContain("weekly-update");
      expect(topics).not.toContain("announcements");
    });
  });
});
