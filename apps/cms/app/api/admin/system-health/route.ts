import { requireCommercePermission } from "@/lib/commerce-auth";
import { createServiceClient } from "@/lib/supabase-service";
import { smtpConfigured, verifySmtpConnection } from "@/lib/email/smtp";
import { isSameOrigin } from "@/lib/request-origin";
import { loadHealthHistory, recordHealthSnapshot } from "@/lib/system-health-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CheckStatus = "healthy" | "warning" | "failed" | "unavailable";
export type HealthCheck = { key: string; label: string; status: CheckStatus; message: string; latencyMs?: number; checkedAt: string; meta?: Record<string, unknown> };

function denied(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function serviceClient() {
  try { return await createServiceClient(); } catch { return null; }
}

function check(key: string, label: string, status: CheckStatus, message: string, started: number, meta?: Record<string, unknown>): HealthCheck {
  return { key, label, status, message, latencyMs: Math.round(performance.now() - started), checkedAt: new Date().toISOString(), ...(meta ? { meta } : {}) };
}

export async function buildHealth(supabase: any, verifySmtpNow: boolean) {
  const checks: HealthCheck[] = [];
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const dbStarted = performance.now();
  const { data: permissionCheck, error: dbError } = await supabase.from("permissions").select("key").eq("key", "system_health.read").maybeSingle();
  checks.push(dbError || !permissionCheck
    ? check("database", "Supabase database", "failed", "Database permission/RPC check failed.", dbStarted)
    : check("database", "Supabase database", "healthy", "Authenticated database and permission RPC are responding.", dbStarted));

  const schemaStarted = performance.now();
  const { data: healthPermission, error: schemaError } = await supabase.from("permissions").select("key").eq("key", "system_health.read").maybeSingle();
  checks.push(schemaError || !healthPermission
    ? check("schema", "Schema readiness", "failed", "Required RBAC/health schema is not available.", schemaStarted)
    : check("schema", "Schema readiness", "healthy", "RBAC and system-health schema are available.", schemaStarted));

  const automationStarted = performance.now();
  const { data: automation, error: automationError } = await supabase.rpc("get_automation_health");
  const automationRow = automation?.[0];
  checks.push(automationError
    ? check("cron", "Scheduled automations", "failed", "Automation health RPC failed.", automationStarted)
    : automationRow?.last_run_status === "failed"
      ? check("cron", "Scheduled automations", "warning", "The latest low-stock automation run failed.", automationStarted, { lastRunAt: automationRow.last_run_at })
      : check("cron", "Scheduled automations", "healthy", automationRow?.last_run_at ? `Last run succeeded at ${new Date(automationRow.last_run_at).toLocaleString("en-IN")}.` : "Automation is configured and awaiting its first run.", automationStarted, { lastRunAt: automationRow?.last_run_at || null, nextRunAt: automationRow?.next_run_at || null }));

  const smtpStarted = performance.now();
  if (!smtpConfigured()) {
    checks.push(check("smtp", "SMTP email", "failed", "SMTP environment variables are not configured.", smtpStarted));
  } else if (verifySmtpNow) {
    try {
      const smtp = await verifySmtpConnection();
      checks.push(check("smtp", "SMTP email", "healthy", "SMTP connection verified without sending an email.", smtpStarted, smtp));
    } catch (error) {
      checks.push(check("smtp", "SMTP email", "failed", error instanceof Error ? error.message : "SMTP connection verification failed.", smtpStarted));
    }
  } else {
    checks.push(check("smtp", "SMTP email", "healthy", "SMTP is configured. Run diagnostics when you need a live connection verification.", smtpStarted, { verified: false }));
  }

  const service = await serviceClient();
  const storageStarted = performance.now();
  if (!service) {
    checks.push(check("storage", "Supabase Storage", "unavailable", "Service-role storage check is not configured on this deployment.", storageStarted));
  } else {
    const { data: buckets, error: storageError } = await service.storage.listBuckets();
    checks.push(storageError
      ? check("storage", "Supabase Storage", "failed", "Storage bucket check failed.", storageStarted)
      : check("storage", "Supabase Storage", "healthy", `${buckets?.length || 0} storage bucket${buckets?.length === 1 ? "" : "s"} available.`, storageStarted, { bucketCount: buckets?.length || 0 }));
  }

  const [failedRuns, failedEmails, testRuns, testEmails] = await Promise.all([
    supabase.from("automation_runs").select("id", { count: "exact", head: true }).eq("status", "failed").eq("is_test", false).gte("created_at", dayAgo),
    supabase.from("email_events").select("id", { count: "exact", head: true }).eq("status", "failed").eq("is_test", false).gte("created_at", dayAgo),
    supabase.from("automation_runs").select("id", { count: "exact", head: true }).eq("status", "failed").eq("is_test", true).gte("created_at", dayAgo),
    supabase.from("email_events").select("id", { count: "exact", head: true }).eq("status", "failed").eq("is_test", true).gte("created_at", dayAgo),
  ]);
  const failures = (failedRuns.count || 0) + (failedEmails.count || 0);
  const testFailures = (testRuns.count || 0) + (testEmails.count || 0);
  const errorsStarted = performance.now();
  checks.push((failedRuns.error || failedEmails.error || testRuns.error || testEmails.error)
    ? check("errors", "Recent failures", "unavailable", "Recent failure counts could not be loaded.", errorsStarted)
    : check("errors", "Recent failures", failures ? "warning" : "healthy", failures ? `${failures} failed automation/email event${failures === 1 ? "" : "s"} in the last 24 hours.` : "No failed automation or email events in the last 24 hours.", errorsStarted, { failedAutomations: failedRuns.count || 0, failedEmails: failedEmails.count || 0, excludedTestFailures: testFailures }));

  const deploymentStarted = performance.now();
  const deploymentMeta = { environment: process.env.VERCEL_ENV || "local", commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null, url: process.env.VERCEL_URL || null };
  checks.push(process.env.VERCEL_ENV
    ? check("deployment", "Vercel deployment", "healthy", `Running in ${process.env.VERCEL_ENV} on the current deployment.`, deploymentStarted, deploymentMeta)
    : check("deployment", "Vercel deployment", "warning", "Vercel deployment metadata is not present in this environment.", deploymentStarted, deploymentMeta));

  const overall: "healthy" | "degraded" | "critical" = checks.some((item) => item.status === "failed") ? "critical" : checks.some((item) => item.status === "warning" || item.status === "unavailable") ? "degraded" : "healthy";
  return { overall, checks, summary: { checkedAt: new Date().toISOString(), failureCount24h: failures, excludedTestFailureCount24h: testFailures, automation: automationRow || null } };
}

export async function GET() {
  const access = await requireCommercePermission("system_health.read");
  if (!access.ok) return access.response;
  const health = await buildHealth(access.supabase, false);
  await recordHealthSnapshot({ supabase: serviceClient() || access.supabase, health, trigger: "dashboard", actorId: access.user.id });
  const history = await loadHealthHistory(access.supabase);
  return Response.json({ ...health, history }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await requireCommercePermission("system_health.manage");
  if (!access.ok) return access.response;
  const health = await buildHealth(access.supabase, true);
  await recordHealthSnapshot({ supabase: serviceClient() || access.supabase, health, trigger: "diagnostic", actorId: access.user.id });
  await access.supabase.from("audit_logs").insert({ actor_id: access.user.id, action: "system.health_diagnostics_run", entity_type: "system_health", entity_id: null, metadata: { overall: health.overall, checks: health.checks.map((item) => ({ key: item.key, status: item.status })) } });
  return Response.json({ ...health, diagnostics: true }, { headers: { "Cache-Control": "private, no-store" } });
}
