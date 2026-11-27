import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

type PendingCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

/**
 * Route-handler Supabase client.
 *
 * Mirrors the application's normal server client (same cookie name) but
 * captures cookie writes so they can be attached to a redirect response.
 */
export function createRouteSupabaseClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase authentication is not configured");
  }

  const pending: PendingCookie[] = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => pending.push(cookie));
      },
    },
  });

  function applyCookies(response: NextResponse): NextResponse {
    pending.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  return { supabase, applyCookies, pending };
}
