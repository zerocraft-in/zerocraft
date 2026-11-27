import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@zerocraft/supabase/config";
import { isSafeReturnPath } from "@/lib/domains";
import { PLATFORM_SESSION_COOKIE_OPTIONS } from "@/lib/platform/session-cookies";

const SECRET_PROTECTED_WORKERS = new Set(["/api/admin/notifications/reports/worker", "/api/admin/system-health/worker", "/api/admin/team/expiry"]);

const PUBLIC_PATHS = new Set(["/login", "/auth/callback", "/api/health"]);
// These admin roots remain protected by the default-deny policy below:
// /store, /media, /settings, /api/store, and /api/admin.
const LEGACY_STORE_SECTIONS = new Set([
  "products", "orders", "customers", "categories", "inventory", "content",
  "media", "analytics", "settings", "bin",
]);

async function sessionFor(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabasePublicConfig(request.headers.get("host") || "");
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}

async function sessionForPlatform(request: NextRequest, url: string, key: string) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookieOptions: PLATFORM_SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Vercel terminates TLS, so reject any non-TLS forwarded request in production.
  // Local HTTP development remains supported.
  const forwardedProtocol = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
  if (process.env.NODE_ENV === "production" && forwardedProtocol !== "https") {
    const secureUrl = request.nextUrl.clone();
    secureUrl.protocol = "https:";
    return NextResponse.redirect(secureUrl, 308);
  }
  // OTP send and verification must be reachable before a session exists. Each route
  // validates same-origin requests; verification creates a session only after Supabase accepts the code.
  if (pathname === "/api/platform/auth/verify" && request.method === "POST") {
    return NextResponse.next({ request });
  }
  if (pathname === "/api/platform/auth/otp" && request.method === "POST") {
    return NextResponse.next({ request });
  }
  // Store onboarding and tenant pages use the central platform session.
  const isPlatformPage = pathname === "/" || pathname === "/stores" || pathname.startsWith("/stores/") || pathname === "/accounts" || pathname.startsWith("/accounts/") || pathname === "/store" || pathname.startsWith("/store/") || pathname === "/point-of-sales" || pathname.startsWith("/point-of-sales/") || pathname === "/api/platform" || pathname.startsWith("/api/platform/");
  if (isPlatformPage) {
    let response = NextResponse.next({ request });
    const url = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      const platform = createServerClient(url, key, { cookieOptions: PLATFORM_SESSION_COOKIE_OPTIONS, cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      }});
      const { data: { user } } = await platform.auth.getUser();
      if (!user) {
        if (pathname.startsWith("/api/")) {
          return copyCookies(response, NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } }));
        }
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = new URLSearchParams({ next: `${pathname}${request.nextUrl.search}` }).toString();
        return copyCookies(response, NextResponse.redirect(loginUrl, 307));
      }
      if (pathname === "/" || pathname === "/store") {
        const { data: store } = await platform
          .from("stores")
          .select("slug")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        const destination = request.nextUrl.clone();
        destination.pathname = store?.slug ? `/store/${store.slug}` : "/stores";
        destination.search = "";
        return copyCookies(response, NextResponse.redirect(destination, 307));
      }
      if (pathname === "/point-of-sales") {
        const { data: store } = await platform
          .from("stores")
          .select("slug")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        const destination = request.nextUrl.clone();
        destination.pathname = store?.slug ? `/store/${store.slug}/point-of-sales` : "/stores";
        destination.search = "";
        return copyCookies(response, NextResponse.redirect(destination, 307));
      }
      if (pathname.startsWith("/store/")) {
        const [, , section, ...rest] = pathname.split("/");
        if (LEGACY_STORE_SECTIONS.has(section)) {
          const { data: stores, error } = await platform
            .from("stores")
            .select("slug")
            .order("created_at", { ascending: true });
          if (error) {
            return NextResponse.json({ error: "Your stores could not be loaded." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
          }
          const matchingSlug = stores?.some((store) => store.slug === section);
          if (!matchingSlug) {
            if (stores?.length !== 1) {
              const storesUrl = request.nextUrl.clone();
              storesUrl.pathname = "/stores";
              storesUrl.search = "";
              return copyCookies(response, NextResponse.redirect(storesUrl, 307));
            }
            const destination = request.nextUrl.clone();
            destination.pathname = `/store/${stores[0].slug}/${[section, ...rest].join("/")}`;
            return copyCookies(response, NextResponse.redirect(destination, 307));
          }
        }
      }
    } else {
      return NextResponse.json({ error: "Platform authentication is not configured." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (pathname === "/login") {
    const url = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      const { response, user } = await sessionForPlatform(request, url, key);
      if (user) {
        const next = isSafeReturnPath(request.nextUrl.searchParams.get("next"), "/");
        const destination = new URL(next, request.url);
        return copyCookies(response, NextResponse.redirect(destination, 307));
      }
    }
  }
  // Worker handlers authenticate their server-only bearer secret before using a service client.
  if (SECRET_PROTECTED_WORKERS.has(pathname)) return NextResponse.next({ request });
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next({ request });

  const { response, user } = await sessionFor(request);
  if (user) return response;

  // Tenant admin APIs also serve the platform-scoped store UI. If the legacy
  // tenant cookie is absent, let the route perform its membership check using
  // the central platform session instead of converting that valid session to
  // a misleading 401 here.
  const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL;
  const platformKey = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_PUBLISHABLE_KEY;
  if (platformUrl && platformKey) {
    const platform = await sessionForPlatform(request, platformUrl, platformKey);
    if (platform.user) return copyCookies(platform.response, response);
  }

  if (pathname.startsWith("/api/")) {
    return copyCookies(response, NextResponse.json({ error: "Authentication required." }, { status: 401 }));
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = new URLSearchParams({ next: `${pathname}${request.nextUrl.search}` }).toString();
  return copyCookies(response, NextResponse.redirect(loginUrl, 307));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
