/**
 * Client-side cache with TTL.
 * Uses a dedicated prefix that never collides with the Supabase storageKey
 * ('blinkbuy_auth_token') or any browser extension keys.
 */

const PREFIX = "bb_cache_";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    s.setItem("__bb_ok__", "1");
    s.removeItem("__bb_ok__");
    return s;
  } catch {
    // Private browsing or storage blocked
    return null;
  }
}

export const cache = {
  get<T>(key: string): T | null {
    try {
      const store = safeStorage();
      if (!store) return null;
      const raw = store.getItem(PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expiry) {
        store.removeItem(PREFIX + key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  },

  set<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
    try {
      const store = safeStorage();
      if (!store) return;
      const entry: CacheEntry<T> = { data, expiry: Date.now() + ttl };
      store.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // Storage full — silently ignore
    }
  },

  del(key: string): void {
    try { safeStorage()?.removeItem(PREFIX + key); } catch { /* ignore */ }
  },

  clear(): void {
    try {
      const store = safeStorage();
      if (!store) return;
      Object.keys(store)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => store.removeItem(k));
    } catch { /* ignore */ }
  },

  clearPrefix(prefix: string): void {
    try {
      const store = safeStorage();
      if (!store) return;
      const full = PREFIX + prefix;
      Object.keys(store)
        .filter(k => k.startsWith(full))
        .forEach(k => store.removeItem(k));
    } catch { /* ignore */ }
  },
};

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
