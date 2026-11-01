import { consumeGmailRateLimit, gmailApi, gmailAttachmentParts, gmailHeader, gmailTextBody, GmailError, recordGmailAudit } from "@/lib/email/gmail";
import { gmailErrorResponse, gmailJson, requireGmailAdmin } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ThreadMessage = {
  id: string;
  threadId: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: import("@/lib/email/gmail").GmailPart;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const access = await requireGmailAdmin("email.read");
  if (!access.ok) return access.response;
  const { threadId } = await params;
  if (!/^[\w-]{1,200}$/.test(threadId)) return gmailJson({ error: "Invalid thread ID." }, 400);
  try {
    await consumeGmailRateLimit(access.access.supabase, "read", 120, 60);
    const thread = await gmailApi<{ id: string; messages?: ThreadMessage[] }>(
      `/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
    );
    const messages = (thread.messages || []).map((message) => {
      const headers = message.payload?.headers;
      const body = gmailTextBody(message.payload).slice(0, 100_000);
      return {
        id: message.id,
        threadId: message.threadId,
        from: gmailHeader(headers, "From"),
        to: gmailHeader(headers, "To"),
        cc: gmailHeader(headers, "Cc"),
        subject: gmailHeader(headers, "Subject"),
        date: gmailHeader(headers, "Date"),
        messageId: gmailHeader(headers, "Message-ID"),
        references: gmailHeader(headers, "References"),
        body,
        bodyType: body ? "text/plain" : "unsupported",
        unread: (message.labelIds || []).includes("UNREAD"),
        attachments: gmailAttachmentParts(message.payload).map((part) => ({
          attachmentId: part.body?.attachmentId,
          filename: (part.filename || "attachment").slice(0, 180),
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body?.size || 0,
        })),
      };
    });
    await recordGmailAudit(access.access.supabase, {
      actorId: access.access.user.id,
      action: "read",
      outcome: "succeeded",
    });
    return gmailJson({ id: thread.id, messages });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
