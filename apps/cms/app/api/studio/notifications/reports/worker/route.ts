import { renderNotificationReportPdf } from "@/lib/notifications/report-pdf";
import { sendTrackedEmail } from "@/lib/email/delivery";
import { createServiceClient } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB_NAME = "studio-weekly-notification-report";

export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.WEEKLY_REPORT_WORKER_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || provided !== expected) return Response.json({ error: "Unauthorized worker request." }, { status: 401 });
  const supabase = createServiceClient();
  const { data: queued } = await supabase.from("studio_notification_report_runs").select("id,period_start,period_end").eq("job_name", JOB_NAME).eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!queued) return Response.json({ ok: true, status: "empty" });
  const { data: claimed } = await supabase.from("studio_notification_report_runs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", queued.id).eq("status", "queued").select("id,period_start,period_end").maybeSingle();
  if (!claimed) return Response.json({ ok: true, status: "already-claimed" });
  try {
    const [{ data: settings }, { data: rows }] = await Promise.all([
      supabase.from("studio_notification_report_settings").select("recipient_roles").eq("job_name", JOB_NAME).maybeSingle(),
      supabase.from("notifications").select("created_at,title,message,type,read").gte("created_at", claimed.period_start).lte("created_at", claimed.period_end).order("created_at", { ascending: false }).limit(500),
    ]);
    const { data: recipients } = await supabase.from("profiles").select("email").in("role", settings?.recipient_roles?.length ? settings.recipient_roles : ["admin"]);
    const validRecipients = (recipients || []).filter((item): item is { email: string } => Boolean(item.email));
    const pdf = await renderNotificationReportPdf(rows || [], "Last 7 days · Scheduled report");
    for (const recipient of validRecipients) {
      await sendTrackedEmail({ supabase, actorId: null, kind: "weekly_notification_report", message: { to: recipient.email, subject: "ZeroCraft weekly notification report", text: "Attached is the scheduled ZeroCraft notification report for the last 7 days.", html: "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#18181b\"><h2>ZeroCraft weekly notification report</h2><p>The last 7 days of notification activity are attached as a PDF.</p></div>", attachments: [{ filename: "zerocraft-weekly-notifications.pdf", content: pdf, contentType: "application/pdf" }] }, metadata: { runId: claimed.id, trigger: "supabase-pg-net" } });
    }
    await supabase.from("studio_notification_report_runs").update({ status: "succeeded", finished_at: new Date().toISOString(), recipient_count: validRecipients.length, notification_count: rows?.length || 0 }).eq("id", claimed.id);
    return Response.json({ ok: true, status: "succeeded", runId: claimed.id, recipientCount: validRecipients.length });
  } catch (cause) {
    const errorMessage = cause instanceof Error ? cause.message.slice(0, 500) : "Scheduled report delivery failed.";
    await supabase.from("studio_notification_report_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: errorMessage }).eq("id", claimed.id);
    return Response.json({ error: errorMessage, runId: claimed.id }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
