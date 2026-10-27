import { isSameOrigin } from "@/lib/request-origin";
import { createServiceClient } from "@/lib/supabase-service";
import {
  consumeGmailRateLimit,
  gmailApi,
  gmailHeader,
  GmailError,
  recordGmailAudit,
} from "@/lib/email/gmail";
import { buildRawEmail, parseEmailAttachments } from "@/lib/email/mime-message";
import {
  cleanHeader,
  bodyTooLarge,
  gmailErrorResponse,
  gmailJson,
  requireGmailAdmin,
  validEmailList,
} from "@/lib/email/gmail-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendInput = {
  draftId?: unknown;
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  subject?: unknown;
  body?: unknown;
  attachments?: unknown;
  threadId?: unknown;
  idempotencyKey?: unknown;
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return gmailJson({ error: "Invalid request origin." }, 403);
  if (bodyTooLarge(request)) return gmailJson({ error: "The send request exceeds the 4.3 MB limit." }, 413);
  const access = await requireGmailAdmin("email.manage");
  if (!access.ok) return access.response;

  let input: SendInput;
  try { input = await request.json(); } catch { return gmailJson({ error: "Invalid request body." }, 400); }
  const to = validEmailList(input.to);
  const cc = typeof input.cc === "string" && input.cc.trim() ? validEmailList(input.cc) : [];
  const bcc = typeof input.bcc === "string" && input.bcc.trim() ? validEmailList(input.bcc) : [];
  if (!to || !cc || !bcc) return gmailJson({ error: "One or more recipient addresses are invalid." }, 400);
  let attachments;
  try {
    attachments = parseEmailAttachments(input.attachments);
  } catch (error) {
    return gmailJson({ error: error instanceof Error ? error.message : "Invalid attachment." }, 400);
  }
  const subject = cleanHeader(input.subject, 255);
  const body = typeof input.body === "string" ? input.body : "";
  if (!subject || !body.trim()) return gmailJson({ error: "Subject and message body are required." }, 400);
  if (body.length > 100_000) return gmailJson({ error: "Message content must be 100 KB or less." }, 413);
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return gmailJson({ error: "A valid send idempotency key is required." }, 400);
  }
  const threadId = typeof input.threadId === "string" ? input.threadId : "";
  if (threadId && !/^[\w-]{1,200}$/.test(threadId)) return gmailJson({ error: "Invalid thread ID." }, 400);
  const draftId = typeof input.draftId === "string" ? input.draftId : "";
  if (draftId && !/^[\w-]{1,200}$/.test(draftId)) return gmailJson({ error: "Invalid draft ID." }, 400);

  let sendId: string;
  let service: ReturnType<typeof createServiceClient>;
  try {
    service = createServiceClient();
    await consumeGmailRateLimit(access.access.supabase, "send", 10, 60);
    const { data, error } = await service.from("studio_gmail_sends").insert({
      actor_id: access.access.user.id,
      idempotency_key: idempotencyKey,
      status: "started",
    }).select("id").single();
    if (error) {
      if (error.code === "23505") {
        return gmailJson({
          error: "This send request was already processed or is still being checked. Do not retry it with a new key until you review Sent mail.",
          code: "duplicate_or_ambiguous_send",
        }, 409);
      }
      throw new GmailError("Send idempotency storage is unavailable. Apply the Gmail workspace migration.", 503, "send_storage_unavailable");
    }
    sendId = data.id;
  } catch (error) {
    return gmailErrorResponse(error);
  }

  let response: { id: string; threadId?: string };
  try {
    if (draftId) {
      const raw = buildRawEmail({ to, cc, bcc, subject, body, attachments });
      await gmailApi(`/users/me/drafts/${encodeURIComponent(draftId)}`, {
        method: "PUT",
        body: JSON.stringify({ id: draftId, message: { raw, ...(threadId ? { threadId } : {}) } }),
      });
      response = await gmailApi<{ id: string; threadId?: string }>(
        "/users/me/drafts/send",
        { method: "POST", body: JSON.stringify({ id: draftId }) },
      );
    } else {
      let inReplyTo = "";
      let references = "";
      if (threadId) {
        const thread = await gmailApi<{
          messages?: Array<{ payload?: import("@/lib/email/gmail").GmailPart }>;
        }>(`/users/me/threads/${encodeURIComponent(threadId)}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`);
        const latest = thread.messages?.at(-1)?.payload?.headers;
        inReplyTo = gmailHeader(latest, "Message-ID");
        references = gmailHeader(latest, "References");
      }
      response = await gmailApi<{ id: string; threadId?: string }>("/users/me/messages/send", {
        method: "POST",
        body: JSON.stringify({
          raw: buildRawEmail({
            to,
            cc,
            bcc,
            subject,
            body,
            inReplyTo,
            references: [references, inReplyTo].filter(Boolean).join(" "),
            attachments,
          }),
          ...(threadId ? { threadId } : {}),
        }),
      });
    }
  } catch (error) {
    const ambiguous = !(error instanceof GmailError) || error.status >= 500;
    const status = ambiguous ? "unknown" : "failed";
    const { error: updateError } = await service.from("studio_gmail_sends").update({
      status,
      updated_at: new Date().toISOString(),
    }).eq("id", sendId);
    if (updateError) console.error("Could not update Gmail send attempt status", { sendId });
    try {
      await recordGmailAudit(access.access.supabase, {
        actorId: access.access.user.id,
        action: "send",
        outcome: ambiguous ? "unknown" : "failed",
        idempotencyKey,
        detailCode: error instanceof GmailError ? error.code : "network_error",
      });
    } catch {
      console.error("Could not record Gmail send failure audit event", { sendId });
    }
    if (ambiguous) {
      return gmailJson({
        error: "Gmail's response was inconclusive. Check Sent mail before retrying; the message may already have been delivered.",
        code: "send_outcome_unknown",
      }, 503);
    }
    return gmailErrorResponse(error);
  }

  const { error: updateError } = await service.from("studio_gmail_sends").update({
    status: "sent",
    gmail_message_id: response.id,
    updated_at: new Date().toISOString(),
  }).eq("id", sendId);
  if (updateError) {
    console.error("Gmail delivery succeeded but idempotency status update failed", { sendId });
    return gmailJson({ error: "Gmail accepted the message, but send confirmation could not be recorded. Check Sent mail before taking action.", code: "send_confirmation_unknown" }, 503);
  }
  try {
    await recordGmailAudit(access.access.supabase, {
      actorId: access.access.user.id,
      action: "send",
      outcome: "succeeded",
      messageId: response.id,
      idempotencyKey,
    });
  } catch {
    console.error("Gmail delivery succeeded but its audit event could not be recorded", { sendId });
    return gmailJson({
      error: "Gmail accepted the message, but audit logging failed. Check Sent mail before taking further action.",
      code: "send_audit_failed",
    }, 503);
  }
  return gmailJson({ ok: true, messageId: response.id, threadId: response.threadId || threadId || null });
}
