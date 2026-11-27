import { NextResponse, type NextRequest } from "next/server";

import {
  classifySupabaseAuthError,
  resolvePostAuthDestination,
} from "@zerocraft/auth-core";

import {
  getAdminOrigin,
  getOriginConfig,
  isHandoffConfigured,
  isSupabaseConfigured,
} from "@/lib/auth/config";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function loginErrorUrl(
  request: NextRequest,
  code: "expired_link" | "invalid_link" | "not_configured",
  next: string | null,
): URL {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);

  if (next) {
    const destination = resolvePostAuthDestination(next, getOriginConfig(), "/");
    if (destination.type === "admin") {
      url.searchParams.set("next", `${getAdminOrigin()}${destination.path}`);
    } else if (destination.type === "accounts" && destination.path !== "/") {
      url.searchParams.set("next", destination.path);
    }
  }

  return url;
}

/**
 * Central accounts callback.
 *
 * Handles both the PKCE `code` flow (email links and OAuth) and a
 * `token_hash` OTP link. The session is always established server-side; no
 * access or refresh token is ever put in a URL.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return noStore(
      NextResponse.redirect(
        loginErrorUrl(request, "not_configured", request.nextUrl.searchParams.get("next")),
      ),
    );
  }

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const otpType = params.get("type");
  const next = params.get("next");

  const { supabase, applyCookies } = createRouteSupabaseClient(request);

  let failureCode: "expired_link" | "invalid_link" = "invalid_link";

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const classified = classifySupabaseAuthError(error);
        failureCode = classified === "expired_link" ? "expired_link" : "invalid_link";
      }
    } else if (
      tokenHash &&
      (otpType === "magiclink" ||
        otpType === "email" ||
        otpType === "signup" ||
        otpType === "recovery" ||
        otpType === "email_change")
    ) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (error) {
        const classified = classifySupabaseAuthError(error);
        failureCode = classified === "expired_link" ? "expired_link" : "invalid_link";
      }
    } else {
      return noStore(
        NextResponse.redirect(loginErrorUrl(request, "invalid_link", next)),
      );
    }
  } catch (error) {
    console.error("Auth callback exchange failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return noStore(
      NextResponse.redirect(loginErrorUrl(request, "invalid_link", next)),
    );
  }

  // A failure is detected by the absence of a verified session, not only by
  // the provider response, so treat both the same way.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return noStore(
      NextResponse.redirect(loginErrorUrl(request, failureCode, next)),
    );
  }

  const destination = resolvePostAuthDestination(next, getOriginConfig(), "/");

  let target: URL;
  if (destination.type === "admin") {
    // The admin application has its own cookie scope. Continue through the
    // PKCE-bound handoff rather than assuming the accounts cookie is visible.
    target = new URL("/auth/start", getAdminOrigin());
    target.searchParams.set("returnTo", destination.path);
  } else if (destination.type === "accounts") {
    target = new URL(destination.path, request.url);
  } else if (isHandoffConfigured()) {
    target = new URL("/auth/start", getAdminOrigin());
    target.searchParams.set("returnTo", "/dashboard");
  } else {
    target = new URL("/", request.url);
  }

  if (destination.type === "admin" && !isHandoffConfigured()) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", next ?? "");
    url.searchParams.set("error", "handoff_failed");
    return noStore(NextResponse.redirect(url));
  }

  return noStore(applyCookies(NextResponse.redirect(target)));
}
