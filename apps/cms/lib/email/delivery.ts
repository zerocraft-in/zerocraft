import "server-only";

import type { createClient } from "@zerocraft/supabase/server";
import { sendEmail, type EmailMessage } from "./smtp";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function sendTrackedEmail(input: {
  supabase: SupabaseServerClient;
  actorId: string | null;
  kind: string;
  message: EmailMessage;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, actorId, kind, message, metadata = {} } = input;
  const { data: event } = await supabase.from("email_events").insert({
    provider: "smtp",
    kind,
    recipient: message.to,
    subject: message.subject,
    status: "queued",
    attempts: 0,
    metadata,
    is_test: metadata.test === true,
    created_by: actorId,
  }).select("id").maybeSingle();
  const eventId = event?.id;
  if (eventId) await supabase.from("email_events").update({ status: "sending", attempts: 1, updated_at: new Date().toISOString() }).eq("id", eventId);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (eventId) await supabase.from("email_events").update({ status: "sending", attempts: attempt, updated_at: new Date().toISOString() }).eq("id", eventId);
    try {
      const result = await sendEmail(message);
      if (eventId) await supabase.from("email_events").update({ status: "sent", message_id: result.messageId, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", eventId);
      return { ...result, eventId };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  const errorMessage = lastError instanceof Error ? lastError.message.slice(0, 500) : "SMTP delivery failed";
  if (eventId) await supabase.from("email_events").update({ status: "failed", last_error: errorMessage, next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", eventId);
  throw lastError instanceof Error ? lastError : new Error(errorMessage);
}
