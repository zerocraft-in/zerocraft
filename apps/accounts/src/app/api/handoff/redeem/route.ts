import { NextResponse, type NextRequest } from "next/server";

import {
  createRateLimiter,
  verifyHandoffRequest,
  type HandoffRequestBody,
} from "@zerocraft/auth-core";

import { isHandoffConfigured } from "@/lib/auth/config";
import { redeemHandoff } from "@/lib/auth/handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 4096;
const limiter = createRateLimiter();

function json(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Server-to-server handoff redemption.
 *
 * The caller is the admin application's route handler. Requests must carry an
 * HMAC signature over the timestamp and raw body using the shared handoff
 * secret. The response contains a short-lived Supabase token hash that the
 * admin exchanges immediately; it is never placed in a browser URL.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isHandoffConfigured()) {
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const limit = limiter.check(`handoff-redeem:${clientIp(request)}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: "invalid_request" }, 413);
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  const timestamp = request.headers.get("x-zc-timestamp") ?? "";
  const signature = request.headers.get("x-zc-signature") ?? "";

  const validSignature = await verifyHandoffRequest({
    secret: process.env.AUTH_HANDOFF_SECRET ?? "",
    timestamp,
    body: rawBody,
    signature,
  });

  if (!validSignature) {
    return json({ ok: false, error: "invalid_signature" }, 401);
  }

  let parsed: HandoffRequestBody;
  try {
    const value: unknown = JSON.parse(rawBody);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return json({ ok: false, error: "invalid_request" }, 400);
    }
    parsed = value as HandoffRequestBody;
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  const result = await redeemHandoff(parsed);

  if (!result.ok) {
    const status =
      result.code === "server_error"
        ? 500
        : result.code === "not_configured"
          ? 503
          : 400;

    return json({ ok: false, error: result.code }, status);
  }

  return json(
    {
      ok: true,
      tokenHash: result.result.tokenHash,
      userId: result.result.userId,
    },
    200,
  );
}
