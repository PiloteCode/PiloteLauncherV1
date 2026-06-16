/**
 * Tiny in-memory, per-key fixed-window rate limiter. Used to throttle unlock
 * attempts per client IP. Bounds are read from env:
 *   UNLOCK_MAX_ATTEMPTS  (default 10)
 *   UNLOCK_WINDOW_SECONDS (default 600)
 *
 * In-memory is sufficient for the single-node distribution backend. For a
 * multi-node deployment, swap the Map for Redis with the same interface.
 */

interface Bucket {
  count: number;
  /** epoch ms when the current window resets. */
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic sweep so the map doesn't grow unbounded across windows.
let lastSweep = 0;
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function maxAttempts(): number {
  const n = Number.parseInt(process.env.UNLOCK_MAX_ATTEMPTS ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

function windowMs(): number {
  const n = Number.parseInt(process.env.UNLOCK_WINDOW_SECONDS ?? '', 10);
  return (Number.isFinite(n) && n > 0 ? n : 600) * 1000;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining attempts in the current window (0 when blocked). */
  remaining: number;
  /** Seconds until the window resets (for Retry-After). */
  retryAfterSeconds: number;
  limit: number;
}

/**
 * Consume one attempt for `key`. Returns whether it is allowed and metadata for
 * rate-limit headers. A blocked call does not extend the window.
 */
export function consumeRateLimit(
  key: string,
  options?: { limit?: number; windowMs?: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const limit = options?.limit ?? maxAttempts();
  const win = options?.windowMs ?? windowMs();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + win };
    buckets.set(key, bucket);
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds, limit };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
    limit,
  };
}

/** Reset a key's window (e.g. after a successful unlock, to be forgiving). */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Best-effort client IP extraction from standard proxy headers, falling back
 * to a constant so the limiter still functions behind a single host.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}
