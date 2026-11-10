import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireStudioAccess } from "@/lib/studio-api";

const googleScopes: Record<string, string> = {
  google_workspace: "openid email profile",
  gmail: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
  ga4: "openid email profile https://www.googleapis.com/auth/analytics.readonly",
  search_console: "openid email profile https://www.googleapis.com/auth/webmasters.readonly",
  google_business: "openid email profile https://www.googleapis.com/auth/business.manage",
};

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const result = await requireStudioAccess("integrations.manage");
  if ("response" in result) return result.response;
  const { provider } = await context.params;
  const isCloudflare = provider === "cloudflare_r2";
  if (isCloudflare && !process.env.CLOUDFLARE_OAUTH_CLIENT_ID) {
    return NextResponse.json({ configured: Boolean(process.env.CLOUDFLARE_R2_ACCOUNT_ID && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY), message: "Cloudflare OAuth is not configured on the Studio server." }, { status: 503 });
  }
  const isMeta = provider === "instagram";
  // Cloudflare OAuth scopes are attached to the registered client; its OIDC
  // authorization endpoint accepts the standard identity/offline scopes.
  const scope = isCloudflare ? "workers-r2.write" : isMeta ? "instagram_basic,instagram_content_publish,pages_show_list" : googleScopes[provider];
  if (!scope) return NextResponse.json({ error: "This integration is not available yet." }, { status: 404 });
  const clientId = (isCloudflare ? process.env.CLOUDFLARE_OAUTH_CLIENT_ID : isMeta ? process.env.META_OAUTH_CLIENT_ID : process.env.GOOGLE_OAUTH_CLIENT_ID)?.trim();
  if (!clientId) return NextResponse.json({ error: `${isMeta ? "Meta" : "Google"} OAuth is not configured on the Studio server.` }, { status: 503 });
  const url = new URL(request.url);
  const redirectUri = (isCloudflare ? process.env.CLOUDFLARE_OAUTH_REDIRECT_URL : process.env.STUDIO_OAUTH_REDIRECT_URL)?.trim() || `${url.origin}/api/studio/integrations/callback`;
  const authUrl = new URL(isCloudflare ? "https://dash.cloudflare.com/oauth2/auth" : isMeta ? "https://www.facebook.com/v21.0/dialog/oauth" : "https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  if (!isCloudflare) {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
  }
  const state = `${provider}.${randomUUID()}`;
  authUrl.searchParams.set("state", state);
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("studio_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
