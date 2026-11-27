import { sendTrackedEmail } from "@/lib/email/delivery";
import { createServiceClient } from "@/lib/supabase-service";
import { evaluateSystemHealthSla } from "@/lib/system-health-sla";
import { renderWeeklyReliabilityReportPdf } from "@/lib/system-health-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB_NAME = "studio-weekly-notification-report";

export async function POST(request: Request) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const validSecrets = [process.env.CRON_SECRET, process.env.WEEKLY_REPORT_WORKER_SECRET].filter(
    (value): value is string => Boolean(value),
  );
  if (!provided || !validSecrets.includes(provided)) return Response.json({ error: "Unauthorized worker request." }, { status: 401 });
  const supabase = await createServiceClient();
  const { data: queued } = await supabase.from("report_runs").select("id,period_start,period_end").eq("job_name", JOB_NAME).eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!queued) return Response.json({ ok: true, status: "empty" });
  const { data: claimed } = await supabase.from("report_runs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", queued.id).eq("status", "queued").select("id,period_start,period_end").maybeSingle();
  if (!claimed) return Response.json({ ok: true, status: "already-claimed" });
  try {
    const [{ data: settings }, { data: rows }, { data: healthRuns }, { data: healthIncidents }] = await Promise.all([
      supabase.from("report_settings").select("recipient_roles").eq("job_name", JOB_NAME).maybeSingle(),
      supabase.from("notifications").select("created_at,title,message,type,read").gte("created_at", claimed.period_start).lte("created_at", claimed.period_end).order("created_at", { ascending: false }).limit(500),
      supabase.from("health_checks").select("overall,created_at").gte("created_at", claimed.period_start).lte("created_at", claimed.period_end).order("created_at", { ascending: false }).limit(500),
      supabase.from("health_incidents").select("status,severity,component,last_seen_at,latest_message").gte("created_at", claimed.period_start).lte("created_at", claimed.period_end).order("last_seen_at", { ascending: false }).limit(200),
    ]);
    const { data: recipients } = await supabase.from("accounts").select("email").in("role", settings?.recipient_roles?.length ? settings.recipient_roles : ["admin"]);
    const validRecipients = (recipients || []).filter((item): item is { email: string } => Boolean(item.email));
    const sla = await evaluateSystemHealthSla({ supabase, notify: true });
    const pdf = await renderWeeklyReliabilityReportPdf({ notifications: rows || [], runs: healthRuns || [], incidents: healthIncidents || [], sla });
    for (const recipient of validRecipients) {
      await sendTrackedEmail({ supabase, actorId: null, kind: "weekly_reliability_report", message: { to: recipient.email, subject: "ZeroCraft weekly reliability report", text: "Attached is the scheduled ZeroCraft weekly notification and reliability report.", html: "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#18181b\"><h2>ZeroCraft weekly reliability report</h2><p>Attached are the last 7 days of notification activity, health history, SLA metrics, and incident status.</p></div>", attachments: [{ filename: "zerocraft-weekly-reliability.pdf", content: pdf, contentType: "application/pdf" }] }, metadata: { runId: claimed.id, trigger: "supabase-pg-net", report: "reliability" } });
    }
    await supabase.from("report_runs").update({ status: "succeeded", finished_at: new Date().toISOString(), recipient_count: validRecipients.length, notification_count: rows?.length || 0 }).eq("id", claimed.id);
    return Response.json({ ok: true, status: "succeeded", runId: claimed.id, recipientCount: validRecipients.length });
  } catch (cause) {
    const errorMessage = cause instanceof Error ? cause.message.slice(0, 500) : "Scheduled report delivery failed.";
    console.error("Scheduled report delivery failed", cause);
    await supabase.from("report_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: errorMessage }).eq("id", claimed.id);
    return Response.json({ error: "Scheduled report delivery failed.", runId: claimed.id }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
