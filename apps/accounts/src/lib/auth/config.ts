import "server-only";

import { originOf, isSafeOrigin } from "@zerocraft/auth-core";

const DEFAULT_ACCOUNTS_ORIGIN = "http://localhost:3001";
const DEFAULT_ADMIN_ORIGIN = "http://localhost:3000";

function normalizeOrigin(
  value: string | undefined,
  fallback: string,
  label: string,
): string {
  if (!value) return fallback;

  const origin = originOf(value);
  if (!origin) {
    // Fail closed in production rather than silently redirecting to a
    // misconfigured or plaintext origin.
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${label} must be an absolute HTTPS origin`);
    }
    console.warn(
      `[auth] Ignoring unsafe ${label}: ${label} is not a safe origin.`,
    );
    return fallback;
  }

  return origin;
}

export function getAccountsOrigin(): string {
  return normalizeOrigin(
    process.env.NEXT_PUBLIC_ACCOUNTS_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    DEFAULT_ACCOUNTS_ORIGIN,
    "NEXT_PUBLIC_ACCOUNTS_URL",
  );
}

export function getAdminOrigin(): string {
  return normalizeOrigin(
    process.env.NEXT_PUBLIC_ADMIN_URL,
    DEFAULT_ADMIN_ORIGIN,
    "NEXT_PUBLIC_ADMIN_URL",
  );
}

export function getOriginConfig() {
  return {
    accountsOrigin: getAccountsOrigin(),
    adminOrigin: getAdminOrigin(),
  };
}

export type PublicAuthConfig = {
  accountsOrigin: string;
  adminOrigin: string;
  partnersUrl: string | null;
  communityUrl: string | null;
  googleEnabled: boolean;
  appleEnabled: boolean;
};

function safeOptionalDestination(value: string | undefined): string | null {
  if (!value) return null;
  const origin = originOf(value);
  return origin ? value : null;
}

function flag(name: string): boolean {
  return process.env[name] === "true";
}

export function getPublicAuthConfig(): PublicAuthConfig {
  const supabaseConfigured = isSupabaseConfigured();

  return {
    accountsOrigin: getAccountsOrigin(),
    adminOrigin: getAdminOrigin(),
    partnersUrl: safeOptionalDestination(process.env.NEXT_PUBLIC_PARTNERS_URL),
    communityUrl: safeOptionalDestination(
      process.env.NEXT_PUBLIC_COMMUNITY_URL,
    ),
    // A button is only rendered when the provider is explicitly marked as
    // configured. No placeholder or simulated OAuth buttons exist.
    googleEnabled:
      supabaseConfigured && flag("NEXT_PUBLIC_AUTH_GOOGLE_ENABLED"),
    appleEnabled: supabaseConfigured && flag("NEXT_PUBLIC_AUTH_APPLE_ENABLED"),
  };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SECRET_KEY);
}

export function isHandoffConfigured(): boolean {
  return Boolean(
    process.env.AUTH_HANDOFF_SECRET &&
    process.env.AUTH_HANDOFF_SECRET.length >= 32,
  );
}

/** The trusted callback URL used in Supabase email templates and OAuth. */
export function getCallbackUrl(next?: string | null): string {
  const accountsOrigin = getAccountsOrigin();
  const adminOrigin = getAdminOrigin();

  const configured = process.env.AUTH_CALLBACK_URL;
  if (configured) {
    const url = originOf(configured);
    if (!url || url !== accountsOrigin) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("AUTH_CALLBACK_URL must match the accounts origin");
      }
    } else {
      const callback = new URL(configured);
      if (callback.pathname !== "/callback") {
        if (process.env.NODE_ENV === "production") {
          throw new Error("AUTH_CALLBACK_URL must point at /callback");
        }
      } else if (typeof next === "string" && next.trim()) {
        if (next.startsWith("/") && !next.startsWith("//")) {
          callback.searchParams.set("next", next);
        } else {
          const nextUrl = originOf(next);
          if (nextUrl === adminOrigin) {
            callback.searchParams.set("next", next);
          }
        }
      }
      return callback.toString();
    }
  }

  return (() => {
    const callback = new URL("/callback", accountsOrigin);
    if (typeof next === "string" && next.trim()) {
      if (next.startsWith("/") && !next.startsWith("//")) {
        callback.searchParams.set("next", next);
      } else {
        const nextUrl = originOf(next);
        if (nextUrl === adminOrigin) {
          callback.searchParams.set("next", next);
        }
      }
    }
    return callback.toString();
  })();
}

export function assertSafeConfiguredOrigins(): void {
  if (!isSafeOrigin(getAccountsOrigin())) {
    throw new Error("Unsafe accounts origin");
  }
  if (!isSafeOrigin(getAdminOrigin())) {
    throw new Error("Unsafe admin origin");
  }
}
