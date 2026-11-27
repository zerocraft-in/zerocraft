import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@zerocraft/auth-core";

import { getAccountsOrigin, isHandoffConfigured, isSupabaseConfigured } from "@/lib/auth/config";
import { authorizeHandoff } from "@/lib/auth/handoff";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function failure(request: NextRequest, error: string): NextResponse {
  const url = new URL("/login", getAccountsOrigin());
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  void request;
  return response;
}

/**
 * Accounts side of the cross-subdomain handoff.
 *
 * The admin application redirects here with a PKCE challenge and an opaque
 * state. This route requires a real accounts session, then issues a
 * short-lived single-use code bound to that challenge. Only the code and
 * state travel in the redirect URL — never a token.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured() || !isHandoffConfigured()) {
    return failure(request, "handoff_failed");
  }

  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const returnTo = safeRedirectPath(params.get("returnTo"), "/dashboard");

  if (!returnTo.startsWith("/") || returnTo.startsWith("/auth/")) {
    return failure(request, "handoff_failed");
  }

  const { supabase } = createRouteSupabaseClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Send the user through central login, then straight back to this route
    // with the original handoff parameters intact.
    const handoffPath = new URL("/handoff", getAccountsOrigin());
    handoffPath.searchParams.set("state", state);
    handoffPath.searchParams.set("code_challenge", codeChallenge);
    handoffPath.searchParams.set("returnTo", returnTo);

    const login = new URL("/login", getAccountsOrigin());
    login.searchParams.set(
      "next",
      `${handoffPath.pathname}${handoffPath.search}`,
    );

    const response = NextResponse.redirect(login);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  const result = await authorizeHandoff({
    state,
    codeChallenge,
    returnTo,
  });

  if (!result.ok) {
    if (result.code === "unauthenticated") {
      return failure(request, "invalid_link");
    }
    return failure(request, "handoff_failed");
  }

  const response = NextResponse.redirect(result.redirectUrl);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
