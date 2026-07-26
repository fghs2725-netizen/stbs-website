/**
 * Distributed rate limiter.
 *
 * Primary: Redis INCR+EXPIRE (atomic, works across serverless instances).
 * Fallback: in-memory Map (single-process only — acceptable for local dev).
 */

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ─── In-memory fallback (local dev only) ────────────────────────────────────

const memStore = new Map<string, { count: number; resetAt: number }>();

function memCheck(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.maxRequests - 1, resetAt: now + opts.windowMs };
  }

  if (entry.count >= opts.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: opts.maxRequests - entry.count, resetAt: entry.resetAt };
}

// Cleanup stale entries every 5 minutes (in-memory only)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore.entries()) {
      if (now > entry.resetAt) memStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

// ─── Redis client (lazy) ────────────────────────────────────────────────────

let redisClient: unknown = null;
let redisAvailable = false;
let redisInitAttempted = false;

async function getRedisClient(): Promise<unknown | null> {
  if (redisInitAttempted) return redisAvailable ? redisClient : null;
  redisInitAttempted = true;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    // eslint-disable-next-line no-eval
    const mod = (await eval('import("redis")')) as {
      createClient: (opts: { url: string }) => Promise<{
        connect: () => Promise<void>;
        set: (key: string, value: string, opts?: { EX?: number; NX?: boolean }) => Promise<unknown>;
        incr: (key: string) => Promise<number>;
        expire: (key: string, seconds: number) => Promise<void>;
        ttl: (key: string) => Promise<number>;
        on: (event: string, cb: () => void) => void;
      }>;
    };
    const client = await mod.createClient({ url: redisUrl });
    client.on("error", () => {
      redisAvailable = false;
    });
    await client.connect();
    redisClient = client;
    redisAvailable = true;
    return client;
  } catch {
    redisAvailable = false;
    return null;
  }
}

async function redisCheck(key: string, opts: RateLimitOptions): Promise<RateLimitResult | null> {
  const client = await getRedisClient();
  if (!client) return null;

  const c = client as {
    incr: (key: string) => Promise<number>;
    expire: (key: string, seconds: number) => Promise<void>;
    ttl: (key: string) => Promise<number>;
  };

  try {
    const windowSec = Math.ceil(opts.windowMs / 1000);
    const count = await c.incr(key);

    if (count === 1) {
      await c.expire(key, windowSec);
    }

    const ttl = await c.ttl(key);
    const resetAt = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + opts.windowMs;

    if (count > opts.maxRequests) {
      return { allowed: false, remaining: 0, resetAt };
    }

    return { allowed: true, remaining: opts.maxRequests - count, resetAt };
  } catch {
    // Redis failed — fall through to in-memory
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redisResult = await redisCheck(key, options);
  if (redisResult) return redisResult;

  return memCheck(key, options);
}

export function applyRateLimitHeaders(
  response: Response,
  result: { remaining: number; resetAt: number }
): Response {
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  return response;
}
