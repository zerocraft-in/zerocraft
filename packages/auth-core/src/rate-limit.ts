/**
 * Small in-memory rate limiter used as a defensive layer in front of
 * Supabase Auth's own server-side limits.
 *
 * It is intentionally not a distributed store. In multi-instance deployments
 * Supabase Auth remains the authoritative limiter for email delivery and
 * token verification. The factory accepts a clock so behaviour is testable.
 */

export type RateLimitRule = {
  /** Maximum number of events allowed in the window. */
  max: number;
  /** Sliding/fixed window size in milliseconds. */
  windowMs: number;
  /** Minimum delay between consecutive allowed events. */
  minIntervalMs?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
};

type Entry = {
  count: number;
  resetAt: number;
  lastAt: number;
};

export type RateLimiter = {
  check(key: string, rule: RateLimitRule): RateLimitResult;
  reset(): void;
};

export function createRateLimiter(now: () => number = Date.now): RateLimiter {
  const entries = new Map<string, Entry>();

  function prune(current: number) {
    for (const [key, entry] of entries) {
      if (current > entry.resetAt) entries.delete(key);
    }
  }

  return {
    check(key, rule) {
      const current = now();
      if (entries.size > 5000) prune(current);

      const existing = entries.get(key);

      if (!existing || current >= existing.resetAt) {
        entries.set(key, {
          count: 1,
          resetAt: current + rule.windowMs,
          lastAt: current,
        });
        return {
          allowed: true,
          retryAfterMs: 0,
          remaining: Math.max(0, rule.max - 1),
        };
      }

      const minInterval = rule.minIntervalMs ?? 0;
      if (minInterval > 0 && current - existing.lastAt < minInterval) {
        return {
          allowed: false,
          retryAfterMs: minInterval - (current - existing.lastAt),
          remaining: Math.max(0, rule.max - existing.count),
        };
      }

      if (existing.count >= rule.max) {
        return {
          allowed: false,
          retryAfterMs: Math.max(0, existing.resetAt - current),
          remaining: 0,
        };
      }

      existing.count += 1;
      existing.lastAt = current;
      return {
        allowed: true,
        retryAfterMs: 0,
        remaining: Math.max(0, rule.max - existing.count),
      };
    },

    reset() {
      entries.clear();
    },
  };
}

export const authRateLimiter = createRateLimiter();

export const RATE_LIMIT_RULES = {
  emailSend: { max: 5, windowMs: 15 * 60_000, minIntervalMs: 60_000 },
  otpVerify: { max: 10, windowMs: 15 * 60_000, minIntervalMs: 5_000 },
  signup: { max: 5, windowMs: 60 * 60_000, minIntervalMs: 30_000 },
  handoff: { max: 30, windowMs: 60_000 },
  password: { max: 8, windowMs: 15 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;
