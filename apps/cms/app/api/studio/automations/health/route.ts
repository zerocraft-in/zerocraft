import { requireStudioAccess } from "@/lib/studio-auth";
import { notifyAutomationFailure, type AutomationFailureRun } from "@/lib/email/automation-failures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  const { data, error } = await access.supabase.rpc("studio_get_automation_health");
  if (error) {
    return Response.json(
      { error: "Automation health is unavailable. Apply the automation health migration first." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const { data: runs } = await access.supabase.from("studio_automation_runs").select("id,job_name,trigger,status,started_at,finished_at,active_low_stock_count,error_message,triggered_by,created_at").eq("job_name", "studio-low-stock-alerts").order("created_at", { ascending: false }).limit(20);
  const { data: lastEmailAlert } = await access.supabase.from("studio_automation_failure_notifications").select("status,recipient,created_at,sent_at,last_error,run_id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const [{ data: weeklySettings }, { data: weeklyRuns }] = await Promise.all([
    access.supabase.from("studio_notification_report_settings").select("job_name,enabled,weekday,send_hour_utc,recipient_roles,updated_at").eq("job_name", "studio-weekly-notification-report").maybeSingle(),
    access.supabase.from("studio_notification_report_runs").select("id,status,scheduled_for,started_at,finished_at,recipient_count,notification_count,error_message,created_at").eq("job_name", "studio-weekly-notification-report").order("created_at", { ascending: false }).limit(1),
  ]);
  const failedRuns = (runs || []).filter((run) => run.status === "failed") as AutomationFailureRun[];
  for (const run of failedRuns) {
    await notifyAutomationFailure({ supabase: access.supabase, actorId: access.user.id, run }).catch(() => undefined);
  }
  return Response.json({
    automation: data?.[0] || null,
    runs: runs || [],
    lastEmailAlert: lastEmailAlert || null,
    weeklyReport: { settings: weeklySettings || null, latestRun: weeklyRuns?.[0] || null },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST() {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (access.role !== "admin" && access.role !== "manager") {
    return Response.json({ error: "Only admins and managers can run automations manually." }, { status: 403 });
  }
  const startedAt = new Date().toISOString();
  const { data, error } = await access.supabase.rpc("studio_sync_low_stock_alerts");
  if (error) {
    const { data: failedRun } = await access.supabase.from("studio_automation_runs").insert({ job_name: "studio-low-stock-alerts", trigger: "manual", status: "failed", started_at: startedAt, finished_at: new Date().toISOString(), error_message: error.message.slice(0, 1000), triggered_by: access.user.id }).select("id,job_name,trigger,started_at,error_message").maybeSingle();
    if (failedRun) await notifyAutomationFailure({ supabase: access.supabase, actorId: access.user.id, run: failedRun }).catch(() => undefined);
    return Response.json({ error: "Automation run failed. Check the automation health logs." }, { status: 502 });
  }
  await access.supabase.from("studio_automation_runs").insert({ job_name: "studio-low-stock-alerts", trigger: "manual", status: "succeeded", started_at: startedAt, finished_at: new Date().toISOString(), active_low_stock_count: Number(data) || 0, triggered_by: access.user.id });
  return Response.json({ ok: true, activeLowStockCount: data }, { headers: { "Cache-Control": "private, no-store" } });
}
