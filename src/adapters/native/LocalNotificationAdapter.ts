import type {
  LocalNotificationSchema,
  LocalNotificationsPlugin,
  PermissionStatus,
  ScheduleOptions,
} from "@capacitor/local-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

export type { LocalNotificationSchema, PermissionStatus, ScheduleOptions };

/** Result of scheduling one local notification. */
export interface ScheduleResult {
  /** Native id of the scheduled notification (`null` on failure/no-op). */
  id: number | null;
  error: string | null;
}

/**
 * LocalNotificationAdapter — wraps the Capacitor Local Notifications plugin.
 *
 * LOCAL notifications are delivered by the DEVICE itself (no network, no
 * OneSignal): they fire even offline, which is exactly what the app needs for
 * "rappels" (report reminders, event reminders). They complement the CLOUD
 * push path (OneSignal, cf. `notification.sendNotification`).
 *
 * Mirrors `NotificationAdapter`: singleton, no-op in a browser, and an
 * injectable mock plugin so the behaviour is testable without a device.
 */
export class LocalNotificationAdapter {
  private static instance: LocalNotificationAdapter | null = null;
  private _isNative: boolean;
  /** Set by tests to force native env detection. */
  static __mockPlugin: LocalNotificationsPlugin | null = null;

  private constructor() {
    this._isNative =
      !!LocalNotificationAdapter.__mockPlugin ||
      (() => {
        try {
          return typeof (window as any).Capacitor !== "undefined";
        } catch {
          return false;
        }
      })();
  }

  static getInstance(): LocalNotificationAdapter {
    if (!LocalNotificationAdapter.instance) {
      LocalNotificationAdapter.instance = new LocalNotificationAdapter();
    }
    return LocalNotificationAdapter.instance;
  }

  /** Whether the adapter runs on a native platform. */
  isNative(): boolean {
    return this._isNative;
  }

  /**
   * Request the notification permission (local + push share the OS grant).
   * Returns true when `display` is granted.
   */
  async requestPermission(): Promise<boolean> {
    if (!this._isNative) return false;
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted";
    } catch {
      return false;
    }
  }

  /** Current permission status (`display`). */
  async checkPermission(): Promise<PermissionStatus> {
    if (!this._isNative) return { display: "granted" as any };
    try {
      return await LocalNotifications.checkPermissions();
    } catch {
      return { display: "granted" as any };
    }
  }

  /**
   * Schedule one local notification at an absolute date (`at`), or
   * immediately when `at` is omitted.
   */
  async schedule(
    notification: Omit<LocalNotificationSchema, "id"> & { id?: number },
  ): Promise<ScheduleResult> {
    if (!this._isNative) {
      return { id: null, error: "Not running in native environment" };
    }
    try {
      const id = notification.id ?? nextLocalId();
      const options: ScheduleOptions = {
        notifications: [{ ...notification, id }],
      };
      const result = await LocalNotifications.schedule(options);
      const scheduled = result?.notifications?.[0];
      return { id: scheduled?.id ?? id, error: null };
    } catch (e: any) {
      return { id: null, error: e?.message ?? String(e) };
    }
  }

  /** Cancel pending local notifications by id. */
  async cancel(ids: number[]): Promise<void> {
    if (!this._isNative || ids.length === 0) return;
    try {
      await LocalNotifications.cancel({
        notifications: ids.map((id) => ({ id })),
      });
    } catch {
      /* cancellation best-effort */
    }
  }

  /** List pending local notifications. */
  async getPending(): Promise<LocalNotificationSchema[]> {
    if (!this._isNative) return [];
    try {
      const { notifications } = await LocalNotifications.getPending();
      return notifications ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Android 8+ requires a channel before a notification can be shown.
   * No-op on other platforms (the plugin ignores it).
   */
  async createChannel(channel: {
    id: string;
    name: string;
    description?: string;
    importance?: number;
  }): Promise<void> {
    if (!this._isNative) return;
    try {
      await LocalNotifications.createChannel(channel as any);
    } catch {
      /* channel creation best-effort */
    }
  }

  /**
   * Listen for notification taps. Returns an unsubscribe function.
   */
  async addActionListener(
    callback: (notification: LocalNotificationSchema) => void,
  ): Promise<() => void> {
    if (!this._isNative) return () => {};
    const handle = await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (action) => callback(action.notification),
    );
    return () => handle.remove();
  }

  /** Inject a mock plugin for testing (call BEFORE getInstance). */
  static injectMockPlugin(mockPlugin: LocalNotificationsPlugin): void {
    LocalNotificationAdapter.__mockPlugin = mockPlugin;
    LocalNotificationAdapter.instance = null;
  }

  static resetMockPlugin(): void {
    LocalNotificationAdapter.__mockPlugin = null;
    LocalNotificationAdapter.instance = null;
  }
}

/** Monotonic id generator (the plugin requires a positive 32-bit int). */
let _idCounter = Math.floor(Date.now() % 1_000_000);
function nextLocalId(): number {
  _idCounter = (_idCounter + 1) % 2_147_483_647;
  return _idCounter;
}
