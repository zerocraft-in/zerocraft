import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Accounts proxy (Next.js 16 renamed middleware to Proxy).
 *
 * Refreshes the accounts-scoped Supabase session cookie. It is deliberately
 * not an authorization boundary: every page and route handler verifies the
 * user again with the Supabase server client.
 *
 * The cookie is namespaced (`zc-accounts-auth`) so local development on
 * `localhost` does not collide with the admin application's session cookie.
 */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/handoff).*)"],
};

const COOKIE_NAME = "zc-accounts-auth";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const secure = process.env.NODE_ENV === "production";

  const supabase = createServerClient(url, key, {
    cookieOptions: {
      name: COOKIE_NAME,
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
          });
        });
      },
    },
  });

  // Calling getUser refreshes an expiring token and writes the new cookie
  // through setAll above.
  await supabase.auth.getUser();

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}
