import type {
  PermissionStatus,
  PushNotificationSchema,
  ActionPerformed,
  Channel,
  Token,
} from "@capacitor/push-notifications";
import { PushNotifications } from "@capacitor/push-notifications";

export type {
  PermissionStatus,
  PushNotificationSchema,
  ActionPerformed,
  Channel,
  Token,
};

/** Result of registering the app for push notifications. */
export interface PushRegistrationResult {
  token: string;
  error: string | null;
}

/** A pushed notification with enriched metadata. */
export interface ReceivedNotification {
  title?: string;
  subtitle?: string;
  body?: string;
  data?: Record<string, string>;
  actionId?: string;
}

/**
 * NotificationAdapter — wraps Capacitor Push Notifications plugin
 * with a clean TypeScript interface for the rest of the app.
 *
 * Handles permission flow, token management, and notification event
 * subscription. Falls back to no-op in browser environments.
 */
export class NotificationAdapter {
  private static instance: NotificationAdapter | null = null;
  private _isNative: boolean;
  /** Set by tests to force native env detection. */
  static __mockPlugin: typeof PushNotifications | null = null;

  private constructor() {
    // Check mock first, then real Capacitor runtime
    this._isNative =
      !!NotificationAdapter.__mockPlugin ||
      (() => {
        try {
          return typeof (window as any).Capacitor !== "undefined";
        } catch {
          return false;
        }
      })();
  }

  static getInstance(): NotificationAdapter {
    if (!NotificationAdapter.instance) {
      NotificationAdapter.instance = new NotificationAdapter();
    }
    return NotificationAdapter.instance;
  }

  /** Check whether the adapter has a native environment. */
  isNative(): boolean {
    return this._isNative;
  }

  /**
   * Request push notification permission from the user.
   * Returns true if granted, false otherwise.
   */
  async requestPermission(): Promise<boolean> {
    if (!this._isNative) return false;
    try {
      const permissions = await PushNotifications.requestPermissions();
      return permissions.receive === "GRANTED";
    } catch {
      return false;
    }
  }

  /** Check current push notification permission status. */
  async checkPermission(): Promise<PermissionStatus> {
    if (!this._isNative) return { receive: "GRANTED" };
    try {
      return await PushNotifications.checkPermissions();
    } catch {
      return { receive: "GRANTED" };
    }
  }

  /**
   * Register the app to receive push notifications.
   * Triggers the 'registration' event with the push token.
   */
  async register(): Promise<PushRegistrationResult> {
    if (!this._isNative) {
      return { token: "", error: "Not running in native environment" };
    }
    return new Promise((resolve) => {
      const cleanup = () => {
        errorHandle.remove?.();
        registrationHandle?.remove();
      };
      const handleError = (error: any) => {
        cleanup();
        resolve({ token: "", error: error.message || String(error) });
      };
      const handleSuccess = (token: Token) => {
        cleanup();
        resolve({ token: token.value, error: null });
      };
      const errorHandle = PushNotifications.addListener(
        "registrationError",
        handleError,
      );
      const registrationHandle = PushNotifications.addListener(
        "registration",
        handleSuccess,
      );
      PushNotifications.register().catch(handleError);
    });
  }

  /**
   * Unregister the app from push notifications.
   */
  async unregister(): Promise<void> {
    if (!this._isNative) return;
    await PushNotifications.unregister();
  }

  /**
   * Listen for incoming push notifications (foreground).
   * Returns an unsubscribe function.
   */
  addEventListener(
    callback: (notification: ReceivedNotification) => void,
  ): () => void {
    if (!this._isNative) return () => {};
    const handle = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        callback({
          title: notification.title,
          subtitle: notification.subtitle,
          body: notification.body,
          data: notification.data as Record<string, string> | undefined,
        });
      },
    );
    return () => handle.remove();
  }

  /**
   * Listen for push notification action actions (taps / button presses).
   * Returns an unsubscribe function.
   */
  addActionListener(
    callback: (action: ReceivedNotification) => void,
  ): () => void {
    if (!this._isNative) return () => {};
    const handle = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        callback({
          title: action.notification?.title,
          subtitle: action.notification?.subtitle,
          body: action.notification?.body,
          actionId: action.actionId,
          data: action.notification?.data as Record<string, string> | undefined,
        });
      },
    );
    return () => handle.remove();
  }

  /**
   * Listen for successful registration (push token).
   * Returns an unsubscribe function.
   */
  addRegistrationListener(callback: (token: Token) => void): () => void {
    if (!this._isNative) return () => {};
    const handle = PushNotifications.addListener("registration", callback);
    return () => handle.remove();
  }

  /**
   * Create a notification channel (Android only).
   */
  async createChannel(channel: Channel): Promise<void> {
    if (!this._isNative) return;
    await PushNotifications.createChannel(channel);
  }

  /**
   * Delete a notification channel (Android only).
   */
  async deleteChannel(channelId: string): Promise<void> {
    if (!this._isNative) return;
    await PushNotifications.deleteChannel({ id: channelId });
  }

  /**
   * Get currently delivered (visible) notifications.
   */
  async getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
    if (!this._isNative) return [];
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  }

  /**
   * Remove specific delivered notifications.
   */
  async removeDeliveredNotifications(
    notifications: PushNotificationSchema[],
  ): Promise<void> {
    if (!this._isNative) return;
    await PushNotifications.removeDeliveredNotifications({ notifications });
  }

  /**
   * Clear all delivered notifications.
   */
  async removeAllDeliveredNotifications(): Promise<void> {
    if (!this._isNative) return;
    await PushNotifications.removeAllDeliveredNotifications();
  }

  /**
   * Inject a mock plugin for testing.
   * Must be called BEFORE getInstance() to take effect.
   */
  static injectMockPlugin(mockPlugin: typeof PushNotifications): void {
    NotificationAdapter.__mockPlugin = mockPlugin;
    NotificationAdapter.instance = null;
  }

  static resetMockPlugin(): void {
    NotificationAdapter.__mockPlugin = null;
    NotificationAdapter.instance = null;
  }
}
