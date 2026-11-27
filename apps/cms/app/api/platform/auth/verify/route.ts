import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSafeReturnPath } from "@/lib/domains";
import { isSameOrigin } from "@/lib/request-origin";
import { consumePlatformAuthRateLimit } from "@/lib/platform/auth-rate-limit";
import { PLATFORM_SESSION_COOKIE_OPTIONS } from "@/lib/platform/session-cookies";
import { logSecurityEvent } from "@/lib/security-logging";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    void logSecurityEvent({ event: "auth.otp.verify_invalid_origin", request, status: 403 });
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: NO_STORE });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2048) {
    return NextResponse.json({ error: "Enter the email code to continue." }, { status: 413, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the email code to continue." }, { status: 400, headers: NO_STORE });
  }

  const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const token = typeof values.token === "string" ? values.token.trim() : "";
  const next = isSafeReturnPath(typeof values.next === "string" ? values.next : null, "/stores");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers: NO_STORE });
  }
  if (!/^\d{6,12}$/.test(token)) {
    return NextResponse.json({ error: "Enter the code from your email." }, { status: 400, headers: NO_STORE });
  }

  try {
    if (!(await consumePlatformAuthRateLimit(request, email, "verify"))) {
      void logSecurityEvent({ event: "auth.otp.verify_rate_limited", request, status: 429, metadata: { operation: "verify" } });
      return NextResponse.json({ error: "Too many code attempts. Request a new code and wait 15 minutes." }, {
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

  // New users may receive a signup confirmation OTP; existing users receive
  // the regular email OTP. Both are numeric codes from the OTP email template.
  let verification = await platform.auth.verifyOtp({ email, token, type: "email" });
  if (verification.error) {
    verification = await platform.auth.verifyOtp({ email, token, type: "signup" });
  }
  const { data, error } = verification;
  if (error || !data.session) {
    void logSecurityEvent({ event: "auth.otp.verify_failed", request, status: 400 });
    const response = NextResponse.json(
      { error: "That code was not accepted. Use the newest email code, or request a new one and try again." },
      { status: 400, headers: NO_STORE },
    );
    cookieCarrier.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  const response = NextResponse.json({ next }, { headers: NO_STORE });
  void logSecurityEvent({ event: "auth.otp.verified", request, status: 200, userId: data.user?.id });
  cookieCarrier.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
