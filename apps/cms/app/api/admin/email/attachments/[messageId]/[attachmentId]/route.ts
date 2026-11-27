import { consumeGmailRateLimit, gmailApi, gmailAttachmentParts, GmailError, recordGmailAudit } from "@/lib/email/gmail";
import { gmailErrorResponse, requireGmailAdmin } from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
]);

type MessagePayload = { id: string; payload?: import("@/lib/email/gmail").GmailPart };

function safeFilename(value: string) {
  const name = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f"]/g, "_").trim().slice(0, 150);
  return name || "attachment";
}

function bytesFromBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function contentMatchesMime(bytes: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/gif") return /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString("ascii"));
  if (mimeType === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return !bytes.includes(0);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> },
) {
  const access = await requireGmailAdmin("email.read");
  if (!access.ok) return access.response;
  const { messageId, attachmentId } = await params;
  if (!/^[\w-]{1,200}$/.test(messageId) || !/^[\w-]{1,500}$/.test(attachmentId)) {
    return Response.json({ error: "Invalid attachment reference." }, { status: 400 });
  }
  try {
    await consumeGmailRateLimit(access.access.supabase, "attachment", 30, 60);
    const message = await gmailApi<MessagePayload>(
      `/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    );
    const part = gmailAttachmentParts(message.payload).find((item) => item.body?.attachmentId === attachmentId);
    if (!part || !part.filename || (part.body?.size || 0) > MAX_ATTACHMENT_BYTES) {
      throw new GmailError("This attachment is missing or exceeds the 10 MB download limit.", 413, "attachment_too_large");
    }
    const mimeType = (part.mimeType || "application/octet-stream").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(mimeType)) {
      throw new GmailError("This attachment type is not allowed for download.", 415, "attachment_type_blocked");
    }
    const response = await gmailApi<{ data?: string; size?: number }>(
      `/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    );
    const bytes = bytesFromBase64Url(response.data || "");
    if (bytes.length > MAX_ATTACHMENT_BYTES || (response.size != null && bytes.length !== response.size)) {
      throw new GmailError("The attachment failed its content-size check.", 413, "attachment_size_invalid");
    }
    if (!contentMatchesMime(bytes, mimeType)) {
      throw new GmailError("The attachment content does not match its declared file type.", 415, "attachment_content_invalid");
    }
    await recordGmailAudit(access.access.supabase, {
      actorId: access.access.user.id,
      action: "attachment",
      outcome: "succeeded",
      messageId,
    });
    const filename = safeFilename(part.filename);
    return new Response(bytes, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return gmailErrorResponse(error);
  }
}
