import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { requireStudioPermission } from "@/lib/studio-auth";
import { encryptSearchConsoleToken, verifySearchConsoleOAuthState } from "@/lib/search-console/crypto";
import { exchangeSearchConsoleCode, listSearchConsoleSites, searchConsoleOAuthConfiguration, SearchConsoleError } from "@/lib/search-console/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function finish(request: Request, result: string) {
  const response = NextResponse.redirect(new URL(`/search-console?connection=${result}`, request.url));
  response.cookies.set("zc_search_console_oauth", "", { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/api/studio/search-console/oauth", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return finish(request, "access-denied");
  const params = new URL(request.url).searchParams;
  const statePayload = verifySearchConsoleOAuthState(request.cookies.get("zc_search_console_oauth")?.value || "");
  if (!statePayload || statePayload.actorId !== access.user.id || statePayload.state !== params.get("state")) return finish(request, "invalid-state");
  if (params.get("error")) return finish(request, "cancelled");
  const code = params.get("code");
  if (!code) return finish(request, "failed");
  try {
    const config = searchConsoleOAuthConfiguration();
    if (new URL(request.url).origin !== new URL(config.redirectUri).origin) return finish(request, "invalid-redirect");
    const token = await exchangeSearchConsoleCode(code, statePayload.verifier);
    if (!token.refresh_token) throw new SearchConsoleError("Google did not provide an offline refresh token. Connect again and approve offline access.", 502, "refresh_token_missing");
    const configuredSite = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim().replace(/\/$/, "");
    if (!configuredSite) throw new SearchConsoleError("GOOGLE_SEARCH_CONSOLE_SITE_URL is missing.", 503, "site_not_configured");
    const sites = await listSearchConsoleSites(token.access_token!);
    const matched = sites.find((site) => site.siteUrl?.replace(/\/$/, "") === configuredSite);
    if (!matched) throw new SearchConsoleError(`The connected Google account cannot access ${configuredSite}.`, 403, "site_not_accessible");
    const service = createServiceClient();
    const { error } = await service.from("studio_integrations").update({ status: "connected", enabled: true, encrypted_credentials: encryptSearchConsoleToken(token.refresh_token), last_verified_at: new Date().toISOString(), last_error: null, metadata: { siteUrl: matched.siteUrl, permissionLevel: matched.permissionLevel || "unknown", connectedVia: "google_oauth", configuredAt: new Date().toISOString() }, updated_by: access.user.id, updated_at: new Date().toISOString() }).eq("provider", "search_console");
    if (error) throw new SearchConsoleError("Search Console connection could not be stored. Apply the integration registry migration.", 503, "storage_unavailable");
    return finish(request, "connected");
  } catch (error) {
    console.error("Search Console OAuth callback failed", { code: error instanceof SearchConsoleError ? error.code : "oauth_failed" });
    return finish(request, error instanceof SearchConsoleError ? error.code : "failed");
  }
}
