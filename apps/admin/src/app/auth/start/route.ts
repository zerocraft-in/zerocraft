import { NextResponse, type NextRequest } from "next/server";

import {
  createPkcePair,
  generateRandomToken,
  safeRedirectPath,
} from "@zerocraft/auth-core";

import {
  getAccountsOrigin,
  getAdminOrigin,
  getHandoffSecret,
  HANDOFF_RETURN_COOKIE,
  HANDOFF_STATE_COOKIE,
  HANDOFF_VERIFIER_COOKIE,
  handoffCookieOptions,
} from "@/lib/auth/accounts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizedReturnTo(value: string | null): string {
  const path = safeRedirectPath(value, "/dashboard");
  if (path.startsWith("/auth/")) return "/dashboard";
  return path;
}

function failure(): NextResponse {
  const response = NextResponse.redirect(
    new URL("/login?error=handoff_failed", getAdminOrigin()),
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

/**
 * Begins the admin side of the cross-subdomain handoff.
 *
 * A PKCE verifier and opaque state are stored in short-lived HttpOnly cookies
 * scoped to /auth. The browser is sent to the accounts application with only
 * the challenge and state.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const returnTo = normalizedReturnTo(request.nextUrl.searchParams.get("returnTo"));

  const secret = getHandoffSecret();
  if (!secret) {
    console.error("AUTH_HANDOFF_SECRET is not configured.");
    return failure();
  }

  // If this browser already has an admin session, skip the round trip.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const response = NextResponse.redirect(new URL(returnTo, getAdminOrigin()));
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }

  const { verifier, challenge } = await createPkcePair();
  const state = generateRandomToken(32);

  const handoff = new URL("/handoff", getAccountsOrigin());
  handoff.searchParams.set("state", state);
  handoff.searchParams.set("code_challenge", challenge);
  handoff.searchParams.set("returnTo", returnTo);

  const response = NextResponse.redirect(handoff);
  response.headers.set("Cache-Control", "no-store, max-age=0");

  const options = handoffCookieOptions();
  response.cookies.set(HANDOFF_STATE_COOKIE, state, options);
  response.cookies.set(HANDOFF_VERIFIER_COOKIE, verifier, options);
  response.cookies.set(HANDOFF_RETURN_COOKIE, returnTo, options);

  return response;
}
