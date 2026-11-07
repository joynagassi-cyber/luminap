import type { ConnectionStatus, ConnectionType } from "@capacitor/network";
import { Network } from "@capacitor/network";
import { Capacitor } from "@capacitor/core";

export type { ConnectionStatus, ConnectionType };

/**
 * NetworkAdapter — wraps Capacitor Network plugin with a clean interface.
 *
 * Provides network status monitoring with offline/online detection,
 * connection type tracking, and status-change event subscription.
 * Falls back to navigator.onLine in browser environments.
 */
export class NetworkAdapter {
  private static instance: NetworkAdapter | null = null;
  private listeners: Set<(status: ConnectionStatus) => void> = new Set();
  private _capacitorOnline: boolean | null = null;
  /** Set by tests to force capacitor env detection. */
  static __mockNetwork: typeof Network | null = null;
  /**
   * Handles d'écoute, APPAIRÉS à leur callback : le désabonnement retire le
   * handle du bon callback (l'ancienne version retirait toujours le PREMIER
   * handle non nul → mauvais écouteur retiré et fuite des précédents).
   */
  private _handles: Array<{
    callback: (status: ConnectionStatus) => void;
    remove: () => void;
  }> = [];
  /** Tracks whether test mode is enabled */
  _testMode: boolean = false;

  private constructor() {}

  static getInstance(): NetworkAdapter {
    if (!NetworkAdapter.instance) {
      NetworkAdapter.instance = new NetworkAdapter();
    }
    return NetworkAdapter.instance;
  }

  /** Check whether the device is currently connected. */
  async isConnected(): Promise<boolean> {
    if (this._capacitorOnline !== null) return this._capacitorOnline;

    if (this.isCapacitorEnv()) {
      try {
        const status = await Network.getStatus();
        return status.connected;
      } catch {
        return navigator.onLine;
      }
    }
    return navigator.onLine;
  }

  /** Returns the current connection type (wifi / cellular / none / unknown). */
  async getConnectionType(): Promise<ConnectionType> {
    if (this.isCapacitorEnv()) {
      try {
        const status = await Network.getStatus();
        return status.connectionType;
      } catch {
        return "unknown";
      }
    }
    if (navigator.onLine) {
      const conn = (navigator as { connection?: { type?: string } }).connection;
      const type = conn?.type;
      // `Network.getStatus()` renvoie un `ConnectionType` ; `navigator.connection.type`
      // suit la même nomenclature (`wifi`/`cellular`/`ethernet`/`none`…). On le
      // renvoie TEL QUEL : l'ancienne version le reversait (`wifi` → « cellular »).
      if (type === "wifi" || type === "cellular") {
        return type;
      }
      // Pas de Network Information API : impossible de distinguer wifi/cellular.
      return "unknown";
    }
    return "none";
  }

  /** Get the current full status object. */
  async getStatus(): Promise<ConnectionStatus> {
    const connected = await this.isConnected();
    const connectionType = await this.getConnectionType();
    return { connected, connectionType };
  }

  /**
   * Subscribe to network status change events.
   * Returns an unsubscribe function.
   */
  async addStatusListener(callback: (status: ConnectionStatus) => void): Promise<() => void> {
    this.listeners.add(callback);

    if (this.isCapacitorEnv()) {
      const handle = (await Network.addListener(
        "networkStatusChange",
        callback,
      )) as unknown as { remove: () => void };
      this._handles.push({ callback, remove: () => handle.remove() });
    } else {
      const onOnline = () => this.broadcastStatus();
      const onOffline = () => this.broadcastStatus();
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      this._handles.push({
        callback,
        remove: () => {
          window.removeEventListener("online", onOnline);
          window.removeEventListener("offline", onOffline);
        },
      });
    }

    return () => this.removeStatusListener(callback);
  }

  removeStatusListener(callback: (status: ConnectionStatus) => void): void {
    this.listeners.delete(callback);
    // Retire le handle APPAIRÉ à ce callback (et lui seul).
    const idx = this._handles.findIndex((h) => h.callback === callback);
    if (idx !== -1) {
      this._handles[idx].remove();
      this._handles.splice(idx, 1);
    } else if (this.isCapacitorEnv()) {
      // Filet de sécurité : callback inconnu → on ne peut pas cibler le handle.
      Network.removeAllListeners();
      this._handles = [];
    }
  }

  /**
   * Override the cached capacitor online state (useful in tests).
   */
  static setTestMode(enabled: boolean): void {
    const adapter = NetworkAdapter.getInstance();
    adapter._capacitorOnline = enabled ? null : null; // reset
    adapter._testMode = enabled;
  }

  /**
   * Inject a fake Network plugin for testing.
   * Stores the mock so `isCapacitorEnv` branches into the mock path.
   */
  static injectMockPlugin(mockPlugin: typeof Network): void {
    NetworkAdapter.__mockNetwork = mockPlugin;
    NetworkAdapter.instance = null;
  }

  static resetMockPlugin(): void {
    NetworkAdapter.__mockNetwork = null;
    // Don't reset instance — tests manage singleton per test
  }

  private isCapacitorEnv(): boolean {
    // Détection RÉELLE de la plateforme native : un mock injecté (tests) OU
    // l'exécution dans une WebView Capacitor. L'ancienne implémentation
    // (`!!__mockNetwork`) renvoyait TOUJOURS `false` sur un vrai appareil :
    // l'adaptateur retombait alors sur `navigator.onLine` — l'API navigateur
    // peu fiable en WebView Android qu'il était censé remplacer.
    if (NetworkAdapter.__mockNetwork) return true;
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  private async broadcastStatus(): Promise<void> {
    const status = await this.getStatus();
    for (const listener of this.listeners) {
      listener(status);
    }
  }
}
