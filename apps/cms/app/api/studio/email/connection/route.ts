import { createServiceClient } from "@/lib/supabase-service";
import { isSameOrigin } from "@/lib/request-origin";
import { decryptRefreshToken } from "@/lib/email/gmail-crypto";
import { clearGmailAccessTokenCache, consumeGmailRateLimit, GmailError, recordGmailAudit, revokeGmailToken } from "@/lib/email/gmail";
import { gmailErrorResponse, gmailJson, requireGmailAdmin } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireGmailAdmin("email.read");
  if (!access.ok) return access.response;
  try {
    await consumeGmailRateLimit(access.access.supabase, "list", 120, 60);
    const service = createServiceClient();
    const { data, error } = await service
      .from("studio_gmail_connections")
      .select("email_address,connected_at")
      .eq("connection_id", "workspace")
      .maybeSingle();
    if (error) throw new GmailError("Gmail connection storage is unavailable.", 503, "storage_unavailable");
    return gmailJson({ connected: Boolean(data), email: data?.email_address || null, connectedAt: data?.connected_at || null });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return gmailJson({ error: "Invalid request origin." }, 403);
  const access = await requireGmailAdmin("email.manage");
  if (!access.ok) return access.response;
  try {
    await consumeGmailRateLimit(access.access.supabase, "modify", 60, 60);
    const service = createServiceClient();
    const { data: connection, error: readError } = await service
      .from("studio_gmail_connections")
      .select("encrypted_refresh_token")
      .eq("connection_id", "workspace")
      .maybeSingle();
    if (readError) throw new GmailError("Gmail connection storage is unavailable.", 503, "storage_unavailable");
    if (!connection) return gmailJson({ disconnected: true, wasConnected: false });

    const { error: deleteError } = await service
      .from("studio_gmail_connections")
      .delete()
      .eq("connection_id", "workspace");
    if (deleteError) throw new GmailError("Gmail connection could not be removed.", 503, "storage_unavailable");
    clearGmailAccessTokenCache();

    let revocationPending = false;
    try {
      await revokeGmailToken(decryptRefreshToken(connection.encrypted_refresh_token));
    } catch (error) {
      revocationPending = true;
      console.error("Gmail local disconnect completed; Google token revocation needs attention", {
        code: error instanceof GmailError ? error.code : "revoke_failed",
      });
    }
    await recordGmailAudit(access.access.supabase, {
      actorId: access.access.user.id,
      action: "disconnect",
      outcome: revocationPending ? "unknown" : "succeeded",
      detailCode: revocationPending ? "revoke_pending" : undefined,
    });
    return gmailJson({
      disconnected: true,
      revocationPending,
      message: revocationPending
        ? "The CMS connection was removed, but Google revocation could not be confirmed. Revoke access from your Google Account security settings."
        : "Gmail was disconnected and the Google authorization was revoked.",
    });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
