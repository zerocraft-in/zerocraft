import "server-only";

import type { createClient } from "@zerocraft/supabase/server";
import { automationFailureEmail } from "./templates";
import { sendTrackedEmail } from "./delivery";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AutomationFailureRun = {
  id: string;
  job_name: string;
  trigger: string;
  started_at: string;
  error_message: string | null;
};

export async function notifyAutomationFailure(input: {
  supabase: SupabaseServerClient;
  actorId: string;
  run: AutomationFailureRun;
}) {
  const { supabase, actorId, run } = input;
  const { data: settings } = await supabase
    .from("automation_settings")
    .select("enabled,email_alerts_enabled,recipient_roles,cooldown_minutes")
    .eq("job_name", run.job_name)
    .maybeSingle();
  if (settings && (!settings.enabled || !settings.email_alerts_enabled)) return { sent: 0, recipients: 0 };
  const roles = settings?.recipient_roles?.length ? settings.recipient_roles : ["admin", "manager"];
  const { data: recipients, error: recipientsError } = await supabase
    .from("accounts")
    .select("id,email")
    .in("role", roles)
    .not("email", "is", null);

  if (recipientsError) throw recipientsError;
  const recipientIds = (recipients || []).map((recipient) => recipient.id);
  const { data: preferences } = recipientIds.length
    ? await supabase.from("notification_preferences").select("user_id,automation_failure_enabled").in("user_id", recipientIds)
    : { data: [] as { user_id: string; automation_failure_enabled: boolean }[] };
  const preferenceByUser = new Map((preferences || []).map((preference) => [preference.user_id, preference.automation_failure_enabled]));

  let sent = 0;
  for (const recipient of recipients || []) {
    const email = recipient.email?.trim().toLowerCase();
    if (!email) continue;
    if (preferenceByUser.get(recipient.id) === false) continue;

    const notification = {
      title: `Automation failed: ${run.job_name}`,
      message: `${run.trigger} run failed. ${run.error_message || "Open Automation Health for details."}`.slice(0, 500),
      category: "system",
      type: "error",
      read: false,
      link: "/system/automations",
      recipient_id: recipient.id,
      dedupe_key: `automation-failure:${run.id}:${recipient.id}`,
      metadata: { automationRunId: run.id, jobName: run.job_name, trigger: run.trigger },
    };
    const { data: existingNotification } = await supabase
      .from("notifications")
      .select("id")
      .eq("dedupe_key", notification.dedupe_key)
      .maybeSingle();
    if (existingNotification) {
      await supabase.from("notifications").update(notification).eq("id", existingNotification.id);
    } else {
      await supabase.from("notifications").insert(notification);
    }

    if (settings?.cooldown_minutes) {
      const cooldownStart = new Date(Date.now() - settings.cooldown_minutes * 60_000).toISOString();
      const { data: recentSent } = await supabase
        .from("automation_failure_notifications")
        .select("id")
        .eq("recipient_id", recipient.id)
        .eq("status", "sent")
        .gte("created_at", cooldownStart)
        .limit(1)
        .maybeSingle();
      if (recentSent) continue;
    }

    const { data: claim, error: claimError } = await supabase
      .from("automation_failure_notifications")
      .insert({ run_id: run.id, recipient_id: recipient.id, recipient: email, status: "sending" })
      .select("id")
      .maybeSingle();

    let claimId = claim?.id;
    if (claimError) {
      const { data: existingClaim } = await supabase
        .from("automation_failure_notifications")
        .select("id,status")
        .eq("run_id", run.id)
        .eq("recipient_id", recipient.id)
        .maybeSingle();
      if (!existingClaim || existingClaim.status === "sent" || existingClaim.status === "sending") continue;
      const { data: retriedClaim } = await supabase
        .from("automation_failure_notifications")
        .update({ status: "sending", last_error: null })
        .eq("id", existingClaim.id)
        .select("id")
        .maybeSingle();
      claimId = retriedClaim?.id;
    }
    if (!claimId) continue;

    try {
      await sendTrackedEmail({
        supabase,
        actorId,
        kind: "automation.failure",
        message: automationFailureEmail({
          recipient: email,
          jobName: run.job_name,
          trigger: run.trigger,
          startedAt: run.started_at,
          errorMessage: run.error_message || "Unknown automation failure",
        }),
        metadata: { automationRunId: run.id, recipientId: recipient.id },
      });
      await supabase.from("automation_failure_notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", claimId);
      sent += 1;
    } catch (error) {
      await supabase.from("automation_failure_notifications").update({ status: "failed", last_error: error instanceof Error ? error.message.slice(0, 500) : "SMTP delivery failed" }).eq("id", claimId);
    }
  }

  return { sent, recipients: recipients?.length || 0 };
}
