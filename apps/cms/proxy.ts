import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@zerocraft/supabase/config";

const PUBLIC_PATHS = new Set([
  "/login",
  "/auth/callback",
  "/api/health",
  // Vercel Cron authenticates this endpoint with its bearer secret at the route level.
  "/api/studio/notifications/reports/worker",
]);

async function sessionFor(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabasePublicConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, user };
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

/**
 * The CMS is mounted at the domain root. Keep the former `/studio` URLs as
 * permanent compatibility redirects so links from the public site and old
 * bookmarks continue to land on the canonical CMS route.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLegacyStudioRoute =
    pathname === "/studio" || pathname.startsWith("/studio/");

  if (isLegacyStudioRoute) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/studio(?=\/|$)/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  // Public endpoints must remain reachable even when the authentication
  // provider is degraded. This also makes the readiness probe meaningful.
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next({ request });

  const { response, user } = await sessionFor(request);
  if (user) return response;

  if (pathname.startsWith("/api/")) {
    const denied = NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
    return copyCookies(response, denied);
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = new URLSearchParams({
    next: `${pathname}${request.nextUrl.search}`,
  }).toString();
  return copyCookies(response, NextResponse.redirect(loginUrl, 307));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
