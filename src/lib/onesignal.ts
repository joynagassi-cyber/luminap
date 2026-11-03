/**
 * OneSignal Service for Lumina App
 * Uses the Cordova OneSignal plugin which works with Capacitor via the Cordova bridge
 *
 * OneSignal App ID: 5482a4eb-a402-4612-ab5e-a72df7961b12
 */

import { isFeatureEnabled } from "./featureFlags";

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
    // Pas de `window` (SSR, tests Node, worker) : aucun plugin possible.
    // Sans cette garde, `getOneSignalService()` levait `window is not defined`
    // hors navigateur.
    if (typeof window === "undefined") {
      return null;
    }
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

    return null;
  }

  /**
   * P-01 — le pont « Capacitor » construit à la main est SUPPRIMÉ.
   *
   * Ce qu'il faisait : appeler `capacitor.nativeCallback(...)` et
   * `capacitor.plugin.callbackFromNative(...)` pour parler à un plugin
   * « OneSignalPush » qui n'existe pas. Ces deux APIs n'existent pas sur le
   * pont Capacitor moderne (`registerPlugin` depuis Capacitor 3, aucune
   * méthode `nativeCallback` sur l'objet `Capacitor`, pas d'objet
   * `Capacitor.Plugins`). Conséquences mesurées par lecture :
   *   - `initialize()` ne levait jamais (l'appel était synchrone) → le service
   *     se croyait prêt ;
   *   - `requestPermission()` attrapait TOUTES les exceptions et renvoyait
   *     `false` → le seul chemin de demande de permission de l'application ne
   *     pouvait jamais ouvrir la fenêtre Android, en silence.
   *
   * La permission de notifications passe désormais par
   * `src/lib/nativePermissions` (`@capacitor/push-notifications`). Le push
   * cloud reste servi par `src/lib/cloudPush.ts` (edge function). Le seul
   * plugin OneSignal encore supporté ici est le plugin CORDOVA
   * (`window.plugins.OneSignal`, cf. `getPlugin`) — s'il est un jour réinstallé,
   * il fonctionnera sans ce pont.
   */
  private createCapacitorPlugin(): OneSignalPlugin | null {
    if (typeof window === "undefined") return null;
    const win = window as unknown as OneSignalWindow;
    if (win.plugins?.OneSignal) return win.plugins.OneSignal;
    if (win.OneSignal) return win.OneSignal;
    // Aucun SDK OneSignal chargé : no-op explicite (plus de faux pont).
    return null;
  }

  /**
   * Initialize OneSignal SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // In a plain browser there is no Capacitor bridge, no Cordova plugin and
    // no OneSignal web SDK loaded — getPlugin() returns null. Guard against
    // it: calling `.initialize` on a null plugin is what crashed the app at
    // startup ("Cannot read properties of null (reading 'initialize')").
    if (!this.plugin) {
      return;
    }

    // Initialize with app ID
    this.plugin.initialize(this.appId);

    // Enable verbose logging in development
    if (import.meta.env.DEV && this.plugin.Debug) {
      this.plugin.Debug.setLogLevel(LogLevel.Verbose);
    }

    this.isInitialized = true;
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
      return false;
    }

    try {
      const granted = await this.plugin.Notifications.requestPermission(true);
      return granted;
    } catch (error) {
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
      const token = await (
        this.plugin as any
      ).Session?.getPushSubscriptionToken?.();
      return token || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set a tag for the current user
   */
  async setTag(key: string, value: string): Promise<void> {
    if (!this.plugin) {
      return;
    }

    try {
      await this.plugin.User.addTag(key, value);
    } catch (error) {
      // Tag set failed — non-fatal
    }
  }

  /**
   * Set multiple tags for the current user
   */
  async setTags(tags: Record<string, string>): Promise<void> {
    if (!this.plugin) {
      return;
    }

    try {
      await this.plugin.User.addTags(tags);
    } catch (error) {
      // Tag set failed — non-fatal
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
      // Tag removal failed — non-fatal
    }
  }

  /**
   * Set email for the current user
   */
  async setEmail(email: string): Promise<void> {
    if (!this.plugin) {
      return;
    }

    try {
      await this.plugin.User.addEmail(email);
    } catch (error) {
      // Email set failed — non-fatal
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
      await (this.plugin.User as any).removeEmail();
    } catch (error) {
      // Email removal failed — non-fatal
    }
  }

  /**
   * Login with external user ID
   */
  async login(externalId: string): Promise<void> {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.login(externalId);
    } catch (error) {
      // Login failed — non-fatal
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
    } catch (error) {
      // Logout failed — non-fatal
    }
  }

  /**
   * Track an event
   */
  async trackEvent(
    eventName: string,
    metrics?: Record<string, number>,
  ): Promise<void> {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.trackEvent(eventName, metrics);
    } catch (error) {
      // Event tracking failed — non-fatal
    }
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(callback: (notification: any) => void): void {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.Notifications.addEventListener(
        "foregroundWillDisplay",
        callback,
      );
    } catch (error) {
      // Listener registration failed — non-fatal
    }
  }

  /**
   * Add notification click listener
   */
  addNotificationClickListener(callback: (notification: any) => void): void {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.Notifications.addEventListener("click", callback);
    } catch (error) {
      // Listener registration failed — non-fatal
    }
  }

  /**
   * Remove notification received listener
   */
  removeNotificationReceivedListener(
    callback: (notification: any) => void,
  ): void {
    if (!this.plugin) {
      return;
    }

    try {
      this.plugin.Notifications.removeEventListener(
        "foregroundWillDisplay",
        callback,
      );
    } catch (error) {
      // Listener removal failed — non-fatal
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
      this.plugin.Notifications.removeEventListener("click", callback);
    } catch (error) {
      // Listener removal failed — non-fatal
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
      // Clear notifications failed — non-fatal
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
      // Notification removal failed — non-fatal
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
      // Location setting failed — non-fatal
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
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) {
      // Push optionnel : sans App ID (build CI, dev sans config) on retourne
      // un service « débranché ». Chaque méthode est déjà gardée par
      // `if (!this.plugin)` (getPlugin() → null hors Capacitor/OneSignal), donc
      // tout est no-op. Un `throw` ici casserait les pages qui importent le
      // service sans jamais toucher aux notifications.
      console.warn(
        "[onesignal] VITE_ONESIGNAL_APP_ID manquante : notifications push désactivées (no-op).",
      );
    }
    instance = new OneSignalService(appId ?? "");
  }
  return instance;
}

/**
 * Initialize OneSignal (call this once at app startup)
 *
 * Kill switch PR7 : le drapeau `notifications-push` (défaut actif) permet de
 * couper l'initialisation push en production sans redéploiement — utile si le
 * plugin provoque un crash au démarrage. Fail-open : sans drapeau, comportement
 * inchangé.
 */
export async function initOneSignal(): Promise<void> {
  if (!isFeatureEnabled("notifications-push")) {
    console.warn("[onesignal] drapeau `notifications-push` désactivé : push no-op.");
    return;
  }
  const service = getOneSignalService();
  await service.initialize();
}

// Export the service class for advanced usage
export { OneSignalService };
