import { requireStudioPermission } from "@/lib/studio-auth";
import { evaluateSystemHealthSla } from "@/lib/system-health-sla";
import { renderWeeklyReliabilityReportPdf } from "@/lib/system-health-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireStudioPermission("notifications.read");
  if (!access.ok) return access.response;
  const runId = new URL(request.url).searchParams.get("runId");
  if (!runId || !/^[0-9a-f-]{36}$/i.test(runId)) return Response.json({ error: "Invalid report run ID." }, { status: 400 });
  const { data: run } = await access.supabase.from("studio_notification_report_runs").select("id,period_start,period_end").eq("id", runId).maybeSingle();
  if (!run) return Response.json({ error: "Report run not found." }, { status: 404 });
  const [{ data: notifications }, { data: healthRuns }, { data: incidents }] = await Promise.all([
    access.supabase.from("notifications").select("created_at,title,message,type,read").gte("created_at", run.period_start).lte("created_at", run.period_end).order("created_at", { ascending: false }).limit(500),
    access.supabase.from("studio_system_health_runs").select("overall,created_at").gte("created_at", run.period_start).lte("created_at", run.period_end).order("created_at", { ascending: false }).limit(500),
    access.supabase.from("studio_system_health_incidents").select("status,severity,component,last_seen_at,latest_message").gte("created_at", run.period_start).lte("created_at", run.period_end).order("last_seen_at", { ascending: false }).limit(200),
  ]);
  const sla = await evaluateSystemHealthSla({ supabase: access.supabase, actorId: access.user.id, notify: false });
  const pdf = await renderWeeklyReliabilityReportPdf({ notifications: notifications || [], runs: healthRuns || [], incidents: incidents || [], sla });
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="zerocraft-reliability-${run.period_start.slice(0, 10)}.pdf"` } });
}
