import { NextResponse, type NextRequest } from "next/server";

import { getAccountsOrigin } from "@/lib/auth/config";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function signOutAndRedirect(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, applyCookies } = createRouteSupabaseClient(request);

    try {
      await supabase.auth.signOut();
    } catch {
      // Clearing local cookies below is still required even if the provider
      // call fails; otherwise the browser keeps a stale session.
    }

    const target = new URL("/login", getAccountsOrigin());
    target.searchParams.set("logged_out", "1");

    const response = applyCookies(NextResponse.redirect(target, { status: 303 }));
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch {
    // Supabase not configured: still redirect to login so the user can sign
    // in fresh. No session to clear.
    const target = new URL("/login", getAccountsOrigin());
    target.searchParams.set("logged_out", "1");

    const response = NextResponse.redirect(target, { status: 303 });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return signOutAndRedirect(request);
}

/**
 * Direct link support. Signing out is idempotent and only affects the current
 * browser session, so a top-level GET is safe here.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return signOutAndRedirect(request);
}
