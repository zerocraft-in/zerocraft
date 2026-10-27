import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { consumeGmailRateLimit, gmailOAuthConfiguration } from "@/lib/email/gmail";
import { createOAuthStateCookie, randomOAuthValue } from "@/lib/email/gmail-crypto";
import { gmailErrorResponse, requireGmailAdmin } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await requireGmailAdmin("email.manage");
  if (!access.ok) return access.response;
  try {
    await consumeGmailRateLimit(access.access.supabase, "connect", 5, 3600);
    const config = gmailOAuthConfiguration();
    const state = randomOAuthValue();
    const verifier = randomOAuthValue(48);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const payload = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.modify",
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${payload}`);
    response.cookies.set("zc_gmail_oauth", createOAuthStateCookie({
      state,
      verifier,
      actorId: access.access.user.id,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }), {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/api/studio/email/oauth",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
