import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireStudioAccess } from "@/lib/studio-api";

function encrypt(value: unknown) {
  const rawKey = (process.env.STUDIO_OAUTH_ENCRYPTION_KEY || process.env.STUDIO_CREDENTIALS_ENCRYPTION_KEY || process.env.PLATFORM_ENCRYPTION_KEY)?.trim();
  if (!rawKey) throw new Error("STUDIO_OAUTH_ENCRYPTION_KEY is not configured on the Studio server.");
  const key = rawKey.length === 64 && /^[0-9a-f]+$/i.test(rawKey) ? Buffer.from(rawKey, "hex") : createHash("sha256").update(rawKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export async function GET(request: Request) {
  const result = await requireStudioAccess("integrations.manage");
  if ("response" in result) return result.response;
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const expectedState = (await cookies()).get("studio_oauth_state")?.value || "";
  const provider = state.split(".")[0] || "";
  const code = url.searchParams.get("code");
  const redirect = new URL("/studio/settings/integrations", url.origin);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    redirect.searchParams.set("oauth", "provider_error");
    redirect.searchParams.set("reason", oauthError.slice(0, 80));
    return NextResponse.redirect(redirect);
  }
  if (!provider || !code || !expectedState || state !== expectedState) { redirect.searchParams.set("oauth", "invalid_state"); return NextResponse.redirect(redirect); }
  const isMeta = provider === "instagram";
  const isCloudflare = provider === "cloudflare_r2";
  const clientId = (isCloudflare ? process.env.CLOUDFLARE_OAUTH_CLIENT_ID : isMeta ? process.env.META_OAUTH_CLIENT_ID : process.env.GOOGLE_OAUTH_CLIENT_ID)?.trim();
  const clientSecret = (isCloudflare ? process.env.CLOUDFLARE_OAUTH_CLIENT_SECRET : isMeta ? process.env.META_OAUTH_CLIENT_SECRET : process.env.GOOGLE_OAUTH_CLIENT_SECRET)?.trim();
  if (!clientId || !clientSecret) { redirect.searchParams.set("oauth", "missing_config"); return NextResponse.redirect(redirect); }
  const redirectUri = (isCloudflare ? process.env.CLOUDFLARE_OAUTH_REDIRECT_URL : process.env.STUDIO_OAUTH_REDIRECT_URL)?.trim() || `${url.origin}/api/studio/integrations/callback`;
  const tokenResponse = await fetch(isCloudflare ? "https://dash.cloudflare.com/oauth2/token" : isMeta ? "https://graph.facebook.com/v21.0/oauth/access_token" : "https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
  const tokens = await tokenResponse.json().catch(() => null) as Record<string, unknown> | null;
  if (!tokenResponse.ok || !tokens?.access_token) { redirect.searchParams.set("oauth", "exchange_failed"); return NextResponse.redirect(redirect); }
  const { error } = await result.supabase.rpc("save_oauth_integration", {
    p_provider: provider,
    p_credentials: encrypt(tokens),
    p_metadata: { oauth_provider: isCloudflare ? "cloudflare" : isMeta ? "meta" : "google", connected_at: new Date().toISOString(), management_only: isCloudflare },
  });
  redirect.searchParams.set("oauth", error ? "save_failed" : "connected");
  const response = NextResponse.redirect(redirect);
  response.cookies.delete("studio_oauth_state");
  return response;
}
