import { isSameOrigin } from "@/lib/request-origin";
import { consumeGmailRateLimit, gmailApi, GmailError, recordGmailAudit } from "@/lib/email/gmail";
import { gmailErrorResponse, gmailJson, requireGmailAdmin } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID = /^[\w-]{1,200}$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  if (!isSameOrigin(request)) return gmailJson({ error: "Invalid request origin." }, 403);
  const access = await requireGmailAdmin("email.manage");
  if (!access.ok) return access.response;
  const { threadId } = await params;
  if (!ID.test(threadId)) return gmailJson({ error: "Invalid thread ID." }, 400);
  let body: { action?: unknown; labelId?: unknown };
  try {
    await consumeGmailRateLimit(access.access.supabase, "modify", 60, 60);
    body = await request.json();
  } catch {
    return gmailJson({ error: "Invalid request body." }, 400);
  }
  const action = body.action;
  if (typeof action !== "string") return gmailJson({ error: "Choose an email action." }, 400);

  try {
    if (action === "trash") {
      await gmailApi(`/users/me/threads/${encodeURIComponent(threadId)}/trash`, { method: "POST" });
    } else {
      const addLabelIds: string[] = [];
      const removeLabelIds: string[] = [];
      if (action === "unread") addLabelIds.push("UNREAD");
      if (action === "read") removeLabelIds.push("UNREAD");
      if (action === "star") addLabelIds.push("STARRED");
      if (action === "unstar") removeLabelIds.push("STARRED");
      if (action === "archive") removeLabelIds.push("INBOX");
      if (action === "apply-label" || action === "remove-label") {
        if (typeof body.labelId !== "string" || !/^[\w-]{1,200}$/.test(body.labelId)) {
          return gmailJson({ error: "Invalid label." }, 400);
        }
        (action === "apply-label" ? addLabelIds : removeLabelIds).push(body.labelId);
      }
      if (!addLabelIds.length && !removeLabelIds.length) return gmailJson({ error: "Unsupported email action." }, 400);
      await gmailApi(`/users/me/threads/${encodeURIComponent(threadId)}/modify`, {
        method: "POST",
        body: JSON.stringify({ addLabelIds, removeLabelIds }),
      });
    }
    await recordGmailAudit(access.access.supabase, {
      actorId: access.access.user.id,
      action: "modify",
      outcome: "succeeded",
      messageId: threadId,
    });
    return gmailJson({ ok: true });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
