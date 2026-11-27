import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCommercePermission } from "@/lib/commerce-auth";
import { analyticsOAuthConfiguration } from "@/lib/analytics/client";
import { createAnalyticsOAuthState, randomAnalyticsOAuthValue } from "@/lib/analytics/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await requireCommercePermission("settings.manage");
  if (!access.ok) return access.response;
  try {
    const config = analyticsOAuthConfiguration(); const state = randomAnalyticsOAuthValue(); const verifier = randomAnalyticsOAuthValue(48);
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: "https://www.googleapis.com/auth/analytics.readonly", access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" });
    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    response.cookies.set("zc_analytics_oauth", createAnalyticsOAuthState({ state, verifier, actorId: access.user.id, expiresAt: Date.now() + 10 * 60 * 1000 }), { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/api/admin/analytics/oauth", maxAge: 600 });
    return response;
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Google Analytics OAuth is unavailable." }, { status: 503 }); }
}
