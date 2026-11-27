import "server-only";

import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase-service";
import { decryptAnalyticsToken } from "./crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_URL = "https://analyticsdata.googleapis.com/v1beta";

export class AnalyticsError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); this.name = "AnalyticsError"; }
}

export function analyticsOAuthConfiguration() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_ANALYTICS_REDIRECT_URI?.trim();
  const missing = [!clientId && "GOOGLE_OAUTH_CLIENT_ID", !clientSecret && "GOOGLE_OAUTH_CLIENT_SECRET", !redirectUri && "GOOGLE_ANALYTICS_REDIRECT_URI"].filter(Boolean);
  if (missing.length || !clientId || !clientSecret || !redirectUri) throw new AnalyticsError(`Google Analytics OAuth is not configured. Missing: ${missing.join(", ")}.`, 503, "oauth_not_configured");
  let redirect: URL;
  try { redirect = new URL(redirectUri); } catch { throw new AnalyticsError("The Google Analytics redirect URI is invalid.", 503, "oauth_config_invalid"); }
  if (redirect.protocol !== "https:" && redirect.hostname !== "localhost") throw new AnalyticsError("The Google Analytics redirect URI must use HTTPS.", 503, "oauth_config_invalid");
  return { clientId, clientSecret, redirectUri };
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
async function exchangeToken(body: URLSearchParams) {
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const payload = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok || !payload.access_token) throw new AnalyticsError(payload.error === "invalid_grant" ? "Google Analytics authorization expired. Reconnect Analytics." : "Google Analytics authorization could not be completed.", response.status || 502, payload.error === "invalid_grant" ? "oauth_revoked" : "oauth_exchange_failed");
  return payload;
}

export async function exchangeAnalyticsCode(code: string, verifier: string) {
  const config = analyticsOAuthConfiguration();
  return exchangeToken(new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: verifier }));
}

let accessTokenCache: { token: string; expiresAt: number; fingerprint: string } | null = null;
async function getAccessToken() {
  const service = await createServiceClient();
  const { data, error } = await service.from("integrations").select("encrypted_credentials,enabled,status").eq("provider", "ga4").maybeSingle();
  if (error) throw new AnalyticsError("Google Analytics connection storage is unavailable.", 503, "storage_unavailable");
  if (!data?.enabled || data.status !== "connected" || !data.encrypted_credentials) throw new AnalyticsError("Connect Google Analytics before loading Live View.", 409, "not_connected");
  let refreshToken: string;
  try { refreshToken = decryptAnalyticsToken(data.encrypted_credentials); } catch { throw new AnalyticsError("Google Analytics credentials could not be decrypted. Reconnect the property.", 503, "credential_decryption_failed"); }
  const fingerprint = createHash("sha256").update(refreshToken).digest("hex");
  if (accessTokenCache?.fingerprint === fingerprint && accessTokenCache.expiresAt > Date.now() + 30_000) return accessTokenCache.token;
  const config = analyticsOAuthConfiguration();
  const token = await exchangeToken(new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }));
  accessTokenCache = { token: token.access_token!, expiresAt: Date.now() + Math.max(60, token.expires_in || 3600) * 1000, fingerprint };
  return token.access_token!;
}

type RealtimeResponse = { rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>; dimensionHeaders?: Array<{ name?: string }>; metricHeaders?: Array<{ name?: string }> };
export type AnalyticsLocation = { city: string; country: string; activeUsers: number; lat: number; lng: number };
const CENTROIDS: Record<string, [number, number]> = { India: [20.5937, 78.9629], "United States": [37.0902, -95.7129], "United Kingdom": [55.3781, -3.4360], Germany: [51.1657, 10.4515], Singapore: [1.3521, 103.8198], Australia: [-25.2744, 133.7751], Canada: [56.1304, -106.3468], France: [46.2276, 2.2137], Japan: [36.2048, 138.2529] };
const INDIA_CENTROIDS: Record<string, [number, number]> = {
  delhi: [28.6139, 77.2090], "new delhi": [28.6139, 77.2090], mumbai: [19.0760, 72.8777], bombay: [19.0760, 72.8777], bengaluru: [12.9716, 77.5946], bangalore: [12.9716, 77.5946], hyderabad: [17.3850, 78.4867], chennai: [13.0827, 80.2707], madras: [13.0827, 80.2707], kolkata: [22.5726, 88.3639], calcutta: [22.5726, 88.3639], pune: [18.5204, 73.8567], ahmedabad: [23.0225, 72.5714], jaipur: [26.9124, 75.7873], surat: [21.1702, 72.8311], kochi: [9.9312, 76.2673], coimbatore: [11.0168, 76.9558], madurai: [9.9252, 78.1198], noida: [28.5355, 77.3910], gurgaon: [28.4595, 77.0266], gurugram: [28.4595, 77.0266], lucknow: [26.8467, 80.9462], chandigarh: [30.7333, 76.7794], indore: [22.7196, 75.8577], nagpur: [21.1458, 79.0882], visakhapatnam: [17.6868, 83.2185], bhubaneswar: [20.2961, 85.8245], patna: [25.5941, 85.1376], vadodara: [22.3072, 73.1812], thane: [19.2183, 72.9781], mysuru: [12.2958, 76.6394], mysore: [12.2958, 76.6394]
};

function locationCentroid(country: string, city: string): [number, number] {
  if (country.toLowerCase() === "india") return INDIA_CENTROIDS[city.trim().toLowerCase()] || CENTROIDS.India;
  return CENTROIDS[country] || [20, 0];
}

export async function analyticsRealtimeReport() {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) throw new AnalyticsError("GA4_PROPERTY_ID is missing.", 503, "property_not_configured");
  const accessToken = await getAccessToken();
  const realtimeUrl = `${API_URL}/properties/${encodeURIComponent(propertyId)}:runRealtimeReport`;
  const response = await fetch(realtimeUrl, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ dimensions: [{ name: "country" }, { name: "city" }, { name: "deviceCategory" }], metrics: [{ name: "activeUsers" }, { name: "eventCount" }], limit: 100 }), cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const payload = await response.json().catch(() => ({})) as RealtimeResponse & { error?: { message?: string } };
  if (!response.ok) throw new AnalyticsError(payload.error?.message || "Google Analytics realtime data is unavailable.", response.status || 502, response.status === 401 ? "unauthorized" : `google_http_${response.status}`);
  const locations = new Map<string, AnalyticsLocation>();
  let activeUsers = 0; let eventCount = 0;
  for (const row of payload.rows || []) {
    const dims = row.dimensionValues || []; const metrics = row.metricValues || [];
    const country = dims[0]?.value || "Unknown"; const city = dims[1]?.value || "Unknown"; const users = Number(metrics[0]?.value || 0); const events = Number(metrics[1]?.value || 0); const [lat, lng] = locationCentroid(country, city);
    activeUsers += users; eventCount += events;
    const key = `${city}|${country}`; const previous = locations.get(key); locations.set(key, { city, country, activeUsers: (previous?.activeUsers || 0) + users, lat, lng });
  }
  let orders = 0;
  try {
    const purchaseResponse = await fetch(realtimeUrl, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], limit: 100 }), cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const purchasePayload = await purchaseResponse.json().catch(() => ({})) as RealtimeResponse;
    for (const row of purchasePayload.rows || []) if ((row.dimensionValues?.[0]?.value || "").toLowerCase() === "purchase") orders += Number(row.metricValues?.[0]?.value || 0);
  } catch { /* The primary realtime location response remains useful if event details are unavailable. */ }
  return { propertyId, checkedAt: new Date().toISOString(), activeUsers, eventCount, orders, locations: [...locations.values()].sort((a, b) => b.activeUsers - a.activeUsers), connected: true };
}

export function clearAnalyticsAccessTokenCache() { accessTokenCache = null; }
