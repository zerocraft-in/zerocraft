import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCommercePermission } from "@/lib/commerce-auth";
import { createSearchConsoleOAuthState, randomSearchConsoleOAuthValue } from "@/lib/search-console/crypto";
import { searchConsoleOAuthConfiguration } from "@/lib/search-console/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await requireCommercePermission("settings.manage");
  if (!access.ok) return access.response;
  try {
    const config = searchConsoleOAuthConfiguration();
    const state = randomSearchConsoleOAuthValue();
    const verifier = randomSearchConsoleOAuthValue(48);
    const payload = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: "https://www.googleapis.com/auth/webmasters.readonly", access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" });
    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${payload}`);
    response.cookies.set("zc_search_console_oauth", createSearchConsoleOAuthState({ state, verifier, actorId: access.user.id, expiresAt: Date.now() + 10 * 60 * 1000 }), { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/api/admin/search-console/oauth", maxAge: 600 });
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Search Console OAuth is unavailable." }, { status: 503 });
  }
}
