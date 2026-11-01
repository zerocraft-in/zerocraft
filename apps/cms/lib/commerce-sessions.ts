import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";

export const COMMERCE_SESSION_COOKIE = "zc_commerce_session";
export const COMMERCE_SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export type CommerceSessionRow = {
  id: string;
  user_id: string;
  device_label: string;
  device_type: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  operating_system: string;
  user_agent: string;
  ip_address: string | null;
  first_seen_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

function cookieValue(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COMMERCE_SESSION_COOKIE}=([^;]+)`));
  return match?.[1] || null;
}

function validSessionId(value: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function parseUserAgent(userAgent: string) {
  const browser = userAgent.includes("Edg/") ? "Microsoft Edge" : userAgent.includes("Chrome/") ? "Chrome" : userAgent.includes("Firefox/") ? "Firefox" : userAgent.includes("Safari/") ? "Safari" : "Unknown browser";
  const operatingSystem = userAgent.includes("Windows") ? "Windows" : userAgent.includes("Mac OS X") ? "macOS" : userAgent.includes("Android") ? "Android" : userAgent.includes("iPhone") || userAgent.includes("iPad") ? "iOS" : userAgent.includes("Linux") ? "Linux" : "Unknown OS";
  const deviceType = userAgent.includes("iPad") || userAgent.includes("Tablet") ? "tablet" : userAgent.includes("Mobile") || userAgent.includes("iPhone") || userAgent.includes("Android") ? "mobile" : userAgent ? "desktop" : "unknown";
  return { browser, operatingSystem, deviceType, deviceLabel: `${browser} on ${operatingSystem}` } as const;
}

export function requestDeviceMetadata(request: Request) {
  const userAgent = request.headers.get("user-agent") || "";
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  return { userAgent, ipAddress: forwardedFor, ...parseUserAgent(userAgent) };
}

export function sessionCookieId(request: Request) {
  const existing = cookieValue(request);
  return validSessionId(existing) ? existing! : randomUUID();
}

export function setCommerceSessionCookie(response: Response, id: string, secure: boolean) {
  response.headers.append("Set-Cookie", `${COMMERCE_SESSION_COOKIE}=${id}; Path=/; Max-Age=${COMMERCE_SESSION_MAX_AGE}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  return response;
}

export function clearCommerceSessionCookie(response: Response, secure: boolean) {
  response.headers.append("Set-Cookie", `${COMMERCE_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  return response;
}

export async function studioSessionIsRevoked(userId: string) {
  const id = (await cookies()).get(COMMERCE_SESSION_COOKIE)?.value ?? null;
  if (!validSessionId(id)) return false;
  try {
    const service = await createServiceClient();
    const { data, error } = await service.from("staff_sessions").select("revoked_at").eq("id", id).eq("user_id", userId).maybeSingle();
    // Keep authentication available during a rolling migration if the table
    // has not reached a particular environment yet.
    if (error || !data) return false;
    return Boolean(data.revoked_at);
  } catch {
    return false;
  }
}
