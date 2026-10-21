import "server-only";

import { sendTrackedEmail } from "@/lib/email/delivery";
import { systemHealthSlaEmail } from "@/lib/email/templates";

type Client = any;
type HealthRunRow = { overall: string; created_at: string };
type IncidentRow = { first_seen_at: string; resolved_at: string | null; status: string };

export async function evaluateSystemHealthSla(input: { supabase: Client; actorId?: string | null; notify?: boolean }) {
  const { supabase, actorId = null, notify: notifyAdmins = true } = input;
  const { data: settings } = await supabase.from("studio_system_health_sla_settings").select("enabled,uptime_target,failure_rate_max,mttr_max_minutes,notify_admins").eq("id", true).maybeSingle();
  if (!settings?.enabled) return { enabled: false, breaches: [] };
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: runs }, { data: failedRuns }, { data: failedEmails }, { data: incidents }] = await Promise.all([
    supabase.from("studio_system_health_runs").select("overall,created_at").gte("created_at", since),
    supabase.from("studio_automation_runs").select("id").eq("status", "failed").gte("created_at", since),
    supabase.from("studio_email_events").select("id").in("status", ["failed", "dead_letter"]).gte("created_at", since),
    supabase.from("studio_system_health_incidents").select("first_seen_at,resolved_at,status").gte("created_at", since),
  ]);
  const healthRuns = (runs || []) as HealthRunRow[];
  const healthIncidents = (incidents || []) as IncidentRow[];
  const totalRuns = healthRuns.length;
  const uptime = totalRuns ? (healthRuns.filter((run: HealthRunRow) => run.overall === "healthy").length / totalRuns) * 100 : 100;
  const failureCount = (failedRuns?.length || 0) + (failedEmails?.length || 0);
  const eventCount = totalRuns + failureCount;
  const failureRate = eventCount ? (failureCount / eventCount) * 100 : 0;
  const resolved = healthIncidents.filter((incident: IncidentRow) => incident.status === "resolved" && incident.resolved_at);
  const mttr = resolved.length ? resolved.reduce((sum: number, incident: IncidentRow) => sum + (new Date(incident.resolved_at as string).getTime() - new Date(incident.first_seen_at).getTime()) / 60000, 0) / resolved.length : 0;
  const measures = [{ key: "uptime", label: "24-hour uptime", value: uptime, target: Number(settings.uptime_target), breach: uptime < Number(settings.uptime_target), detail: `${uptime.toFixed(2)}% is below the ${Number(settings.uptime_target).toFixed(2)}% target.` }, { key: "failure-rate", label: "24-hour failure rate", value: failureRate, target: Number(settings.failure_rate_max), breach: failureRate > Number(settings.failure_rate_max), detail: `${failureRate.toFixed(2)}% is above the ${Number(settings.failure_rate_max).toFixed(2)}% maximum.` }, { key: "mttr", label: "Average recovery time", value: mttr, target: Number(settings.mttr_max_minutes), breach: mttr > Number(settings.mttr_max_minutes), detail: `${mttr.toFixed(1)} minutes is above the ${Number(settings.mttr_max_minutes)} minute maximum.` }];
  const breaches = measures.filter((item) => item.breach);
  for (const breach of measures) {
    const fingerprint = `sla:${breach.key}`;
    const { data: existing } = await supabase.from("studio_system_health_incidents").select("id,status,notification_sent_at,notification_attempts").eq("fingerprint", fingerprint).maybeSingle();
    if (!breach.breach) {
      if (existing?.status === "open") await supabase.from("studio_system_health_incidents").update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", existing.id);
      continue;
    }
    const now = new Date().toISOString();
    const incident = { fingerprint, status: "open", severity: "degraded", component: `SLA · ${breach.label}`, last_seen_at: now, latest_message: breach.detail, resolved_at: null, updated_at: now };
    if (existing) await supabase.from("studio_system_health_incidents").update(incident).eq("id", existing.id);
    else await supabase.from("studio_system_health_incidents").insert({ ...incident, first_seen_at: now });
    const notify = notifyAdmins && Boolean(settings.notify_admins) && (!existing || existing.status !== "open" || !existing.notification_sent_at || Date.now() - new Date(existing.notification_sent_at).getTime() >= 30 * 60 * 1000);
    if (!notify) continue;
    const { data: recipients } = await supabase.from("profiles").select("id,email").in("role", ["admin", "manager"]).eq("is_active", true).not("email", "is", null);
    let errorMessage: string | null = null;
    for (const recipient of recipients || []) {
      const email = String(recipient.email || "").trim().toLowerCase();
      if (!email) continue;
      const dedupeKey = `sla-breach:${breach.key}:${recipient.id}:${Math.floor(Date.now() / (30 * 60 * 1000))}`;
      await supabase.from("notifications").upsert({ title: `SLA breached: ${breach.label}`, message: breach.detail, category: "system", type: "warning", read: false, link: "/system-health", recipient_id: recipient.id, dedupe_key: dedupeKey, metadata: { slaKey: breach.key, value: breach.value, target: breach.target } }, { onConflict: "dedupe_key" });
      try { await sendTrackedEmail({ supabase, actorId, kind: "system.health.sla", message: systemHealthSlaEmail({ recipient: email, label: breach.label, detail: breach.detail }), metadata: { slaKey: breach.key, recipientId: recipient.id } }); } catch (error) { errorMessage = error instanceof Error ? error.message.slice(0, 500) : "SMTP delivery failed"; }
    }
    await supabase.from("studio_system_health_incidents").update({ notification_sent_at: now, notification_attempts: (existing?.notification_attempts || 0) + 1, last_error: errorMessage, updated_at: now }).eq("fingerprint", fingerprint);
  }
  return { enabled: true, metrics: { uptime, failureRate, mttr }, settings, breaches };
}
