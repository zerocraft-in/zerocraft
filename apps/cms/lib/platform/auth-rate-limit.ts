import "server-only";

import { createHmac } from "node:crypto";
import { PlatformError, platformService } from "@/lib/platform/server";

type AuthRateLimitAction = "send" | "verify";

function fingerprint(value: string) {
  const secret = process.env.PLATFORM_SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new PlatformError("Platform authentication is not configured.", 503);
  return createHmac("sha256", secret).update(value).digest("hex");
}

function clientAddress(request: Request) {
  // x-real-ip is set by Vercel's trusted edge. Local development falls back to
  // the first forwarded address supplied by the local reverse proxy.
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return realIp || forwardedIp || "unknown";
}

export async function consumePlatformAuthRateLimit(
  request: Request,
  email: string,
  action: AuthRateLimitAction,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const address = clientAddress(request);
  const ipBucket = action === "send" ? "otp_ip_send" : "otp_ip_verify";
  const emailBucket = action === "send" ? "otp_email_send" : "otp_email_verify";
  const limits = action === "send"
    ? [{ bucket: emailBucket, value: normalizedEmail, limit: 5 }, { bucket: ipBucket, value: address, limit: 20 }]
    : [{ bucket: emailBucket, value: normalizedEmail, limit: 10 }, { bucket: ipBucket, value: address, limit: 60 }];

  // Fail closed: if the shared limiter is unavailable, do not allow an
  // unthrottled authentication attempt through a serverless instance.
  for (const item of limits) {
    const { data, error } = await platformService().rpc("consume_platform_auth_rate_limit", {
      p_bucket: item.bucket,
      p_identifier_hash: fingerprint(`${item.bucket}:${item.value}`),
      p_limit: item.limit,
      p_window_seconds: 15 * 60,
    });
    if (error) throw new PlatformError("Platform authentication is temporarily unavailable.", 503);
    if (data !== true) return false;
  }
  return true;
}
