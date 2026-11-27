import "server-only";

import { headers } from "next/headers";

import {
  authRateLimiter,
  RATE_LIMIT_RULES,
  type RateLimitRule,
} from "@zerocraft/auth-core";

export function clientIp(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return requestHeaders.get("x-real-ip") ?? "unknown";
}

export async function checkAuthRateLimit(
  scope: keyof typeof RATE_LIMIT_RULES,
  email: string,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const rule: RateLimitRule = RATE_LIMIT_RULES[scope];
  const key = `${scope}:${ip}:${email.toLowerCase()}`;
  const result = authRateLimiter.check(key, rule);

  return {
    allowed: result.allowed,
    retryAfterSeconds: Math.max(1, Math.ceil(result.retryAfterMs / 1000)),
  };
}
