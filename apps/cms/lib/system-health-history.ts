import "server-only";

import { sendTrackedEmail } from "@/lib/email/delivery";
import { systemHealthIncidentEmail } from "@/lib/email/templates";

type HealthClient = any;
type HealthCheck = { key: string; label: string; status: "healthy" | "warning" | "failed" | "unavailable"; message: string; latencyMs?: number; checkedAt: string; meta?: Record<string, unknown> };
type HealthSnapshot = { overall: "healthy" | "degraded" | "critical"; checks: HealthCheck[]; summary: Record<string, unknown> };

const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

export async function recordHealthSnapshot(input: {
  supabase: HealthClient;
  health: HealthSnapshot;
  trigger: "dashboard" | "diagnostic" | "scheduled";
  actorId?: string | null;
}) {
  const { supabase, health, trigger, actorId = null } = input;
  const now = new Date();
  const { data: latest } = await supabase.from("health_checks").select("id,overall,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const shouldInsert = !latest || latest.overall !== health.overall || now.getTime() - new Date(latest.created_at).getTime() >= 5 * 60 * 1000 || trigger !== "dashboard";
  if (shouldInsert) {
    await supabase.from("health_checks").insert({ overall: health.overall, checks: health.checks, summary: health.summary, trigger, triggered_by: actorId, started_at: health.summary.checkedAt || now.toISOString(), finished_at: now.toISOString() });
  }

  const unhealthy = health.checks.filter((item) => item.status !== "healthy");
  const unhealthyKeys = new Set(unhealthy.map((item) => `system-health:${item.key}`));
  for (const item of unhealthy) {
    const fingerprint = `system-health:${item.key}`;
    const severity = item.status === "failed" || item.status === "unavailable" || health.overall === "critical" ? "critical" : "degraded";
    const { data: existing } = await supabase.from("health_incidents").select("id,status,notification_sent_at,notification_attempts").eq("fingerprint", fingerprint).maybeSingle();
    const incident = { fingerprint, status: "open", severity, component: item.label, last_seen_at: now.toISOString(), latest_message: item.message, resolved_at: null, updated_at: now.toISOString() };
    if (existing) await supabase.from("health_incidents").update(incident).eq("id", existing.id);
    else await supabase.from("health_incidents").insert(incident);

    const shouldNotify = !existing || existing.status !== "open" || !existing.notification_sent_at || now.getTime() - new Date(existing.notification_sent_at).getTime() >= ALERT_COOLDOWN_MS;
    if (!shouldNotify) continue;

    const { data: recipients } = await supabase.from("accounts").select("id,email,full_name").in("role", ["admin", "manager"]).eq("is_active", true).not("email", "is", null);
    let attemptError: string | null = null;
    for (const recipient of recipients || []) {
      const email = String(recipient.email || "").trim().toLowerCase();
      if (!email) continue;
      const dedupeKey = `system-health:${fingerprint}:${recipient.id}:${Math.floor(now.getTime() / ALERT_COOLDOWN_MS)}`;
      await supabase.from("notifications").upsert({ title: `System health ${severity}`, message: `${item.label}: ${item.message}`.slice(0, 500), category: "system", type: severity === "critical" ? "error" : "warning", read: false, link: "/system/health", recipient_id: recipient.id, dedupe_key: dedupeKey, metadata: { fingerprint, severity, component: item.label } }, { onConflict: "dedupe_key" });
      try {
        await sendTrackedEmail({ supabase, actorId: actorId || null, kind: "system.health", message: systemHealthIncidentEmail({ recipient: email, severity, component: item.label, message: item.message, openedAt: now.toISOString() }), metadata: { fingerprint, recipientId: recipient.id } });
      } catch (error) {
        attemptError = error instanceof Error ? error.message.slice(0, 500) : "SMTP delivery failed";
      }
    }
    await supabase.from("health_incidents").update({ notification_sent_at: now.toISOString(), notification_attempts: (existing?.notification_attempts || 0) + 1, last_error: attemptError, updated_at: now.toISOString() }).eq("fingerprint", fingerprint);
  }

  const { data: openIncidents } = await supabase.from("health_incidents").select("id,fingerprint").eq("status", "open");
  for (const incident of openIncidents || []) {
    if (!unhealthyKeys.has(incident.fingerprint)) await supabase.from("health_incidents").update({ status: "resolved", resolved_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", incident.id);
  }
}

export async function loadHealthHistory(supabase: HealthClient, days = 7) {
  const since = new Date(Date.now() - Math.min(Math.max(days, 1), 90) * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: runs }, { data: incidents }] = await Promise.all([
    supabase.from("health_checks").select("id,overall,checks,summary,trigger,started_at,finished_at,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
    supabase.from("health_incidents").select("id,fingerprint,status,severity,component,first_seen_at,last_seen_at,resolved_at,latest_message,notification_sent_at,notification_attempts,last_error,created_at,updated_at").order("last_seen_at", { ascending: false }).limit(100),
  ]);
  return { runs: runs || [], incidents: incidents || [] };
}
