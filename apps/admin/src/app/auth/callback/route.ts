import { NextResponse, type NextRequest } from "next/server";

import {
  isValidPkceVerifier,
  safeRedirectPath,
  signHandoffRequest,
  timingSafeEqualBase64Url,
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
import { createRouteSupabaseClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clearHandoffCookies(response: NextResponse): NextResponse {
  const expired = { ...handoffCookieOptions(0), maxAge: 0 };
  response.cookies.set(HANDOFF_STATE_COOKIE, "", expired);
  response.cookies.set(HANDOFF_VERIFIER_COOKIE, "", expired);
  response.cookies.set(HANDOFF_RETURN_COOKIE, "", expired);
  return response;
}

function failure(): NextResponse {
  const response = NextResponse.redirect(
    new URL("/login?error=handoff_failed", getAdminOrigin()),
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return clearHandoffCookies(response);
}

type RedeemResponse =
  | { ok: true; tokenHash: string; userId: string }
  | { ok: false; error?: string };

function isRedeemResponse(value: unknown): value is RedeemResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.ok === true) {
    return (
      typeof candidate.tokenHash === "string" &&
      candidate.tokenHash.length > 0 &&
      typeof candidate.userId === "string"
    );
  }
  return candidate.ok === false;
}

/**
 * Completes the admin side of the cross-subdomain handoff.
 *
 * The one-time code is redeemed server-to-server with an HMAC-signed request
 * bound to the PKCE verifier. The returned Supabase token hash is exchanged
 * immediately on the server; no token is ever placed in a URL or exposed to
 * the browser.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const state = request.nextUrl.searchParams.get("state") ?? "";

  const expectedState = request.cookies.get(HANDOFF_STATE_COOKIE)?.value ?? "";
  const verifier = request.cookies.get(HANDOFF_VERIFIER_COOKIE)?.value ?? "";
  const returnTo = safeRedirectPath(
    request.cookies.get(HANDOFF_RETURN_COOKIE)?.value,
    "/dashboard",
  );

  const secret = getHandoffSecret();

  if (
    !secret ||
    !code ||
    !state ||
    !expectedState ||
    !verifier ||
    !isValidPkceVerifier(verifier) ||
    !timingSafeEqualBase64Url(state, expectedState) ||
    returnTo.startsWith("/auth/")
  ) {
    return failure();
  }

  const body = JSON.stringify({
    code,
    verifier,
    targetOrigin: getAdminOrigin(),
  });
  const timestamp = Date.now().toString();
  const signature = await signHandoffRequest(secret, timestamp, body);

  let tokenHash: string | null = null;

  try {
    const response = await fetch(
      new URL("/api/handoff/redeem", getAccountsOrigin()),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ZC-Timestamp": timestamp,
          "X-ZC-Signature": signature,
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRedeemResponse(payload) || !payload.ok) {
      console.error("Handoff redemption was rejected.", {
        status: response.status,
        error: isRedeemResponse(payload) && !payload.ok ? payload.error : "invalid_response",
      });
      return failure();
    }

    tokenHash = payload.tokenHash;
  } catch (error) {
    console.error("Handoff redemption request failed.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return failure();
  }

  if (!tokenHash) return failure();

  const { supabase, applyCookies } = createRouteSupabaseClient(request);

  try {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (error) {
      console.error("Admin OTP verification failed.", {
        code: error.code,
        status: error.status,
      });
      return failure();
    }
  } catch (error) {
    console.error("Admin OTP verification threw.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return failure();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return failure();

  const target = new URL(returnTo, getAdminOrigin());
  const response = applyCookies(
    NextResponse.redirect(target, { status: 303 }),
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return clearHandoffCookies(response);
}
