/**
 * Simple client-side cache using localStorage with TTL support.
 * Reduces API calls and enables faster loads.
 */

const PREFIX = "blinkbuy_cache_";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export const cache = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(PREFIX + key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
    try {
      const entry: CacheEntry<T> = { data, expiry: Date.now() + ttl };
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // Storage full — silently ignore
    }
  },

  del(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },

  clear(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  },
};

/**
 * Fetch with cache — returns cached data immediately if fresh,
 * otherwise fetches + stores result.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}
