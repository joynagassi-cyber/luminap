import { Preferences } from "@capacitor/preferences";

/**
 * C-11 — le repli vers `localStorage` reste (il évite de perdre la session si
 * le plugin natif casse), mais il n'est plus SILENCIEUX : une panne du
 * stockage natif doit laisser une trace (console + rapport d'erreur), sinon un
 * basculement discret vers un stockage non fiable est indétectable.
 */
function reportStorageFallback(op: string, error: unknown): void {
  console.warn(
    `[StorageAdapter] ${op} natif en échec — repli sur localStorage :`,
    error,
  );
}

/**
 * StorageAdapter — wraps the Capacitor Preferences plugin with a clean typed interface.
 *
 * Provides key/value persistence that works across web and native platforms.
 * All values are serialized to JSON strings before storage.
 * Falls back to localStorage in browser environments when Capacitor is unavailable.
 */
export class StorageAdapter {
  private static instance: StorageAdapter | null = null;
  private group: string;
  /** Set by tests to force capacitor env detection. */
  static __mockStorage: typeof Preferences | null = null;

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
        const result = await Preferences.get({ key });
        if (result.value === null) return null;
        return this.parseJson<T>(result.value);
      } catch (e) {
        reportStorageFallback("get", e);
        return this.getFromLocalStorage<T>(key);
      }
    }
    return this.getFromLocalStorage<T>(key);
  }

  /** Set a value in storage. The value is JSON-stringified. */
  async set<T>(key: string, value: T): Promise<void> {
    if (this.isCapacitorEnv()) {
      try {
        await Preferences.set({ key, value: this.stringify(value) });
        return;
      } catch (e) {
        reportStorageFallback("set", e);
        // fall through to localStorage
      }
    }
    this.setInLocalStorage(key, value);
  }

  /** Remove a value from storage by key. */
  async remove(key: string): Promise<void> {
    if (this.isCapacitorEnv()) {
      try {
        await Preferences.remove({ key });
        return;
      } catch (e) {
        reportStorageFallback("remove", e);
        // fall through to localStorage
      }
    }
    this.removeFromLocalStorage(key);
  }

  /** Clear all values from storage. */
  async clear(): Promise<void> {
    if (this.isCapacitorEnv()) {
      try {
        await Preferences.clear();
        return;
      } catch (e) {
        reportStorageFallback("clear", e);
        // fall through to localStorage
      }
    }
    localStorage.clear();
  }

  /** Return all known keys in storage. */
  async keys(): Promise<string[]> {
    if (this.isCapacitorEnv()) {
      try {
        const result = await Preferences.keys();
        return result.keys;
      } catch (e) {
        reportStorageFallback("keys", e);
        return this.getLocalStorageKeys();
      }
    }
    return this.getLocalStorageKeys();
  }

  /**
   * Inject a fake Storage plugin for testing.
   * Must be called BEFORE getInstance() to take effect.
   */
  static injectMockPlugin(mockPlugin: typeof Preferences): void {
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
