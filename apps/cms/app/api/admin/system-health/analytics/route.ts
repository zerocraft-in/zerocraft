import { requireCommercePermission } from "@/lib/commerce-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireCommercePermission("system_health.read");
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get("days") || 30);
  const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 7), 90) : 30;
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const since = sinceDate.toISOString();
  const [{ data: runs, error: runsError }, { data: incidents, error: incidentsError }, { data: failedRuns, error: failedRunsError }, { data: failedEmails, error: failedEmailsError }] = await Promise.all([
    access.supabase.from("health_checks").select("overall,created_at").gte("created_at", since).order("created_at", { ascending: true }).limit(2000),
    access.supabase.from("health_incidents").select("severity,status,component,first_seen_at,last_seen_at,resolved_at").gte("created_at", since).order("created_at", { ascending: true }).limit(500),
    access.supabase.from("automation_runs").select("job_name,status,created_at").eq("status", "failed").eq("is_test", false).gte("created_at", since).limit(1000),
    access.supabase.from("email_events").select("kind,status,created_at").in("status", ["failed", "dead_letter"]).eq("is_test", false).gte("created_at", since).limit(1000),
  ]);
  if (runsError || incidentsError || failedRunsError || failedEmailsError) return Response.json({ error: "System health analytics are unavailable." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });

  const totalRuns = runs?.length || 0;
  const healthyRuns = (runs || []).filter((run) => run.overall === "healthy").length;
  const uptime = totalRuns ? (healthyRuns / totalRuns) * 100 : 100;
  const failureCount = (failedRuns?.length || 0) + (failedEmails?.length || 0);
  const totalEvents = totalRuns + failureCount;
  const failureRate = totalEvents ? (failureCount / totalEvents) * 100 : 0;
  const resolvedIncidents = (incidents || []).filter((incident) => incident.status === "resolved" && incident.resolved_at);
  const mttrValues = resolvedIncidents.map((incident) => Math.max(0, new Date(incident.resolved_at as string).getTime() - new Date(incident.first_seen_at).getTime()) / 60000);
  const mttrMinutes = mttrValues.length ? mttrValues.reduce((sum, value) => sum + value, 0) / mttrValues.length : 0;
  const resolutionRate = incidents?.length ? (resolvedIncidents.length / incidents.length) * 100 : 100;
  const reliabilityScore = Math.max(0, Math.min(100, Math.round(uptime * 0.7 + resolutionRate * 0.3)));
  const trends = Array.from({ length: days }, (_, index) => {
    const date = new Date(sinceDate.getTime() + index * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const dayRuns = (runs || []).filter((run) => run.created_at.slice(0, 10) === key);
    const dayFailures = [...(failedRuns || []), ...(failedEmails || [])].filter((item) => item.created_at.slice(0, 10) === key).length;
    const dayIncidents = (incidents || []).filter((incident) => incident.first_seen_at.slice(0, 10) === key).length;
    return { date: key.slice(5), healthy: dayRuns.filter((run) => run.overall === "healthy").length, degraded: dayRuns.filter((run) => run.overall === "degraded").length, critical: dayRuns.filter((run) => run.overall === "critical").length, failures: dayFailures, incidents: dayIncidents };
  });
  const topMap = new Map<string, number>();
  for (const run of failedRuns || []) topMap.set(run.job_name, (topMap.get(run.job_name) || 0) + 1);
  for (const email of failedEmails || []) topMap.set(`Email · ${email.kind}`, (topMap.get(`Email · ${email.kind}`) || 0) + 1);
  const topFailures = [...topMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  return Response.json({ days, metrics: { uptime: Number(uptime.toFixed(2)), failureRate: Number(failureRate.toFixed(2)), mttrMinutes: Number(mttrMinutes.toFixed(1)), reliabilityScore, totalRuns, failureCount, incidents: incidents?.length || 0, resolvedIncidents: resolvedIncidents.length }, trends, topFailures }, { headers: { "Cache-Control": "private, no-store" } });
}
