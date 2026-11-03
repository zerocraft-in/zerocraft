import "server-only";

import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { platformService } from "@/lib/platform/server";

type SecurityEvent = {
  event: string;
  request?: Request | NextRequest;
  status?: number;
  userId?: string | null;
  route?: string;
  metadata?: Record<string, unknown>;
};

function digest(value: string) {
  const secret = process.env.PLATFORM_ENCRYPTION_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update(value).digest("hex");
}

function requestContext(request?: Request | NextRequest) {
  if (!request) return { route: undefined, ipHash: null, userAgent: null };
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip") || "unknown";
  return {
    route: new URL(request.url).pathname.slice(0, 500),
    ipHash: digest(ip),
    userAgent: (headers.get("user-agent") || "unknown").slice(0, 512),
  };
}

/** Best-effort, redacted security telemetry. Logging must never break a request. */
export async function logSecurityEvent(event: SecurityEvent) {
  try {
    const context = requestContext(event.request);
    const result = await platformService().from("security_events").insert({
      event_type: event.event.slice(0, 100),
      route: event.route || context.route || null,
      method: event.request?.method || null,
      status_code: event.status || null,
      actor_id: event.userId || null,
      ip_hash: context.ipHash,
      user_agent: context.userAgent,
      metadata: event.metadata || {},
    });
    if (result.error) throw result.error;
  } catch (error) {
    // Do not include request headers, cookies, tokens, or payloads in fallback logs.
    console.warn("Security telemetry write failed", {
      event: event.event,
      route: event.route || (event.request ? new URL(event.request.url).pathname : undefined),
      status: event.status,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
