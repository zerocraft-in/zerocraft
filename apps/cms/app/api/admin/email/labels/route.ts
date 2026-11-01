import { consumeGmailRateLimit, gmailApi, recordGmailAudit } from "@/lib/email/gmail";
import { gmailErrorResponse, gmailJson, requireGmailAdmin } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireGmailAdmin("email.read");
  if (!access.ok) return access.response;
  try {
    await consumeGmailRateLimit(access.access.supabase, "list", 120, 60);
    const result = await gmailApi<{ labels?: Array<{ id: string; name: string; type: string }> }>("/users/me/labels");
    await recordGmailAudit(access.access.supabase, { actorId: access.access.user.id, action: "list", outcome: "succeeded" });
    return gmailJson({
      labels: (result.labels || []).map(({ id, name, type }) => ({ id, name: name.slice(0, 100), type })),
    });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
