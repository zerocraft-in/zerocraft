import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { requireSupabaseEnv } from "@/lib/supabase/server";

export type PendingCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function secureCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Route-handler Supabase client.
 *
 * Auth cookies are captured and applied explicitly to the final response so
 * redirects and JSON responses both persist the session correctly.
 */
export function createRouteSupabaseClient(request: NextRequest) {
  const { url, key } = requireSupabaseEnv();
  const pending: PendingCookie[] = [];

  const supabase = createServerClient(url, key, {
    cookieOptions: {
      name: "zc-accounts-auth",
      ...secureCookieOptions(),
    },
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
      response.cookies.set(name, value, {
        ...options,
        ...secureCookieOptions(),
      });
    });
    return response;
  }

  return { supabase, applyCookies, pending };
}
