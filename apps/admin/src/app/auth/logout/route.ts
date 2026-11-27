import { NextResponse, type NextRequest } from "next/server";

import { getAccountsOrigin } from "@/lib/auth/accounts";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function signOut(request: NextRequest): Promise<NextResponse> {
  const { supabase, applyCookies } = createRouteSupabaseClient(request);

  try {
    await supabase.auth.signOut();
  } catch {
    // Continue to central logout even if the provider call fails.
  }

  // Central logout: clearing the accounts session prevents a "signed out"
  // admin from being silently signed back in on the next handoff.
  const target = new URL("/logout", getAccountsOrigin());
  const response = applyCookies(NextResponse.redirect(target, { status: 303 }));
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return signOut(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return signOut(request);
}
