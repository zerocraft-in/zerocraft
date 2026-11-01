import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/request-origin";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers: NO_STORE });
  }

  const values = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const email = typeof values.email === "string" ? values.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers: NO_STORE });
  }

  const url = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Platform authentication is not configured." }, { status: 503, headers: NO_STORE });
  }

  const cookieCarrier = NextResponse.next();
  const platform = createServerClient(url, key, {
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
    return NextResponse.json({ error: error.message }, { status: 400, headers: NO_STORE });
  }

  const response = NextResponse.json({ sent: true }, { headers: NO_STORE });
  cookieCarrier.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
