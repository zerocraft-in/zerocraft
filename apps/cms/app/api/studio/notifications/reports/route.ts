import { requireStudioAccess } from "@/lib/studio-auth";
import { renderNotificationReportPdf } from "@/lib/notifications/report-pdf";
import { sendTrackedEmail } from "@/lib/email/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB_NAME = "studio-weekly-notification-report";

export async function GET() {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  const [{ data: settings }, { data: runs, error }] = await Promise.all([
    access.supabase.from("studio_notification_report_settings").select("job_name,enabled,weekday,send_hour_utc,recipient_roles,updated_at").eq("job_name", JOB_NAME).maybeSingle(),
    access.supabase.from("studio_notification_report_runs").select("id,status,scheduled_for,period_start,period_end,started_at,finished_at,recipient_count,notification_count,error_message,created_at").eq("job_name", JOB_NAME).order("created_at", { ascending: false }).limit(20),
  ]);
  if (error) return Response.json({ error: "Weekly report history is unavailable." }, { status: 503 });
  return Response.json({ settings, runs: runs || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (access.role !== "admin") return Response.json({ error: "Only admins can manage weekly reports." }, { status: 403 });
  let body: { enabled?: boolean; weekday?: number; sendHourUtc?: number; recipientRoles?: string[] };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid weekly report settings." }, { status: 400 }); }
  const weekday = Number.isInteger(body.weekday) && (body.weekday as number) >= 0 && (body.weekday as number) <= 6 ? body.weekday : 1;
  const sendHourUtc = Number.isInteger(body.sendHourUtc) && (body.sendHourUtc as number) >= 0 && (body.sendHourUtc as number) <= 23 ? body.sendHourUtc : 9;
  const roles = (body.recipientRoles || ["admin"]).filter((role) => ["admin", "manager", "staff"].includes(role));
  const { data, error } = await access.supabase.from("studio_notification_report_settings").upsert({ job_name: JOB_NAME, enabled: body.enabled === true, weekday, send_hour_utc: sendHourUtc, recipient_roles: roles.length ? roles : ["admin"], updated_by: access.user.id, updated_at: new Date().toISOString() }).select("job_name,enabled,weekday,send_hour_utc,recipient_roles,updated_at").single();
  if (error) return Response.json({ error: "Weekly report settings could not be saved." }, { status: 500 });
  return Response.json({ settings: data });
}

export async function POST(request: Request) {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (access.role !== "admin") return Response.json({ error: "Only admins can send weekly reports." }, { status: 403 });
  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [{ data: rows }, { data: settings }] = await Promise.all([
    access.supabase.from("notifications").select("created_at,title,message,type,read").eq("recipient_id", access.user.id).gte("created_at", periodStart.toISOString()).lte("created_at", now.toISOString()).order("created_at", { ascending: false }).limit(500),
    access.supabase.from("studio_notification_report_settings").select("recipient_roles").eq("job_name", JOB_NAME).maybeSingle(),
  ]);
  const { data: recipients } = await access.supabase.from("profiles").select("id,email,role").in("role", settings?.recipient_roles?.length ? settings.recipient_roles : ["admin"]);
  const validRecipients = (recipients || []).filter((item): item is { id: string; email: string; role: string } => Boolean(item.email));
  const { data: run, error: runError } = await access.supabase.from("studio_notification_report_runs").insert({ job_name: JOB_NAME, status: "running", scheduled_for: now.toISOString(), period_start: periodStart.toISOString(), period_end: now.toISOString(), started_at: now.toISOString(), triggered_by: access.user.id, recipient_count: validRecipients.length, notification_count: rows?.length || 0 }).select("id").single();
  if (runError || !run) return Response.json({ error: "Could not create report run." }, { status: 500 });
  try {
    const pdf = await renderNotificationReportPdf(rows || [], "Last 7 days · Manual report");
    for (const recipient of validRecipients) {
      await sendTrackedEmail({ supabase: access.supabase, actorId: access.user.id, kind: "weekly_notification_report", message: { to: recipient.email, subject: "ZeroCraft weekly notification report", text: `Attached is the ZeroCraft notification report for ${periodStart.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}.`, html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b"><h2>ZeroCraft weekly notification report</h2><p>The last 7 days of notification activity are attached as a PDF.</p></div>`, attachments: [{ filename: "zerocraft-weekly-notifications.pdf", content: pdf, contentType: "application/pdf" }] }, metadata: { runId: run.id } });
    }
    await access.supabase.from("studio_notification_report_runs").update({ status: "succeeded", finished_at: new Date().toISOString() }).eq("id", run.id);
    return Response.json({ ok: true, runId: run.id, recipientCount: validRecipients.length, notificationCount: rows?.length || 0 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.slice(0, 500) : "Report delivery failed.";
    await access.supabase.from("studio_notification_report_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_message: message }).eq("id", run.id);
    return Response.json({ error: message, runId: run.id }, { status: 502 });
  }
}
