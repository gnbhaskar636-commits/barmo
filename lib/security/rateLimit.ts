// ---------------------------------------------------------------------------
// lib/security/rateLimit.ts — Client-Side Rate Limiting (sliding window)
// Phase 19 – Performance & Security Hardening
// ---------------------------------------------------------------------------

/** Result of a `tryConsume` call. */
export interface ConsumeResult {
  /** Whether the request was allowed. */
  allowed: boolean;
  /** Milliseconds until the next request would be allowed (0 if allowed). */
  retryAfterMs: number;
}

/** Statistics for a single key (or the global default). */
export interface LimiterStats {
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix-ms timestamp when the oldest entry in the window expires. */
  resetAtMs: number;
}

// Internal per-key bucket
interface Bucket {
  timestamps: number[];
}

const DEFAULT_KEY = "__default__";

// ── RateLimiter class ------------------------------------------------------

/**
 * Sliding-window rate limiter.
 *
 * Each call to `tryConsume` records a timestamp.  Only timestamps within
 * `windowMs` of *now* count toward the limit.  Expired entries are pruned
 * lazily on every access.
 */
export class RateLimiter {
  private readonly _maxRequests: number;
  private readonly _windowMs: number;
  private readonly _buckets: Record<string, Bucket>;

  constructor(maxRequests: number, windowMs: number) {
    this._maxRequests =
      typeof maxRequests === "number" &&
      Number.isFinite(maxRequests) &&
      maxRequests >= 0
        ? Math.round(maxRequests)
        : 1;
    this._windowMs =
      typeof windowMs === "number" &&
      Number.isFinite(windowMs) &&
      windowMs > 0
        ? Math.round(windowMs)
        : 1000;

    this._buckets = Object.create(null) as Record<string, Bucket>;
  }

  // -- internal helpers ---

  private _resolveKey(key?: string): string {
    return typeof key === "string" && key.length > 0 ? key : DEFAULT_KEY;
  }

  private _getBucket(key: string): Bucket {
    let bucket = this._buckets[key];
    if (!bucket) {
      bucket = { timestamps: [] };
      this._buckets[key] = bucket;
    }
    return bucket;
  }

  /** Remove timestamps older than the current window. */
  private _prune(bucket: Bucket, now: number): void {
    const cutoff = now - this._windowMs;
    // timestamps are in ascending order; shift from front
    while (bucket.timestamps.length > 0 && bucket.timestamps[0]! < cutoff) {
      bucket.timestamps.shift();
    }
  }

  // -- public API ---

  /**
   * Attempt to consume a request slot.
   *
   * @returns `{ allowed: true, retryAfterMs: 0 }` if under the limit, or
   *          `{ allowed: false, retryAfterMs }` with the wait time.
   */
  tryConsume(key?: string): ConsumeResult {
    const k = this._resolveKey(key);
    const bucket = this._getBucket(k);
    const now = Date.now();

    this._prune(bucket, now);

    if (this._maxRequests === 0) {
      return { allowed: false, retryAfterMs: this._windowMs };
    }

    if (bucket.timestamps.length < this._maxRequests) {
      bucket.timestamps.push(now);
      return { allowed: true, retryAfterMs: 0 };
    }

    // Oldest entry in window determines when a slot frees up
    const oldest = bucket.timestamps[0]!;
    const retryAfterMs = oldest + this._windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  /** Reset all recorded timestamps for a key (or the default key). */
  reset(key?: string): void {
    const k = this._resolveKey(key);
    const bucket = this._buckets[k];
    if (bucket) {
      bucket.timestamps = [];
    }
  }

  /** Current stats for a key. */
  getStats(key?: string): LimiterStats {
    const k = this._resolveKey(key);
    const bucket = this._getBucket(k);
    const now = Date.now();

    this._prune(bucket, now);

    const remaining = Math.max(
      0,
      this._maxRequests - bucket.timestamps.length,
    );
    const resetAtMs =
      bucket.timestamps.length > 0
        ? bucket.timestamps[0]! + this._windowMs
        : now;

    return { remaining, resetAtMs };
  }
}

// ── factory helpers --------------------------------------------------------

/** 10 messages per 10 seconds. */
export function createChatLimiter(): RateLimiter {
  return new RateLimiter(10, 10_000);
}

/** 5 searches per 5 seconds. */
export function createSearchLimiter(): RateLimiter {
  return new RateLimiter(5, 5_000);
}

/** 30 requests per 60 seconds. */
export function createAPILimiter(): RateLimiter {
  return new RateLimiter(30, 60_000);
}
