import { requireCommercePermission } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";
import { sendTrackedEmail } from "@/lib/email/delivery";
import { createServiceClient } from "@/lib/supabase-service";
import { evaluateSystemHealthSla } from "@/lib/system-health-sla";
import { renderWeeklyReliabilityReportPdf } from "@/lib/system-health-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status = 400) { return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } }); }

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("Invalid request origin.", 403);
  const access = await requireCommercePermission("notifications.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return fail("Only administrators can retry weekly reports.", 403);
  let body: { eventId?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid delivery retry request."); }
  if (typeof body.eventId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.eventId)) return fail("Invalid delivery event ID.");
  const { data: event } = await access.supabase.from("email_events").select("id,recipient,status,kind,metadata").eq("id", body.eventId).single();
  if (!event) return fail("Delivery event not found.", 404);
  if (event.status !== "failed") return fail("Only failed report deliveries can be retried.", 409);
  if (event.kind !== "weekly_reliability_report" && event.kind !== "weekly_notification_report") return fail("This event is not a weekly report delivery.", 422);
  const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : {};
  const runId = typeof metadata.runId === "string" ? metadata.runId : null;
  if (!runId) return fail("The original report run is not available for retry.", 422);
  const { data: run } = await access.supabase.from("report_runs").select("id,period_start,period_end").eq("id", runId).maybeSingle();
  if (!run) return fail("The original report run could not be found.", 404);
  const [{ data: notifications }, { data: healthRuns }, { data: healthIncidents }] = await Promise.all([
    access.supabase.from("notifications").select("created_at,title,message,type,read").gte("created_at", run.period_start).lte("created_at", run.period_end).order("created_at", { ascending: false }).limit(500),
    access.supabase.from("health_checks").select("overall,created_at").gte("created_at", run.period_start).lte("created_at", run.period_end).order("created_at", { ascending: false }).limit(500),
    access.supabase.from("health_incidents").select("status,severity,component,last_seen_at,latest_message").gte("created_at", run.period_start).lte("created_at", run.period_end).order("last_seen_at", { ascending: false }).limit(200),
  ]);
  try {
    const sla = await evaluateSystemHealthSla({ supabase: access.supabase, actorId: access.user.id, notify: false });
    const pdf = await renderWeeklyReliabilityReportPdf({ notifications: notifications || [], runs: healthRuns || [], incidents: healthIncidents || [], sla });
    const result = await sendTrackedEmail({ supabase: access.supabase, actorId: access.user.id, kind: "weekly_reliability_report", message: { to: event.recipient, subject: "ZeroCraft weekly reliability report · retry", text: "Attached is the retried ZeroCraft weekly reliability report.", html: "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#18181b\"><h2>ZeroCraft weekly reliability report</h2><p>This report delivery was retried successfully through SMTP.</p></div>", attachments: [{ filename: "zerocraft-weekly-reliability.pdf", content: pdf, contentType: "application/pdf" }] }, metadata: { runId: run.id, retryOf: event.id, report: "reliability" } });
    await access.supabase.from("email_events").update({ status: "dead_letter", last_error: `Retried as ${result.eventId || "a new event"}`, updated_at: new Date().toISOString() }).eq("id", event.id);
    return Response.json({ ok: true, eventId: result.eventId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message.slice(0, 500) : "Weekly report retry failed.", 502);
  }
}
