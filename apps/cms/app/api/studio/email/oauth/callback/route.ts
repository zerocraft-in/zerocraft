import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { requireGmailAdmin, gmailErrorResponse } from "@/lib/email/gmail-route";
import { encryptRefreshToken, verifyOAuthStateCookie } from "@/lib/email/gmail-crypto";
import {
  exchangeAuthorizationCode,
  getGmailEmail,
  gmailOAuthConfiguration,
  clearGmailAccessTokenCache,
  revokeGmailToken,
  recordGmailAudit,
} from "@/lib/email/gmail";
import { GmailError } from "@/lib/email/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function finish(request: Request, result: string) {
  const response = NextResponse.redirect(new URL(`/studio/email?connection=${result}`, request.url));
  response.cookies.set("zc_gmail_oauth", "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/api/studio/email/oauth",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const access = await requireGmailAdmin("email.manage");
  if (!access.ok) return finish(request, "access-denied");
  const cookie = request.cookies.get("zc_gmail_oauth")?.value;
  if (!cookie) return finish(request, "invalid-state");
  const statePayload = verifyOAuthStateCookie(cookie);
  if (!statePayload || statePayload.actorId !== access.access.user.id || statePayload.state !== params.get("state")) {
    return finish(request, "invalid-state");
  }
  if (params.get("error")) return finish(request, "cancelled");
  const code = params.get("code");
  if (!code) return finish(request, "failed");
  try {
    const config = gmailOAuthConfiguration();
    if (new URL(request.url).origin !== new URL(config.redirectUri).origin) {
      return finish(request, "invalid-redirect");
    }
    const token = await exchangeAuthorizationCode(code, statePayload.verifier);
    if (!token.access_token || !token.refresh_token) {
      throw new GmailError("Google did not provide an offline refresh token. Reconnect and approve offline access.", 502, "refresh_token_missing");
    }
    const emailAddress = await getGmailEmail(token.access_token);
    const service = createServiceClient();
    const { data: currentConnection, error: currentError } = await service
      .from("studio_gmail_connections")
      .select("email_address")
      .eq("connection_id", "workspace")
      .maybeSingle();
    if (currentError) throw new GmailError("Gmail connection storage is unavailable.", 503, "storage_unavailable");
    if (currentConnection && currentConnection.email_address.toLowerCase() !== emailAddress.toLowerCase()) {
      try {
        await revokeGmailToken(token.refresh_token);
      } catch {
        console.error("Could not revoke a rejected Gmail account-switch authorization");
      }
      await recordGmailAudit(access.access.supabase, {
        actorId: access.access.user.id,
        action: "connect",
        outcome: "failed",
        detailCode: "account_switch_requires_disconnect",
      });
      return finish(request, "account-switch-blocked");
    }
    const { error } = await service.from("studio_gmail_connections").upsert({
      connection_id: "workspace",
      email_address: emailAddress,
      encrypted_refresh_token: encryptRefreshToken(token.refresh_token),
      connected_by: access.access.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "connection_id" });
    if (error) throw new GmailError("Gmail connection could not be stored. Apply the Gmail workspace migration.", 503, "storage_unavailable");
    clearGmailAccessTokenCache();
    await recordGmailAudit(access.access.supabase, {
      actorId: access.access.user.id,
      action: "connect",
      outcome: "succeeded",
    });
    return finish(request, "connected");
  } catch (error) {
    const codeName = error instanceof GmailError
      ? error.code
      : error instanceof Error ? error.name : "oauth_failed";
    try {
      await recordGmailAudit(access.access.supabase, {
        actorId: access.access.user.id,
        action: "connect",
        outcome: "failed",
        detailCode: codeName,
      });
    } catch {
      console.error("Could not write Gmail OAuth failure audit event", { code: codeName });
    }
    if (!(error instanceof GmailError)) return gmailErrorResponse(error);
    return finish(request, "failed");
  }
}
