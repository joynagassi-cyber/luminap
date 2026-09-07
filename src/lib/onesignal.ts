/**
 * OneSignal Service for Lumina App
 * Uses the Cordova OneSignal plugin which works with Capacitor via the Cordova bridge
 *
 * OneSignal App ID: 5482a4eb-a402-4612-ab5e-a72df7961b12
 */

// Type definitions for OneSignal Cordova plugin
interface OneSignalPlugin {
  initialize(appId: string): void;
  login(playerId: string): void;
  logout(): void;
  setTag(key: string, value: string): void;
  addTags(tags: Record<string, string>): void;
  removeTag(key: string): void;
  setEmail(email: string): void;
  removeEmail(): void;
  getOnesignalId(): Promise<string | null>;
  getExternalId(): Promise<string | null>;
  trackEvent(eventName: string, metrics?: Record<string, number>): void;
  Notifications: {
    requestPermission(foreground?: boolean): Promise<boolean>;
    addEventListener(event: string, callback: (data: any) => void): void;
    removeEventListener(event: string, callback: (data: any) => void): void;
    clearAll(): void;
    removeNotification(notificationId: string): void;
  };
  InAppMessages: {
    addEventListener(event: string, callback: (data: any) => void): void;
    removeEventListener(event: string, callback: (data: any) => void): void;
    promptAdditionalPermissions(): void;
  };
  User: {
    addAlias(alias: string, name: string): void;
    addAliases(aliases: Record<string, string>): void;
    removeAlias(alias: string): void;
    removeAliases(aliases: string[]): void;
    addEmail(email: string): void;
    removeEmail(email: string): void;
    addSms(smsNumber: string): void;
    removeSms(smsNumber: string): void;
    addTag(key: string, value: string): void;
    addTags(tags: Record<string, string>): void;
    removeTag(key: string): void;
    removeTags(keys: string[]): void;
    getTags(): Promise<Record<string, string>>;
    addOutcome(outcomeName: string): void;
    addUniqueOutcome(outcomeName: string): void;
    addOutcomeWithValue(outcomeName: string, value: number): void;
  };
  Debug: {
    setLogLevel(logLevel: number): void;
  };
  Location: {
    requestPermission(): void;
    setShared(shared: boolean): void;
    isShared(): Promise<boolean>;
  };
  Session: {
    addOutcome(outcomeName: string): void;
    addUniqueOutcome(outcomeName: string): void;
    addOutcomeWithValue(outcomeName: string, value: number): void;
  };
}

interface OneSignalWindow extends Window {
  plugins?: {
    OneSignal?: OneSignalPlugin;
  };
  OneSignal?: OneSignalPlugin;
}

// LogLevel enum
export enum LogLevel {
  None = 0,
  Fatal = 1,
  Error = 2,
  Warn = 3,
  Info = 4,
  Debug = 5,
  Verbose = 6,
}

// OneSignal service class
class OneSignalService {
  private isInitialized = false;
  private appId: string;
  private plugin: OneSignalPlugin | null = null;

  constructor(appId: string) {
    this.appId = appId;
    this.plugin = this.getPlugin();
  }

  private getPlugin(): OneSignalPlugin | null {
    const win = window as OneSignalWindow;

    // Check if Capacitor is available
    if ((win as any).Capacitor?.isNativePlatform?.()) {
      // Use Capacitor bridge to call plugin
      return this.createCapacitorPlugin();
    }

    // Check for Cordova plugin
    if (win.plugins?.OneSignal) {
      return win.plugins.OneSignal;
    }

    // Check for global OneSignal
    if (win.OneSignal) {
      return win.OneSignal;
    }

    console.warn('[OneSignal] Plugin not found. Make sure to run capacitor sync after installing the plugin.');
    return null;
  }

  private createCapacitorPlugin(): OneSignalPlugin | null {
    const win = window as OneSignalWindow;
    const capacitor = (win as any).Capacitor;

    if (!capacitor) {
      return null;
    }

    // Create a proxy that uses Capacitor's exec
    const exec = (success: any, error: any, service: string, action: string, args: any[]) => {
      capacitor.plugin.callbackFromNative(service, true, args[0] || 0, args[1] || null, args[2] || null);
    };

    return {
      initialize: (appId: string) => {
        capacitor.nativeCallback('OneSignalPush', 'init', { appId });
      },
      login: (playerId: string) => {
        capacitor.nativeCallback('OneSignalPush', 'login', { playerId });
      },
      logout: () => {
        capacitor.nativeCallback('OneSignalPush', 'logout', {});
      },
      setTag: (key: string, value: string) => {
        capacitor.nativeCallback('OneSignalPush', 'addTags', { tags: { [key]: value } });
      },
      addTags: (tags: Record<string, string>) => {
        capacitor.nativeCallback('OneSignalPush', 'addTags', { tags });
      },
      removeTag: (key: string) => {
        capacitor.nativeCallback('OneSignalPush', 'removeTags', { tags: [key] });
      },
      setEmail: (email: string) => {
        capacitor.nativeCallback('OneSignalPush', 'addEmail', { email });
      },
      removeEmail: () => {
        capacitor.nativeCallback('OneSignalPush', 'removeEmail', {});
      },
      getOnesignalId: () => {
        return new Promise<string | null>((resolve) => {
          capacitor.nativeCallback('OneSignalPush', 'getOnesignalId', {}, resolve);
        });
      },
      getExternalId: () => {
        return new Promise<string | null>((resolve) => {
          capacitor.nativeCallback('OneSignalPush', 'getExternalId', {}, resolve);
        });
      },
      trackEvent: (eventName: string, metrics?: Record<string, number>) => {
        const args = metrics ? [eventName, metrics] : [eventName];
        capacitor.nativeCallback('OneSignalPush', 'trackEvent', args, () => {});
      },
      Notifications: {
        requestPermission: (foreground?: boolean) => {
          return new Promise<boolean>((resolve) => {
            capacitor.nativeCallback('OneSignalPush', 'requestPermission', { foreground }, (result: any) => {
              resolve(result?.granted || false);
            });
          });
        },
        addEventListener: (event: string, callback: (data: any) => void) => {
          capacitor.addListener('OneSignalPush', event, callback);
        },
        removeEventListener: (event: string, callback: (data: any) => void) => {
          capacitor.removeListener('OneSignalPush', event, callback);
        },
        clearAll: () => {
          capacitor.nativeCallback('OneSignalPush', 'clearAll', {}, () => {});
        },
        removeNotification: (notificationId: string) => {
          capacitor.nativeCallback('OneSignalPush', 'removeNotification', { notificationId }, () => {});
        },
      },
      InAppMessages: {
        addEventListener: (event: string, callback: (data: any) => void) => {
          capacitor.addListener('OneSignalPush', event, callback);
        },
        removeEventListener: (event: string, callback: (data: any) => void) => {
          capacitor.removeListener('OneSignalPush', event, callback);
        },
        promptAdditionalPermissions: () => {
          capacitor.nativeCallback('OneSignalPush', 'promptAdditionalPermissions', {}, () => {});
        },
      },
      User: {
        addAlias: (alias: string, name: string) => {
          capacitor.nativeCallback('OneSignalPush', 'addAliases', { aliases: { [alias]: name } }, () => {});
        },
        addAliases: (aliases: Record<string, string>) => {
          capacitor.nativeCallback('OneSignalPush', 'addAliases', { aliases }, () => {});
        },
        removeAlias: (alias: string) => {
          capacitor.nativeCallback('OneSignalPush', 'removeAliases', { aliases: [alias] }, () => {});
        },
        removeAliases: (aliases: string[]) => {
          capacitor.nativeCallback('OneSignalPush', 'removeAliases', { aliases }, () => {});
        },
        addEmail: (email: string) => {
          capacitor.nativeCallback('OneSignalPush', 'addEmail', { email }, () => {});
        },
        removeEmail: (email: string) => {
          capacitor.nativeCallback('OneSignalPush', 'removeEmail', { email }, () => {});
        },
        addSms: (smsNumber: string) => {
          capacitor.nativeCallback('OneSignalPush', 'addSms', { smsNumber }, () => {});
        },
        removeSms: (smsNumber: string) => {
          capacitor.nativeCallback('OneSignalPush', 'removeSms', { smsNumber }, () => {});
        },
        addTag: (key: string, value: string) => {
          capacitor.nativeCallback('OneSignalPush', 'addTags', { tags: { [key]: value } }, () => {});
        },
        addTags: (tags: Record<string, string>) => {
          capacitor.nativeCallback('OneSignalPush', 'addTags', { tags }, () => {});
        },
        removeTag: (key: string) => {
          capacitor.nativeCallback('OneSignalPush', 'removeTags', { tags: [key] }, () => {});
        },
        removeTags: (keys: string[]) => {
          capacitor.nativeCallback('OneSignalPush', 'removeTags', { tags: keys }, () => {});
        },
        getTags: () => {
          return new Promise<Record<string, string>>((resolve) => {
            capacitor.nativeCallback('OneSignalPush', 'getTags', {}, resolve);
          });
        },
        addOutcome: (outcomeName: string) => {
          capacitor.nativeCallback('OneSignalPush', 'addOutcome', { outcomeName }, () => {});
        },
        addUniqueOutcome: (outcomeName: string) => {
          capacitor.nativeCallback('OneSignalPush', 'addUniqueOutcome', { outcomeName }, () => {});
        },
        addOutcomeWithValue: (outcomeName: string, value: number) => {
          capacitor.nativeCallback('OneSignalPush', 'addOutcomeWithValue', { outcomeName, value }, () => {});
        },
      },
      Debug: {
        setLogLevel: (logLevel: LogLevel) => {
          capacitor.nativeCallback('OneSignalPush', 'setLogLevel', { logLevel }, () => {});
        },
      },
      Location: {
        requestPermission: () => {
          capacitor.nativeCallback('OneSignalPush', 'requestLocationPermission', {}, () => {});
        },
        setShared: (shared: boolean) => {
          capacitor.nativeCallback('OneSignalPush', 'setLocationShared', { shared }, () => {});
        },
        isShared: () => {
          return new Promise<boolean>((resolve) => {
            capacitor.nativeCallback('OneSignalPush', 'isLocationShared', {}, resolve);
          });
        },
      },
      Session: {
        addOutcome: (outcomeName: string) => {
          capacitor.nativeCallback('OneSignalPush', 'addOutcome', { outcomeName }, () => {});
        },
        addUniqueOutcome: (outcomeName: string) => {
          capacitor.nativeCallback('OneSignalPush', 'addUniqueOutcome', { outcomeName }, () => {});
        },
        addOutcomeWithValue: (outcomeName: string, value: number) => {
          capacitor.nativeCallback('OneSignalPush', 'addOutcomeWithValue', { outcomeName, value }, () => {});
        },
      },
    };
  }

  /**
   * Initialize OneSignal SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[OneSignal] Already initialized');
      return;
    }

    try {
      this.plugin = this.getPlugin();

      if (!this.plugin) {
        console.error('[OneSignal] Plugin not available. Run: npx cap sync');
        return;
      }

      // Initialize with app ID
      this.plugin.initialize(this.appId);

      // Enable verbose logging in development
      if (import.meta.env.DEV) {
        this.plugin.Debug.setLogLevel(LogLevel.Verbose);
      }

      this.isInitialized = true;
      console.log('[OneSignal] Initialized successfully');
    } catch (error) {
      console.error('[OneSignal] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Check if OneSignal is initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.plugin;
  }

  /**
   * Request push notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.plugin) {
      console.error('[OneSignal] Not initialized');
      return false;
    }

    try {
      const granted = await this.plugin.Notifications.requestPermission(true);
      console.log('[OneSignal] Permission granted:', granted);
      return granted;
    } catch (error) {
      console.error('[OneSignal] Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Get the current OneSignal player ID
   */
  async getUserId(): Promise<string | null> {
    if (!this.plugin) {
      return null;
    }

    try {
      const playerId = await this.plugin.getOnesignalId();
      return playerId;
    } catch (error) {
      console.error('[OneSignal] Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Get the current push subscription token
   */
  async getToken(): Promise<string | null> {
    if (!this.plugin) {
      return null;
    }

    try {
      const token = await (this.plugin as any).Session?.getPushSubscriptionToken?.();
      return token || null;
    } catch (error) {
      console.error('[OneSignal] Error getting token:', error);
      return null;
    }
  }

  /**
   * Set a tag for the current user
   */
  async setTag(key: string, value: string): Promise<void> {
    if (!this.plugin) {
      console.error('[OneSignal] Not initialized');
      return;
    }

    try {
      await this.plugin.User.addTag(key, value);
      console.log(`[OneSignal] Tag set: ${key} = ${value}`);
    } catch (error) {
      console.error('[OneSignal] Error setting tag:', error);
    }
  }

  /**
   * Set multiple tags for the current user
   */
  async setTags(tags: Record<string, string>): Promise<void> {
    if (!this.plugin) {
      console.error('[OneSignal] Not initialized');
      return;
    }

    try {
      await this.plugin.User.addTags(tags);
      console.log('[OneSignal] Tags set:', tags);
    } catch (error) {
      console.error('[OneSignal] Error setting tags:', error);
    }
  }

  /**
   * Remove a tag
   */
  async removeTag(key: string): Promise<void> {
    if (!this.plugin) {
      return;
    }

    try {
      await this.plugin.User.removeTag(key);
    } catch (error) {
      console.error('[OneSignal] Error removing tag:', error);
    }
  }

  /**
   * Set email for the current user
   */
  async setEmail(email: string): Promise<void> {
    if (!this.plugin) {
      console.error('[OneSignal] Not initialized');
      return;
    }

    try {
      await this.plugin.User.addEmail(email);
      console.log('[OneSignal] Email set:', email);
    } catch (error) {
      console.error('[OneSignal] Error setting email:', error);
    }
  }

  /**
   * Remove email
   */
  async removeEmail(): Promise<void> {
    if (!this.plugin) {
      return;
    }

    try {
      await this.plugin.User.removeEmail();
    } catch (error) {
      console.error('[OneSignal] Error removing email:', error);
    }
  }

  /**
   * Login with external user ID
   */
  async login(externalId: string): Promise<void> {
    if (!this.plugin) {
      console.error('[OneSignal] Not initialized');
      return;
    }

    try {
      this.plugin.login(externalId);
      console.log('[OneSignal] Logged in as:', externalId);
    } catch (error) {
      console.error('[OneSignal] Error logging in:', error);
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.logout();
      console.log('[OneSignal] Logged out');
    } catch (error) {
      console.error('[OneSignal] Error logging out:', error);
    }
  }

  /**
   * Track an event
   */
  async trackEvent(eventName: string, metrics?: Record<string, number>): Promise<void> {
    if (!this.plugin) {
      console.error('[OneSignal] Not initialized');
      return;
    }

    try {
      this.plugin.trackEvent(eventName, metrics);
      console.log('[OneSignal] Event tracked:', eventName);
    } catch (error) {
      console.error('[OneSignal] Error tracking event:', error);
    }
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(callback: (notification: any) => void): void {
    if (!this.plugin) {
      console.error('[OneSignal] Not initialized');
      return;
    }

    try {
      this.plugin.Notifications.addEventListener('foregroundWillDisplay', callback);
      console.log('[OneSignal] Notification received listener added');
    } catch (error) {
      console.error('[OneSignal] Error adding listener:', error);
    }
  }

  /**
   * Add notification click listener
   */
  addNotificationClickListener(callback: (notification: any) => void): void {
    if (!this.plugin) {
      console.error('[OneSignal] Not initialized');
      return;
    }

    try {
      this.plugin.Notifications.addEventListener('click', callback);
      console.log('[OneSignal] Notification click listener added');
    } catch (error) {
      console.error('[OneSignal] Error adding click listener:', error);
    }
  }

  /**
   * Remove notification received listener
   */
  removeNotificationReceivedListener(callback: (notification: any) => void): void {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.Notifications.removeEventListener('foregroundWillDisplay', callback);
    } catch (error) {
      console.error('[OneSignal] Error removing listener:', error);
    }
  }

  /**
   * Remove notification click listener
   */
  removeNotificationClickListener(callback: (notification: any) => void): void {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.Notifications.removeEventListener('click', callback);
    } catch (error) {
      console.error('[OneSignal] Error removing click listener:', error);
    }
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.Notifications.clearAll();
    } catch (error) {
      console.error('[OneSignal] Error clearing notifications:', error);
    }
  }

  /**
   * Remove a specific notification
   */
  removeNotification(notificationId: string): void {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.Notifications.removeNotification(notificationId);
    } catch (error) {
      console.error('[OneSignal] Error removing notification:', error);
    }
  }

  /**
   * Set location shared status
   */
  setLocationShared(shared: boolean): void {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.Location.setShared(shared);
    } catch (error) {
      console.error('[OneSignal] Error setting location:', error);
    }
  }

  /**
   * Get location shared status
   */
  async isLocationShared(): Promise<boolean> {
    if (!this.plugin) {
      return false;
    }

    try {
      return await this.plugin.Location.isShared();
    } catch (error) {
      console.error('[OneSignal] Error getting location status:', error);
      return false;
    }
  }
}

// Singleton instance
let instance: OneSignalService | null = null;

/**
 * Get or create the OneSignal service instance
 */
export function getOneSignalService(): OneSignalService {
  if (!instance) {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || '5482a4eb-a402-4612-ab5e-a72df7961b12';
    instance = new OneSignalService(appId);
  }
  return instance;
}

/**
 * Initialize OneSignal (call this once at app startup)
 */
export async function initOneSignal(): Promise<void> {
  const service = getOneSignalService();
  await service.initialize();
  console.log('[OneSignal] App ID:', service['appId']);
}

// Export the service class for advanced usage
export { OneSignalService };
