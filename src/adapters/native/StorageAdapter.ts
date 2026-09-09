import { Storage } from "@capacitor/storage";

/**
 * StorageAdapter — wraps Capacitor Storage plugin with a clean typed interface.
 *
 * Provides key/value persistence that works across web and native platforms.
 * All values are serialized to JSON strings before storage.
 * Falls back to localStorage in browser environments when Capacitor is unavailable.
 */
export class StorageAdapter {
  private static instance: StorageAdapter | null = null;
  private group: string;
  /** Set by tests to force capacitor env detection. */
  static __mockStorage: typeof Storage | null = null;

  private constructor(group = "app") {
    this.group = group;
  }

  static getInstance(group = "app"): StorageAdapter {
    if (!StorageAdapter.instance) {
      StorageAdapter.instance = new StorageAdapter(group);
    }
    return StorageAdapter.instance;
  }

  /** Get a value from storage by key, parsed as JSON when possible. */
  async get<T>(key: string): Promise<T | null> {
    if (this.isCapacitorEnv()) {
      try {
        const result = await Storage.get({ key });
        if (result.value === null) return null;
        return this.parseJson<T>(result.value);
      } catch {
        return this.getFromLocalStorage<T>(key);
      }
    }
    return this.getFromLocalStorage<T>(key);
  }

  /** Set a value in storage. The value is JSON-stringified. */
  async set<T>(key: string, value: T): Promise<void> {
    if (this.isCapacitorEnv()) {
      try {
        await Storage.set({ key, value: this.stringify(value) });
        return;
      } catch {
        // fall through to localStorage
      }
    }
    this.setInLocalStorage(key, value);
  }

  /** Remove a value from storage by key. */
  async remove(key: string): Promise<void> {
    if (this.isCapacitorEnv()) {
      try {
        await Storage.remove({ key });
        return;
      } catch {
        // fall through to localStorage
      }
    }
    this.removeFromLocalStorage(key);
  }

  /** Clear all values from storage. */
  async clear(): Promise<void> {
    if (this.isCapacitorEnv()) {
      try {
        await Storage.clear();
        return;
      } catch {
        // fall through to localStorage
      }
    }
    localStorage.clear();
  }

  /** Return all known keys in storage. */
  async keys(): Promise<string[]> {
    if (this.isCapacitorEnv()) {
      try {
        const result = await Storage.keys();
        return result.keys;
      } catch {
        return this.getLocalStorageKeys();
      }
    }
    return this.getLocalStorageKeys();
  }

  /**
   * Inject a fake Storage plugin for testing.
   * Must be called BEFORE getInstance() to take effect.
   */
  static injectMockPlugin(mockPlugin: typeof Storage): void {
    StorageAdapter.__mockStorage = mockPlugin;
    // Reset instance so new group parameter takes effect
    StorageAdapter.instance = null;
  }

  static resetMockPlugin(): void {
    StorageAdapter.__mockStorage = null;
    // Don't reset instance — tests manage singleton per test
  }

  private isCapacitorEnv(): boolean {
    if (StorageAdapter.__mockStorage) return true;
    try {
      return typeof (window as any).Capacitor !== "undefined";
    } catch {
      return false;
    }
  }

  private parseJson<T>(raw: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  private stringify(value: unknown): string {
    return JSON.stringify(value);
  }

  // ─── localStorage fallback ─────────────────────────────────────

  private getFromLocalStorage<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return this.parseJson<T>(raw);
  }

  private setInLocalStorage<T>(key: string, value: T): void {
    localStorage.setItem(key, this.stringify(value));
  }

  private removeFromLocalStorage(key: string): void {
    localStorage.removeItem(key);
  }

  private getLocalStorageKeys(): string[] {
    // Prefer localStorage.keys() if available (e.g. some browser/ Capacitor polyfills)
    if (typeof (localStorage as any).keys === "function") {
      return (localStorage as any).keys();
    }
    return Object.keys(
      localStorage as unknown as Record<string, unknown>,
    ).filter(
      (k) =>
        !["getItem", "setItem", "removeItem", "clear", "length"].includes(k),
    );
  }
}
