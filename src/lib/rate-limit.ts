/** In-memory sliding-window rate limiter. */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodically prune stale entries to prevent unbounded memory growth.
// Runs at most once per minute.
let lastCleanup = 0;
function pruneStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.timestamps.every((t) => now - t >= windowMs)) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Duration of the sliding window in milliseconds. */
  windowMs: number;
}

/**
 * Returns `true` if the request is allowed, `false` if it should be blocked.
 * @param key   A unique identifier for the caller (e.g. IP address or user ID).
 */
export function checkRateLimit(key: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  pruneStaleEntries(options.windowMs);

  const entry = store.get(key) ?? { timestamps: [] };

  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => now - t < options.windowMs);

  if (entry.timestamps.length >= options.maxRequests) {
    store.set(key, entry);
    return false;
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return true;
}
