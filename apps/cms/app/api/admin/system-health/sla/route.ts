import { requireCommercePermission } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";
import { evaluateSystemHealthSla } from "@/lib/system-health-sla";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireCommercePermission("system_health.read");
  if (!access.ok) return access.response;
  const { data: settings } = await access.supabase.from("health_settings").select("enabled,uptime_target,failure_rate_max,mttr_max_minutes,notify_admins,updated_at").eq("id", true).maybeSingle();
  const evaluation = await evaluateSystemHealthSla({ supabase: access.supabase, actorId: access.user.id, notify: false });
  return Response.json({ settings, evaluation }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const access = await requireCommercePermission("system_health.manage");
  if (!access.ok) return access.response;
  let body: { enabled?: unknown; uptimeTarget?: unknown; failureRateMax?: unknown; mttrMaxMinutes?: unknown; notifyAdmins?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid SLA settings." }, { status: 400 }); }
  const uptimeTarget = Number(body.uptimeTarget); const failureRateMax = Number(body.failureRateMax); const mttrMaxMinutes = Number(body.mttrMaxMinutes);
  if (![uptimeTarget, failureRateMax, mttrMaxMinutes].every(Number.isFinite) || uptimeTarget < 0 || uptimeTarget > 100 || failureRateMax < 0 || failureRateMax > 100 || mttrMaxMinutes < 0) return Response.json({ error: "Enter valid SLA threshold values." }, { status: 400 });
  const { data, error } = await access.supabase.from("health_settings").upsert({ id: true, enabled: body.enabled !== false, uptime_target: uptimeTarget, failure_rate_max: failureRateMax, mttr_max_minutes: Math.round(mttrMaxMinutes), notify_admins: body.notifyAdmins !== false, updated_by: access.user.id, updated_at: new Date().toISOString() }, { onConflict: "id" }).select("enabled,uptime_target,failure_rate_max,mttr_max_minutes,notify_admins,updated_at").single();
  if (error) return Response.json({ error: "SLA settings could not be saved." }, { status: 503 });
  await access.supabase.from("audit_logs").insert({ actor_id: access.user.id, action: "system.health_sla_updated", entity_type: "system_health_sla", entity_id: null, metadata: data });
  return Response.json({ settings: data }, { headers: { "Cache-Control": "private, no-store" } });
}
