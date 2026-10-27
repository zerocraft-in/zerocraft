import { isSameOrigin } from "@/lib/request-origin";
import { consumeGmailRateLimit, gmailApi, gmailAttachmentParts, gmailTextBody, recordGmailAudit } from "@/lib/email/gmail";
import { gmailErrorResponse, gmailJson, requireGmailAdmin } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DraftData = {
  id: string;
  message?: {
    id: string;
    threadId?: string;
    internalDate?: string;
    payload?: import("@/lib/email/gmail").GmailPart;
  };
};

function decodeHeader(value: string) {
  return value.replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_match, encoded: string) => {
    try { return Buffer.from(encoded, "base64").toString("utf8"); } catch { return ""; }
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const access = await requireGmailAdmin("email.read");
  if (!access.ok) return access.response;
  const { draftId } = await params;
  if (!/^[\w-]{1,200}$/.test(draftId)) return gmailJson({ error: "Invalid draft ID." }, 400);
  try {
    await consumeGmailRateLimit(access.access.supabase, "read", 120, 60);
    const draft = await gmailApi<DraftData>(`/users/me/drafts/${encodeURIComponent(draftId)}?format=full`);
    const message = draft.message;
    const headers = message?.payload?.headers;
    const header = (name: string) => decodeHeader(headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "");
    return gmailJson({
      id: draft.id,
      messageId: message?.id || "",
      threadId: message?.threadId || "",
      to: header("To"),
      cc: header("Cc"),
      bcc: header("Bcc"),
      subject: header("Subject"),
      body: gmailTextBody(message?.payload).slice(0, 100_000),
      attachments: gmailAttachmentParts(message?.payload).map((part) => ({
        attachmentId: part.body?.attachmentId || "",
        filename: (part.filename || "attachment").slice(0, 150),
        mimeType: part.mimeType || "application/octet-stream",
        size: part.body?.size || 0,
        messageId: message?.id || "",
      })),
    });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  if (!isSameOrigin(request)) return gmailJson({ error: "Invalid request origin." }, 403);
  const access = await requireGmailAdmin("email.manage");
  if (!access.ok) return access.response;
  const { draftId } = await params;
  if (!/^[\w-]{1,200}$/.test(draftId)) return gmailJson({ error: "Invalid draft ID." }, 400);
  try {
    await consumeGmailRateLimit(access.access.supabase, "draft", 30, 60);
    await gmailApi(`/users/me/drafts/${encodeURIComponent(draftId)}`, { method: "DELETE" });
    await recordGmailAudit(access.access.supabase, { actorId: access.access.user.id, action: "draft", outcome: "succeeded" });
    return gmailJson({ ok: true });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
