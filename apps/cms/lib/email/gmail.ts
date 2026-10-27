import "server-only";

import { createHash } from "node:crypto";
import type { createClient } from "@zerocraft/supabase/server";
import { createServiceClient } from "@/lib/supabase-service";
import { decryptRefreshToken } from "./gmail-crypto";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
let accessTokenCache: { token: string; expiresAt: number; refreshFingerprint: string } | null = null;
let tokenRefresh: { fingerprint: string; promise: Promise<string> } | null = null;
let tokenCacheGeneration = 0;

export class GmailError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "GmailError";
  }
}

function oauthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new GmailError("Gmail OAuth is not configured on the server.", 503, "oauth_not_configured");
  }
  let redirect: URL;
  try {
    redirect = new URL(redirectUri);
  } catch {
    throw new GmailError("The Gmail OAuth redirect URI is invalid.", 503, "oauth_config_invalid");
  }
  if (redirect.protocol !== "https:" && redirect.hostname !== "localhost") {
    throw new GmailError("The Gmail OAuth redirect URI must use HTTPS.", 503, "oauth_config_invalid");
  }
  return { clientId, clientSecret, redirectUri };
}

export function gmailOAuthConfiguration() {
  return oauthConfig();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok) {
    const code = payload.error === "invalid_grant" ? "oauth_revoked" : "oauth_exchange_failed";
    throw new GmailError(
      payload.error === "invalid_grant"
        ? "Google rejected this authorization. Reconnect the Gmail account."
        : `Google OAuth could not be completed (${payload.error || "unknown_error"}).`,
      response.status,
      code,
    );
  }
  return payload;
}

export async function exchangeAuthorizationCode(code: string, verifier: string) {
  const config = oauthConfig();
  return exchangeToken(new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
    code_verifier: verifier,
  }));
}

export async function getGmailEmail(accessToken: string) {
  const profile = await gmailRequest<{ emailAddress?: string }>(
    accessToken,
    "/users/me/profile",
    { method: "GET" },
  );
  if (!profile.emailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.emailAddress)) {
    throw new GmailError("Google did not return a valid Gmail address.", 502, "profile_invalid");
  }
  return profile.emailAddress;
}

async function getAccessToken() {
  let service;
  try {
    service = createServiceClient();
  } catch {
    throw new GmailError("Gmail token storage is not configured on the server.", 503, "storage_not_configured");
  }
  const { data: connection, error } = await service
    .from("studio_gmail_connections")
    .select("encrypted_refresh_token")
    .eq("connection_id", "workspace")
    .maybeSingle();
  if (error) throw new GmailError("Gmail connection storage is unavailable.", 503, "storage_unavailable");
  if (!connection?.encrypted_refresh_token) {
    accessTokenCache = null;
    throw new GmailError("Connect a Gmail account to use the email workspace.", 409, "not_connected");
  }
  let refreshToken: string;
  try {
    refreshToken = decryptRefreshToken(connection.encrypted_refresh_token);
  } catch {
    throw new GmailError("Gmail credentials could not be decrypted. Reconnect the account.", 503, "credential_decryption_failed");
  }
  const refreshFingerprint = createHash("sha256").update(refreshToken).digest("hex");
  if (
    accessTokenCache &&
    accessTokenCache.refreshFingerprint === refreshFingerprint &&
    accessTokenCache.expiresAt > Date.now() + 30_000
  ) {
    return accessTokenCache.token;
  }
  if (!tokenRefresh || tokenRefresh.fingerprint !== refreshFingerprint) {
    tokenCacheGeneration += 1;
    const generation = tokenCacheGeneration;
    tokenRefresh = {
      fingerprint: refreshFingerprint,
      promise: refreshAccessToken(refreshToken, refreshFingerprint, generation),
    };
  }
  const pending = tokenRefresh.promise;
  try {
    return await pending;
  } finally {
    if (tokenRefresh?.promise === pending) tokenRefresh = null;
  }
}

async function refreshAccessToken(refreshToken: string, refreshFingerprint: string, generation: number) {
  const config = oauthConfig();
  const token = await exchangeToken(new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }));
  if (!token.access_token) {
    throw new GmailError("Google did not return an access token.", 502, "refresh_failed");
  }
  if (generation === tokenCacheGeneration) {
    accessTokenCache = {
      token: token.access_token,
      expiresAt: Date.now() + Math.max(60, token.expires_in || 3600) * 1000,
      refreshFingerprint,
    };
  }
  return token.access_token;
}

export async function gmailRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${GMAIL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const code = response.status === 401 ? "gmail_unauthorized" : `gmail_http_${response.status}`;
    throw new GmailError(
      response.status === 401
        ? "Gmail authorization expired. Reconnect the account."
        : response.status === 429
          ? "Gmail rate limit reached. Wait before retrying."
          : "Gmail could not complete this request.",
      response.status,
      code,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function gmailApi<T>(path: string, init?: RequestInit) {
  return gmailRequest<T>(await getAccessToken(), path, init);
}

export async function gmailAccessToken() {
  return getAccessToken();
}

export async function revokeGmailToken(refreshToken: string) {
  accessTokenCache = null;
  const response = await fetch(GOOGLE_REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new GmailError("Google could not revoke the Gmail authorization.", response.status, "revoke_failed");
}

export function clearGmailAccessTokenCache() {
  tokenCacheGeneration += 1;
  accessTokenCache = null;
  tokenRefresh = null;
}

export function gmailBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function gmailDecodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export function gmailHeader(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

export function gmailTextBody(payload: GmailPart | undefined): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return gmailDecodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts || []) {
    const body = gmailTextBody(part);
    if (body) return body;
  }
  return "";
}

export type GmailPart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  headers?: Array<{ name?: string; value?: string }>;
  parts?: GmailPart[];
};

export function gmailAttachmentParts(payload: GmailPart | undefined): GmailPart[] {
  if (!payload) return [];
  const current = payload.filename && payload.body?.attachmentId ? [payload] : [];
  return current.concat((payload.parts || []).flatMap(gmailAttachmentParts));
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function consumeGmailRateLimit(
  supabase: SupabaseServerClient,
  action: "send" | "read" | "list" | "modify" | "draft" | "connect" | "attachment",
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await supabase.rpc("studio_gmail_consume_rate_limit", {
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new GmailError("Email rate limiting is unavailable. Apply the Gmail workspace migration.", 503, "rate_limit_unavailable");
  if (data !== true) throw new GmailError("Email workspace rate limit reached. Try again shortly.", 429, "rate_limited");
}

export async function recordGmailAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    actorId: string;
    action: "connect" | "disconnect" | "list" | "read" | "modify" | "draft" | "send" | "attachment";
    outcome: "started" | "succeeded" | "failed" | "unknown";
    messageId?: string;
    idempotencyKey?: string;
    detailCode?: string;
  },
) {
  const { error } = await supabase.from("studio_gmail_audit_events").insert({
    actor_id: input.actorId,
    action: input.action,
    outcome: input.outcome,
    gmail_message_id: input.messageId,
    idempotency_key: input.idempotencyKey,
    detail_code: input.detailCode?.slice(0, 80),
  });
  if (error) throw new GmailError("Email audit logging is unavailable.", 503, "audit_unavailable");
}
