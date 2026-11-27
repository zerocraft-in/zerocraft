/**
 * Redirect validation shared by every Zerocraft authentication surface.
 *
 * Two distinct values are validated:
 *  - `next` query parameters, which must be same-origin relative paths.
 *  - Return URLs handed between the accounts and admin applications, which
 *    must be absolute URLs on an explicitly allow-listed origin.
 *
 * Everything here is deny-by-default. These helpers are pure so they can be
 * tested without a browser or a running Supabase project.
 */

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MAX_REDIRECT_LENGTH = 2048;

export type PostAuthDestination =
  | { type: "accounts"; path: string }
  | { type: "admin"; path: string }
  | { type: "fallback"; path: string };

export type OriginConfig = {
  accountsOrigin: string;
  adminOrigin: string;
};

function parseAbsoluteOrigin(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Returns `true` when the origin is safe to redirect to.
 *
 * HTTPS is mandatory except for loopback development hosts. Credentials in
 * the URL are always rejected.
 */
export function isSafeOrigin(value: string): boolean {
  const url = parseAbsoluteOrigin(value);
  if (!url) return false;

  if (url.protocol === "https:") return true;

  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

export function originOf(value: string): string | null {
  const url = parseAbsoluteOrigin(value);
  if (!url || !isSafeOrigin(value)) return null;
  return url.origin;
}

/**
 * Validates a same-origin relative path. Absolute URLs, protocol-relative
 * URLs, backslashes and control characters are rejected rather than patched.
 *
 * `#fragment` values are preserved only when the rest of the path is valid.
 */
export function safeRedirectPath(
  input: string | null | undefined,
  fallback = "/",
): string {
  if (typeof input !== "string") return fallback;

  const value = input.trim();
  if (!value || value.length > MAX_REDIRECT_LENGTH) return fallback;
  if (CONTROL_CHARACTERS.test(value)) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;

  // Reject encoded protocol-relative and absolute URL tricks such as
  // `/%2f%2fevil.example` before URL normalization can hide them.
  const lowered = value.toLowerCase();
  if (
    lowered.includes("%2f%2f") ||
    lowered.includes("%5c") ||
    lowered.includes("%0d") ||
    lowered.includes("%0a")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://zerocraft.invalid");
    if (parsed.origin !== "https://zerocraft.invalid") return fallback;
    if (!parsed.pathname.startsWith("/")) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Accepts an absolute URL only when its origin exactly matches one of the
 * allow-listed origins. Returns the path and query for the redirect target,
 * never the full attacker-controlled URL.
 */
export function absoluteUrlPathOnAllowedOrigin(
  input: string | null | undefined,
  allowedOrigins: readonly string[],
): { origin: string; path: string } | null {
  if (typeof input !== "string") return null;

  const value = input.trim();
  if (!value || value.length > MAX_REDIRECT_LENGTH) return null;
  if (CONTROL_CHARACTERS.test(value)) return null;

  const url = parseAbsoluteOrigin(value);
  if (!url) return null;

  const normalizedAllowed = allowedOrigins
    .map((origin) => origin.replace(/\/+$/, ""))
    .filter(Boolean);

  if (!normalizedAllowed.includes(url.origin)) return null;

  const path = `${url.pathname || "/"}${url.search}${url.hash}`;
  return { origin: url.origin, path: safeRedirectPath(path) };
}

/**
 * Resolves where a user should land after authentication.
 *
 * Relative paths stay in the accounts application. Absolute paths are only
 * accepted for the configured admin origin. Any other value falls back.
 */
export function resolvePostAuthDestination(
  input: string | null | undefined,
  config: OriginConfig,
  fallback = "/",
): PostAuthDestination {
  const value = typeof input === "string" ? input.trim() : "";

  if (!value) {
    return { type: "fallback", path: fallback };
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return { type: "accounts", path: safeRedirectPath(value, fallback) };
  }

  const allowed = absoluteUrlPathOnAllowedOrigin(value, [
    config.accountsOrigin,
    config.adminOrigin,
  ]);

  if (!allowed) {
    return { type: "fallback", path: fallback };
  }

  if (allowed.origin === config.adminOrigin) {
    return { type: "admin", path: allowed.path };
  }

  return { type: "accounts", path: allowed.path };
}

/**
 * Builds a callback URL on the trusted accounts origin.
 *
 * `next` may be a relative accounts path or an absolute URL on the configured
 * admin origin. Anything else is dropped before the email is sent.
 */
export function buildCallbackUrl(
  accountsOrigin: string,
  next: string | null | undefined,
  options: { adminOrigin?: string; fallbackPath?: string } = {},
): string {
  const callback = new URL("/callback", accountsOrigin);
  const fallbackPath = options.fallbackPath ?? "/";

  if (typeof next === "string" && next.trim()) {
    if (next.startsWith("/") && !next.startsWith("//")) {
      callback.searchParams.set("next", safeRedirectPath(next, fallbackPath));
    } else if (options.adminOrigin) {
      const allowed = absoluteUrlPathOnAllowedOrigin(next, [
        options.adminOrigin,
      ]);
      if (allowed) {
        callback.searchParams.set("next", next);
      }
    }
  }

  return callback.toString();
}
