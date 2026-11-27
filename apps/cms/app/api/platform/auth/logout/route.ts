import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequestStoreConfig } from "@zerocraft/supabase/store-server";
import { isSameOrigin } from "@/lib/request-origin";
import { PLATFORM_SESSION_COOKIE_OPTIONS } from "@/lib/platform/session-cookies";

const NO_STORE = { "Cache-Control": "private, no-store" };
type CookieChange = { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] };

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: NO_STORE });
  }

  const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL;
  const platformKey = process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_PUBLISHABLE_KEY;
  if (!platformUrl || !platformKey) {
    return NextResponse.json({ error: "Platform authentication is not configured." }, { status: 503, headers: NO_STORE });
  }

  const cookieChanges: CookieChange[] = [];
  const cookieOptions = {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values: CookieChange[]) {
        cookieChanges.push(...values);
      },
    },
  };

  const platform = createServerClient(platformUrl, platformKey, { ...cookieOptions, cookieOptions: PLATFORM_SESSION_COOKIE_OPTIONS });
  let platformError: string | undefined;
  try {
    const result = await platform.auth.signOut({ scope: "local" });
    platformError = result.error?.message;
  } catch (error) {
    platformError = error instanceof Error ? error.message : "Platform sign out failed.";
  }

  try {
    const tenant = await getRequestStoreConfig();
    if (!tenant.url || !tenant.key) throw new Error("Store authentication is not configured.");
    const store = createServerClient(tenant.url, tenant.key, cookieOptions);
    const result = await store.auth.signOut({ scope: "local" });
    if (result.error) throw result.error;
  } catch (error) {
    console.error("Store session sign out failed", error);
  }

  const response = platformError
    ? NextResponse.json({ error: "The platform session could not be cleared. Please try again." }, { status: 503, headers: NO_STORE })
    : NextResponse.json({ signedOut: true }, { headers: NO_STORE });
  for (const { name, value, options } of cookieChanges) response.cookies.set(name, value, options);
  return response;
}
