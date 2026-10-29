import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { requireStudioPermission } from "@/lib/studio-auth";
import { analyticsOAuthConfiguration, exchangeAnalyticsCode, AnalyticsError } from "@/lib/analytics/client";
import { encryptAnalyticsToken, verifyAnalyticsOAuthState } from "@/lib/analytics/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function finish(request: Request, result: string) { const response = NextResponse.redirect(new URL(`/analytics/live-view?connection=${result}`, request.url)); response.cookies.set("zc_analytics_oauth", "", { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/api/studio/analytics/oauth", maxAge: 0 }); return response; }

export async function GET(request: NextRequest) {
  const access = await requireStudioPermission("settings.manage"); if (!access.ok) return finish(request, "access-denied");
  const params = new URL(request.url).searchParams; const statePayload = verifyAnalyticsOAuthState(request.cookies.get("zc_analytics_oauth")?.value || "");
  if (!statePayload || statePayload.actorId !== access.user.id || statePayload.state !== params.get("state")) return finish(request, "invalid-state");
  if (params.get("error")) return finish(request, "cancelled"); const code = params.get("code"); if (!code) return finish(request, "failed");
  try {
    const config = analyticsOAuthConfiguration(); if (new URL(request.url).origin !== new URL(config.redirectUri).origin) return finish(request, "invalid-redirect");
    const token = await exchangeAnalyticsCode(code, statePayload.verifier); if (!token.refresh_token) throw new AnalyticsError("Google did not provide an offline refresh token. Connect again and approve offline access.", 502, "refresh_token_missing");
    const service = createServiceClient(); const { error } = await service.from("studio_integrations").update({ status: "connected", enabled: true, encrypted_credentials: encryptAnalyticsToken(token.refresh_token), last_verified_at: new Date().toISOString(), last_error: null, metadata: { propertyId: process.env.GA4_PROPERTY_ID || null, connectedVia: "google_oauth", configuredAt: new Date().toISOString() }, updated_by: access.user.id, updated_at: new Date().toISOString() }).eq("provider", "ga4");
    if (error) throw new AnalyticsError("Google Analytics connection could not be stored. Apply the integration registry migration.", 503, "storage_unavailable"); return finish(request, "connected");
  } catch (error) { console.error("Google Analytics OAuth callback failed", { code: error instanceof AnalyticsError ? error.code : "oauth_failed" }); return finish(request, error instanceof AnalyticsError ? error.code : "failed"); }
}
