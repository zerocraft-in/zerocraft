import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/request-origin";
import { consumePlatformAuthRateLimit } from "@/lib/platform/auth-rate-limit";
import { PLATFORM_SESSION_COOKIE_OPTIONS } from "@/lib/platform/session-cookies";
import { logSecurityEvent } from "@/lib/security-logging";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    void logSecurityEvent({ event: "auth.otp.invalid_origin", request, status: 403 });
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: NO_STORE });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2048) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 413, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers: NO_STORE });
  }

  const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers: NO_STORE });
  }

  try {
    if (!(await consumePlatformAuthRateLimit(request, email, "send"))) {
      void logSecurityEvent({ event: "auth.otp.rate_limited", request, status: 429, metadata: { operation: "send" } });
      return NextResponse.json({ error: "Too many sign-in requests. Wait 15 minutes and try again." }, {
        status: 429,
        headers: { ...NO_STORE, "Retry-After": "900" },
      });
    }
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please retry shortly." }, { status: 503, headers: NO_STORE });
  }

  const url = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    void logSecurityEvent({ event: "auth.otp.misconfigured", request, status: 503 });
    return NextResponse.json({ error: "Platform authentication is not configured." }, { status: 503, headers: NO_STORE });
  }

  const cookieCarrier = NextResponse.next();
  const platform = createServerClient(url, key, {
    cookieOptions: PLATFORM_SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        values.forEach(({ name, value, options }) => cookieCarrier.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await platform.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    void logSecurityEvent({ event: "auth.otp.provider_failed", request, status: 503 });
    // Avoid exposing Auth provider details or account state to unauthenticated callers.
    return NextResponse.json({ error: "We could not send a sign-in code. Please retry shortly." }, { status: 503, headers: NO_STORE });
  }

  const response = NextResponse.json({ sent: true }, { headers: NO_STORE });
  void logSecurityEvent({ event: "auth.otp.sent", request, status: 200 });
  cookieCarrier.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
