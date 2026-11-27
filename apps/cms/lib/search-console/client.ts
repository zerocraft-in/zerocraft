import "server-only";

import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase-service";
import { decryptSearchConsoleToken } from "./crypto";

const API = "https://www.googleapis.com/webmasters/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class SearchConsoleError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "SearchConsoleError";
  }
}

export function searchConsoleOAuthConfiguration() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI?.trim();
  const missing = [!clientId && "GOOGLE_OAUTH_CLIENT_ID", !clientSecret && "GOOGLE_OAUTH_CLIENT_SECRET", !redirectUri && "GOOGLE_SEARCH_CONSOLE_REDIRECT_URI"].filter(Boolean);
  if (missing.length) throw new SearchConsoleError(`Search Console OAuth is not configured. Missing: ${missing.join(", ")}.`, 503, "oauth_not_configured");
  if (!clientId || !clientSecret || !redirectUri) throw new SearchConsoleError("Search Console OAuth is not configured.", 503, "oauth_not_configured");
  let redirect: URL;
  try { redirect = new URL(redirectUri); } catch { throw new SearchConsoleError("The Search Console OAuth redirect URI is invalid.", 503, "oauth_config_invalid"); }
  if (redirect.protocol !== "https:" && redirect.hostname !== "localhost") throw new SearchConsoleError("The Search Console OAuth redirect URI must use HTTPS.", 503, "oauth_config_invalid");
  return { clientId, clientSecret, redirectUri };
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const payload = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok || !payload.access_token) throw new SearchConsoleError(payload.error === "invalid_grant" ? "Google authorization expired. Reconnect Search Console." : "Google Search Console authorization could not be completed.", response.status || 502, payload.error === "invalid_grant" ? "oauth_revoked" : "oauth_exchange_failed");
  return payload;
}

export async function exchangeSearchConsoleCode(code: string, verifier: string) {
  const config = searchConsoleOAuthConfiguration();
  return exchangeToken(new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: verifier }));
}

let accessTokenCache: { token: string; expiresAt: number; fingerprint: string } | null = null;

async function getAccessToken() {
  const service = await createServiceClient();
  const { data, error } = await service.from("integrations").select("encrypted_credentials,enabled,status").eq("provider", "search_console").maybeSingle();
  if (error) throw new SearchConsoleError("Search Console connection storage is unavailable.", 503, "storage_unavailable");
  if (!data?.enabled || data.status !== "connected" || !data.encrypted_credentials) throw new SearchConsoleError("Connect Google Search Console before loading SEO data.", 409, "not_connected");
  let refreshToken: string;
  try { refreshToken = decryptSearchConsoleToken(data.encrypted_credentials); } catch { throw new SearchConsoleError("Search Console credentials could not be decrypted. Reconnect the property.", 503, "credential_decryption_failed"); }
  const fingerprint = createHash("sha256").update(refreshToken).digest("hex");
  if (accessTokenCache?.fingerprint === fingerprint && accessTokenCache.expiresAt > Date.now() + 30_000) return accessTokenCache.token;
  const config = searchConsoleOAuthConfiguration();
  const token = await exchangeToken(new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }));
  accessTokenCache = { token: token.access_token!, expiresAt: Date.now() + Math.max(60, token.expires_in || 3600) * 1000, fingerprint };
  return token.access_token!;
}

async function api<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${await getAccessToken()}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new SearchConsoleError(response.status === 401 ? "Search Console authorization expired. Reconnect the property." : "Google Search Console could not complete this request.", response.status, response.status === 401 ? "unauthorized" : `google_http_${response.status}`);
  return response.json() as Promise<T>;
}

export type SearchConsoleSite = { siteUrl?: string; permissionLevel?: string };
export type SearchConsoleQueryRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
export type SearchConsoleSitemap = { path?: string; lastDownloaded?: string; isPending?: boolean; warnings?: string; errors?: string };

export async function listSearchConsoleSites(accessToken: string) {
  const response = await fetch(`${API}/sites`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new SearchConsoleError("Google Search Console properties could not be loaded.", response.status, "sites_unavailable");
  const payload = await response.json() as { siteEntry?: SearchConsoleSite[] };
  return payload.siteEntry || [];
}

export async function searchConsoleDashboard(siteUrl: string, startDate: string, endDate: string) {
  const [queryData, dateData, sitemaps] = await Promise.all([
    api<{ rows?: SearchConsoleQueryRow[] }>(`/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: "POST", body: JSON.stringify({ startDate, endDate, dimensions: ["query"], rowLimit: 10, dataState: "final" }) }),
    api<{ rows?: SearchConsoleQueryRow[] }>(`/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, { method: "POST", body: JSON.stringify({ startDate, endDate, dimensions: ["date"], rowLimit: 31, dataState: "final" }) }),
    api<{ sitemap?: SearchConsoleSitemap[] }>(`/sites/${encodeURIComponent(siteUrl)}/sitemaps`),
  ]);
  return { siteUrl, period: { startDate, endDate }, queries: queryData.rows || [], daily: dateData.rows || [], sitemaps: sitemaps.sitemap || [] };
}

export function clearSearchConsoleAccessTokenCache() { accessTokenCache = null; }
