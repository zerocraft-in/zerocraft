import { NextResponse, type NextRequest } from "next/server";
import { adminRoute, domainUrlForRequest, hostWithoutPort, resolveDomainHost, storeRoute } from "@/lib/domains";
import { updateSession } from "@/utils/supabase/middleware";

async function rewriteWithSession(request: NextRequest, pathname: string) {
  const sessionResponse = await updateSession(request);
  if (sessionResponse.headers.has("location")) return sessionResponse;
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = pathname;
  const response = NextResponse.rewrite(rewriteUrl);
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export async function proxy(request: NextRequest) {
  const featureEnabled = process.env.ZEROCRAFT_HOSTNAME_ROUTING_ENABLED !== "false";
  const { pathname, search } = request.nextUrl;
  const area = resolveDomainHost(request.headers.get("host"));
  const methodCanRedirect = request.method === "GET" || request.method === "HEAD";
  const hostname = hostWithoutPort(request.headers.get("host") || "");

  if (area === "unknown") {
    return new NextResponse("Unknown host", { status: 421 });
  }

  if (!featureEnabled || area === "preview") return await updateSession(request);

  if (area === "studio" && (pathname === "/" || pathname.startsWith("/studio") || pathname === "/login" || pathname.startsWith("/api/studio"))) {
    if (methodCanRedirect && (pathname.startsWith("/studio") || pathname === "/login")) {
      return NextResponse.redirect(`${domainUrlForRequest("admin", request.nextUrl, pathname, hostname)}${search}`, 308);
    }
    if (!methodCanRedirect && (pathname.startsWith("/studio") || pathname === "/login")) {
      return new NextResponse("Admin routes require the admin hostname", { status: 421 });
    }
    if (pathname.startsWith("/api/studio")) {
      return new NextResponse("This API requires the admin hostname", { status: 421 });
    }
  }

  if (area === "studio" && pathname.startsWith("/api/store")) {
    return new NextResponse("This API requires the store hostname", { status: 421 });
  }

  if (area === "studio" && (pathname === "/store" || pathname.startsWith("/store/"))) {
    if (methodCanRedirect) return NextResponse.redirect(`${domainUrlForRequest("store", request.nextUrl, pathname.replace(/^\/store/, "" ) || "/", hostname)}${search}`, 308);
    return new NextResponse("Store routes require the store hostname", { status: 421 });
  }

  if (area === "store") {
    if (pathname === "/studio" || pathname.startsWith("/studio/") || pathname === "/login") {
      if (methodCanRedirect) return NextResponse.redirect(`${domainUrlForRequest("admin", request.nextUrl, pathname, hostname)}${search}`, 308);
      return new NextResponse("Admin routes require the admin hostname", { status: 421 });
    }
    if (pathname.startsWith("/api/studio")) return new NextResponse("Admin API requires the admin hostname", { status: 421 });
    if (pathname === "/" || pathname === "/shop" || (!pathname.startsWith("/store") && !pathname.startsWith("/api/"))) {
      return rewriteWithSession(request, storeRoute(pathname));
    }
  }

  if (area === "admin") {
    if (pathname.startsWith("/store")) {
      if (methodCanRedirect) return NextResponse.redirect(`${domainUrlForRequest("store", request.nextUrl, pathname.replace(/^\/store/, "") || "/", hostname)}${search}`, 308);
      return new NextResponse("Store routes require the store hostname", { status: 421 });
    }
    if (pathname.startsWith("/api/store")) return new NextResponse("Store API requires the store hostname", { status: 421 });
    if (pathname === "/") {
      return rewriteWithSession(request, adminRoute(pathname));
    }
    if (!pathname.startsWith("/studio") && pathname !== "/login" && !pathname.startsWith("/api/")) {
      if (methodCanRedirect) return NextResponse.redirect(`${domainUrlForRequest("studio", request.nextUrl, pathname, hostname)}${search}`, 308);
      return new NextResponse("This route belongs to the studio hostname", { status: 421 });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
