/**
 * In-memory cache layer for expensive operations.
 *
 * Supports TTL-based expiry and keyed invalidation.
 * Two tiers:
 *   - CPU  : fast TTL for pure computation (stats, lookups)
 *   - IO   : longer TTL for DB-heavy operations (balances, reports)
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

type CacheTier = "cpu" | "io";

const DEFAULT_TTL_MS: Record<CacheTier, number> = {
  cpu: 60_000, // 1 min
  io: 300_000, // 5 min
};

const store = new Map<string, CacheEntry<unknown>>();

export interface CacheOpts {
  /** Cache tier; controls default TTL */
  tier?: CacheTier;
  /** Override TTL in milliseconds */
  ttlMs?: number;
}

const defaultTtl = (tier: CacheTier): number => DEFAULT_TTL_MS[tier];

/**
 * Get a cached value, or undefined if missing/expired.
 */
export function get<T>(key: string, opts: CacheOpts = {}): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Set a cached value with optional TTL.
 */
export function set<T>(key: string, value: T, opts: CacheOpts = {}): void {
  const tier = opts.tier ?? "io";
  const ttlMs = opts.ttlMs ?? defaultTtl(tier);
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Delete a single cached entry.
 */
export function del(key: string): void {
  store.delete(key);
}

/**
 * Delete all keys matching a prefix.
 */
export function invalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Clear the entire cache.
 */
export function clear(): void {
  store.clear();
}

/**
 * Get cache stats (useful for tests / diagnostics).
 */
export function stats(): { size: number; entries: string[] } {
  const entries = Array.from(store.keys());
  return { size: entries.length, entries };
}

/**
 * Cache an async function result with key + TTL.
 */
export async function asyncGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  opts: CacheOpts = {},
): Promise<T> {
  const cached = get<T>(key, opts);
  if (cached !== undefined) return cached;
  const value = await factory();
  set(key, value, opts);
  return value;
}
