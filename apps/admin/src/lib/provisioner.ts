/**
 * Server-only client for the tenant provisioning Worker.
 *
 * The browser never talks to this Worker directly. Server Actions and Route
 * Handlers authenticate the user with Supabase, then call the Worker with the
 * shared service credential. The Worker performs its own owner check with the
 * forwarded user access token.
 *
 * Never import this module from a client component.
 */

import "server-only";

export class ProvisionerError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProvisionerError";
  }
}

export interface SupabaseOrganizationOption {
  id: string;
  name: string;
  slug: string;
}

export interface PendingOAuthSession {
  organizationId: string;
  organizations: SupabaseOrganizationOption[];
  expiresAt: string;
}

export interface ConnectionSummary {
  connectionId: string;
  organization: SupabaseOrganizationOption;
}

function workerUrl(): string {
  const raw = process.env.TENANT_PROVISIONER_URL?.trim();
  if (!raw) {
    throw new ProvisionerError(
      500,
      "PROVISIONER_NOT_CONFIGURED",
      "TENANT_PROVISIONER_URL is not configured",
    );
  }
  return raw.replace(/\/+$/, "");
}

function sharedSecret(): string {
  const secret = process.env.TENANT_PROVISIONER_SHARED_SECRET?.trim();
  if (!secret) {
    throw new ProvisionerError(
      500,
      "PROVISIONER_NOT_CONFIGURED",
      "TENANT_PROVISIONER_SHARED_SECRET is not configured",
    );
  }
  return secret;
}

async function call<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${workerUrl()}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const body = parsed as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new ProvisionerError(
      response.status,
      body?.error?.code ?? `http_${response.status}`,
      body?.error?.message ?? "Provisioning Worker request failed",
    );
  }

  return (parsed ?? {}) as T;
}

function authHeaders(shared: string, userAccessToken?: string): HeadersInit {
  return {
    authorization: `Bearer ${shared}`,
    ...(userAccessToken ? { "x-user-access-token": userAccessToken } : {}),
  };
}

export async function startSupabaseOAuth(input: {
  organizationId: string;
  userAccessToken: string;
  returnTo: string;
}): Promise<{ authorizeUrl: string; scopes: string[] }> {
  return call("/oauth/start", {
    method: "POST",
    headers: authHeaders(sharedSecret()),
    body: JSON.stringify(input),
  });
}

export async function getPendingOAuthSession(input: {
  state: string;
  userAccessToken: string;
}): Promise<PendingOAuthSession> {
  const params = new URLSearchParams({ state: input.state });
  return call(`/oauth/pending?${params.toString()}`, {
    method: "GET",
    headers: authHeaders(sharedSecret(), input.userAccessToken),
  });
}

export async function finalizeSupabaseOAuth(input: {
  state: string;
  supabaseOrganizationId: string;
  accountName?: string;
  userAccessToken: string;
}): Promise<ConnectionSummary> {
  return call("/oauth/finalize", {
    method: "POST",
    headers: authHeaders(sharedSecret(), input.userAccessToken),
    body: JSON.stringify({
      state: input.state,
      supabaseOrganizationId: input.supabaseOrganizationId,
      accountName: input.accountName,
    }),
  });
}

export async function startProvisioningJob(jobId: string): Promise<void> {
  await call("/jobs/start", {
    method: "POST",
    headers: authHeaders(sharedSecret()),
    body: JSON.stringify({ jobId }),
  });
}

export function allowedRegions(): string[] {
  const configured = (process.env.TENANT_ALLOWED_REGIONS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;
  return ["ap-south-1", "ap-southeast-1", "eu-central-1", "us-east-1"];
}

export function platformAssertionConfig(): {
  issuer: string | null;
  audience: string | null;
  jwksUrl: string | null;
} {
  return {
    issuer: process.env.PLATFORM_JWT_ISSUER?.trim() || null,
    audience: process.env.PLATFORM_JWT_AUDIENCE?.trim() || null,
    jwksUrl: process.env.PLATFORM_JWKS_URL?.trim() || null,
  };
}
