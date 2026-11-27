import "server-only";

import { originOf, isSafeOrigin } from "@zerocraft/auth-core";

/**
 * Cross-subdomain authentication configuration for the admin application.
 *
 * The accounts origin is the only place central login/signup/verification
 * happens. The admin origin must be the canonical origin this application is
 * served from; it is bound into every handoff code.
 */

export const HANDOFF_STATE_COOKIE = "zc_admin_handoff_state";
export const HANDOFF_VERIFIER_COOKIE = "zc_admin_handoff_verifier";
export const HANDOFF_RETURN_COOKIE = "zc_admin_handoff_return";
export const HANDOFF_COOKIE_PATH = "/auth";
export const HANDOFF_COOKIE_MAX_AGE = 10 * 60;

const DEFAULT_ACCOUNTS_ORIGIN = "http://localhost:3001";

function normalizeOrigin(
  value: string | undefined,
  fallback: string,
  label: string,
): string {
  if (!value) return fallback;

  const origin = originOf(value);
  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${label} must be an absolute HTTPS origin`);
    }
    console.warn(`[auth] Ignoring unsafe ${label}.`);
    return fallback;
  }

  return origin;
}

export function getAccountsOrigin(): string {
  return normalizeOrigin(
    process.env.NEXT_PUBLIC_ACCOUNTS_URL,
    DEFAULT_ACCOUNTS_ORIGIN,
    "NEXT_PUBLIC_ACCOUNTS_URL",
  );
}

export function getAdminOrigin(requestOrigin?: string): string {
  const configured =
    process.env.NEXT_PUBLIC_ADMIN_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    requestOrigin;

  if (configured) {
    const origin = originOf(configured);
    if (origin) return origin;
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_ADMIN_URL must be an absolute HTTPS origin");
    }
  }

  return "http://localhost:3000";
}

export function getHandoffSecret(): string | null {
  const secret = process.env.AUTH_HANDOFF_SECRET;
  if (!secret || secret.length < 32) return null;
  return secret;
}

export function isHandoffConfigured(): boolean {
  return Boolean(getHandoffSecret() && isSafeOrigin(getAccountsOrigin()));
}

/** Cookie options for the short-lived handoff cookies. */
export function handoffCookieOptions(maxAge = HANDOFF_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: HANDOFF_COOKIE_PATH,
    maxAge,
  };
}
