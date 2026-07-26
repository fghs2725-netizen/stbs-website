// ─── Types ──────────────────────────────────────────────────────────────────

export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

// ─── In-Memory Cache ────────────────────────────────────────────────────────

class MemoryCache {
  private store = new Map<string, CacheEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.evictExpired();
    }, 30_000);
  }

  get<T = unknown>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlSeconds = 300): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    let count = 0;

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  getTtl(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return -1;

    const remaining = entry.expiresAt - Date.now();
    if (remaining <= 0) {
      this.store.delete(key);
      return -1;
    }

    return Math.ceil(remaining / 1000);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    this.evictExpired();
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// ─── Redis Cache ────────────────────────────────────────────────────────────

class RedisCache {
  private redisUrl: string;
  private client: unknown = null;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  private async getClient(): Promise<unknown> {
    if (this.client) return this.client;

    try {
      // Dynamic import — redis is an optional dependency
      const mod = await eval('import("redis")') as { createClient: (opts: { url: string }) => { on: (event: string, cb: () => void) => void; connect: () => Promise<void> } };
      const client = mod.createClient({ url: this.redisUrl });
      client.on("error", () => {});
      await client.connect();
      this.client = client;
      return client;
    } catch {
      throw new Error("Redis client not available. Install 'redis' package or use in-memory cache.");
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient() as { get: (key: string) => Promise<string | null> };
      const raw = await client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      const client = await this.getClient() as {
        set: (key: string, value: string, options?: { EX: number }) => Promise<string | null>;
      };
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch {
      // Silently fail — cache miss is acceptable
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const client = await this.getClient() as { del: (key: string) => Promise<number> };
      const result = await client.del(key);
      return result > 0;
    } catch {
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = await this.getClient() as {
        keys: (pattern: string) => Promise<string[]>;
        del: (...keys: string[]) => Promise<number>;
      };
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      return await client.del(...keys);
    } catch {
      return 0;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const client = await this.getClient() as { exists: (key: string) => Promise<number> };
      const result = await client.exists(key);
      return result > 0;
    } catch {
      return false;
    }
  }

  async getTtl(key: string): Promise<number> {
    try {
      const client = await this.getClient() as { ttl: (key: string) => Promise<number> };
      return await client.ttl(key);
    } catch {
      return -1;
    }
  }

  async clear(): Promise<void> {
    try {
      const client = await this.getClient() as { flushDb: () => Promise<string> };
      await client.flushDb();
    } catch {
      // Ignore
    }
  }

  async size(): Promise<number> {
    try {
      const client = await this.getClient() as { dbSize: () => Promise<number> };
      return await client.dbSize();
    } catch {
      return 0;
    }
  }
}

// ─── Union type for internal cache handle ───────────────────────────────────

type CacheHandle = MemoryCache | RedisCache;

function isMemoryCache(handle: CacheHandle): handle is MemoryCache {
  return handle instanceof MemoryCache;
}

// ─── Cache Factory ──────────────────────────────────────────────────────────

function createCache(): CacheHandle {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      return new RedisCache(redisUrl);
    } catch {
      console.warn("[Cache] Redis unavailable, falling back to in-memory cache");
    }
  }

  return new MemoryCache();
}

// ─── Unified Cache API ─────────────────────────────────────────────────────

let _cache: CacheHandle | null = null;

function getCache(): CacheHandle {
  if (!_cache) {
    _cache = createCache();
  }
  return _cache;
}

/**
 * Get a value from cache.
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const cache = getCache();
  if (isMemoryCache(cache)) {
    return cache.get<T>(key);
  }
  return cache.get<T>(key);
}

/**
 * Set a value in cache with TTL.
 */
export async function cacheSet<T = unknown>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  const cache = getCache();
  if (isMemoryCache(cache)) {
    cache.set(key, value, ttlSeconds);
  } else {
    await cache.set(key, value, ttlSeconds);
  }
}

/**
 * Delete a key from cache.
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const cache = getCache();
  if (isMemoryCache(cache)) {
    return cache.delete(key);
  }
  return cache.delete(key);
}

/**
 * Invalidate all keys matching a pattern (e.g. "doc:*").
 */
export async function cacheInvalidate(pattern: string): Promise<number> {
  const cache = getCache();
  if (isMemoryCache(cache)) {
    return cache.invalidatePattern(pattern);
  }
  return cache.invalidatePattern(pattern);
}

/**
 * Check if a key exists and is not expired.
 */
export async function cacheHas(key: string): Promise<boolean> {
  const cache = getCache();
  if (isMemoryCache(cache)) {
    return cache.has(key);
  }
  return cache.has(key);
}

/**
 * Cache-aside pattern: get from cache, or compute and store.
 */
export async function cached<T = unknown>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
  const cachedValue = await cacheGet<T>(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const freshValue = await fetchFn();
  await cacheSet(key, freshValue, ttlSeconds);
  return freshValue;
}
