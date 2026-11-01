import { isSameOrigin } from "@/lib/request-origin";
import { consumeGmailRateLimit, gmailAccessToken, gmailApi, gmailRequest, gmailTextBody, gmailAttachmentParts, GmailError, recordGmailAudit } from "@/lib/email/gmail";
import { buildRawEmail, parseEmailAttachments } from "@/lib/email/mime-message";
import { bodyTooLarge, cleanHeader, gmailErrorResponse, gmailJson, requireGmailAdmin, validEmailList } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DraftRecord = {
  id: string;
  message?: {
    id: string;
    threadId?: string;
    snippet?: string;
    internalDate?: string;
    payload?: import("@/lib/email/gmail").GmailPart;
  };
};
type DraftList = { drafts?: DraftRecord[]; nextPageToken?: string };

function decodeHeader(value: string) {
  return value.replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_match, encoded: string) => {
    try { return Buffer.from(encoded, "base64").toString("utf8"); } catch { return ""; }
  });
}

export async function GET(request: Request) {
  const access = await requireGmailAdmin("email.read");
  if (!access.ok) return access.response;
  try {
    await consumeGmailRateLimit(access.access.supabase, "list", 120, 60);
    const url = new URL(request.url);
    const pageToken = url.searchParams.get("pageToken");
    if (pageToken && pageToken.length > 2048) throw new GmailError("Invalid page token.", 400, "invalid_page_token");
    const query = new URLSearchParams({ maxResults: "20" });
    if (pageToken) query.set("pageToken", pageToken);
    const token = await gmailAccessToken();
    const page = await gmailRequest<DraftList>(token, `/users/me/drafts?${query}`);
    const drafts = await Promise.all((page.drafts || []).map(async (draft) => {
      const detail = await gmailRequest<DraftRecord>(token, `/users/me/drafts/${encodeURIComponent(draft.id)}?format=full`);
      const message = detail.message || draft.message;
      const headers = message?.payload?.headers;
      const header = (name: string) => decodeHeader(headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || "");
      return {
        id: detail.id || draft.id,
        messageId: message?.id || "",
        threadId: message?.threadId || "",
        to: header("To"),
        cc: header("Cc"),
        bcc: header("Bcc"),
        subject: header("Subject"),
        body: gmailTextBody(message?.payload).slice(0, 100_000),
        date: message?.internalDate || "",
        attachments: gmailAttachmentParts(message?.payload).map((part) => ({
          attachmentId: part.body?.attachmentId || "",
          filename: part.filename || "attachment",
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body?.size || 0,
          messageId: message?.id || "",
        })),
      };
    }));
    await recordGmailAudit(access.access.supabase, { actorId: access.access.user.id, action: "list", outcome: "succeeded" });
    return gmailJson({ drafts, nextPageToken: page.nextPageToken || null });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return gmailJson({ error: "Invalid request origin." }, 403);
  if (bodyTooLarge(request)) return gmailJson({ error: "The draft request exceeds the 4.3 MB limit." }, 413);
  const access = await requireGmailAdmin("email.manage");
  if (!access.ok) return access.response;
  let body: { draftId?: unknown; threadId?: unknown; to?: unknown; cc?: unknown; bcc?: unknown; subject?: unknown; body?: unknown; attachments?: unknown };
  try { body = await request.json(); } catch { return gmailJson({ error: "Invalid request body." }, 400); }
  const draftId = typeof body.draftId === "string" ? body.draftId : "";
  if (draftId && !/^[\w-]{1,200}$/.test(draftId)) return gmailJson({ error: "Invalid draft ID." }, 400);
  const threadId = typeof body.threadId === "string" ? body.threadId : "";
  if (threadId && !/^[\w-]{1,200}$/.test(threadId)) return gmailJson({ error: "Invalid thread ID." }, 400);
  const to = typeof body.to === "string" && body.to.trim() ? validEmailList(body.to) : [];
  const cc = typeof body.cc === "string" && body.cc.trim() ? validEmailList(body.cc) : [];
  const bcc = typeof body.bcc === "string" && body.bcc.trim() ? validEmailList(body.bcc) : [];
  if (to === null || cc === null || bcc === null) return gmailJson({ error: "One or more recipient addresses are invalid." }, 400);
  const subject = cleanHeader(body.subject, 255);
  const text = typeof body.body === "string" ? body.body : "";
  if (text.length > 100_000) return gmailJson({ error: "Draft content must be 100 KB or less." }, 413);
  try {
    await consumeGmailRateLimit(access.access.supabase, "draft", 30, 60);
    let attachments;
    try {
      attachments = parseEmailAttachments(body.attachments);
    } catch (error) {
      return gmailJson({ error: error instanceof Error ? error.message : "Invalid attachment." }, 400);
    }
    const raw = buildRawEmail({
      to,
      cc,
      bcc,
      subject,
      body: text,
      attachments,
    });
    const path = draftId ? `/users/me/drafts/${encodeURIComponent(draftId)}` : "/users/me/drafts";
    const saved = await gmailApi<{ id: string; message?: { id?: string } }>(path, {
      method: draftId ? "PUT" : "POST",
      body: JSON.stringify({ id: draftId || undefined, message: { raw, ...(threadId ? { threadId } : {}) } }),
    });
    await recordGmailAudit(access.access.supabase, {
      actorId: access.access.user.id,
      action: "draft",
      outcome: "succeeded",
      messageId: saved.message?.id,
    });
    return gmailJson({ id: saved.id, messageId: saved.message?.id || null });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
