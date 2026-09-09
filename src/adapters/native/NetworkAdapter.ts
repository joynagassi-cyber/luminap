import type { ConnectionStatus, ConnectionType } from '@capacitor/network';
import { Network } from '@capacitor/network';

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
  /** Tracks listener handles for cleanup. */
  private _listenerHandles: Array<{ remove: () => void } | null> = [];

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
        return 'unknown';
      }
    }
    if (navigator.onLine) {
      const ua = navigator.userAgent.toLowerCase();
      return /wifi|cellular|ethernet/i.test(navigator.connection?.type ?? '')
        ? 'cellular'
        : 'wifi';
    }
    return 'none';
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
  addStatusListener(
    callback: (status: ConnectionStatus) => void,
  ): () => void {
    this.listeners.add(callback);

    if (this.isCapacitorEnv()) {
      const handle = Network.addListener('networkStatusChange', callback);
      this._listenerHandles.push(handle);
    } else {
      const onOnline = () => this.broadcastStatus();
      const onOffline = () => this.broadcastStatus();
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      this._listenerHandles.push({
        remove: () => {
          window.removeEventListener('online', onOnline);
          window.removeEventListener('offline', onOffline);
        },
      });
    }

    return () => this.removeStatusListener(callback);
  }

  removeStatusListener(
    callback: (status: ConnectionStatus) => void,
  ): void {
    this.listeners.delete(callback);
    // Find and remove the matching handle
    const handleIndex = this._listenerHandles.findIndex((h) => h !== null);
    if (handleIndex !== -1) {
      const handle = this._listenerHandles[handleIndex];
      if (handle) handle.remove();
      this._listenerHandles[handleIndex] = null;
      this._listenerHandles = this._listenerHandles.filter((h) => h !== null);
    } else if (this.isCapacitorEnv()) {
      Network.removeAllListeners();
    }
  }

  /**
   * Override the cached capacitor online state (useful in tests).
   */
  static setTestMode(enabled: boolean): void {
    const adapter = NetworkAdapter.getInstance();
    adapter._capacitorOnline = enabled ? null : null; // reset
    (adapter as { _testMode: boolean })._testMode = enabled;
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
    return !!NetworkAdapter.__mockNetwork;
  }

  private async broadcastStatus(): Promise<void> {
    const status = await this.getStatus();
    for (const listener of this.listeners) {
      listener(status);
    }
  }
}
