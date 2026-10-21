import { requireStudioPermission } from "@/lib/studio-auth";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f-]{36}$/i;

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const access = await requireStudioPermission("system_health.read");
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const selectedStatus = url.searchParams.get("status");
  const search = (url.searchParams.get("q") || "").trim().toLowerCase();
  const daysValue = Number(url.searchParams.get("days") || 1);
  const days = Number.isFinite(daysValue) ? Math.min(Math.max(daysValue, 1), 90) : 1;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: runs, error: runsError }, { data: emails, error: emailsError }, { data: acknowledgements, error: acknowledgementsError }] = await Promise.all([
    access.supabase.from("studio_automation_runs").select("id,job_name,trigger,status,started_at,finished_at,error_message,created_at").eq("status", "failed").gte("created_at", since).order("created_at", { ascending: false }).limit(100),
    access.supabase.from("studio_email_events").select("id,kind,recipient,subject,status,attempts,last_error,next_attempt_at,created_at").in("status", ["failed", "dead_letter"]).gte("created_at", since).order("created_at", { ascending: false }).limit(100),
    access.supabase.from("studio_system_health_failure_acknowledgements").select("failure_type,failure_id,status,notes,acknowledged_at,resolved_at,updated_at").order("updated_at", { ascending: false }).limit(200),
  ]);
  if (runsError || emailsError || acknowledgementsError) return errorResponse("Recent failure details are unavailable. Apply the system-health acknowledgement migration first.", 503);
  const statusByKey = new Map((acknowledgements || []).map((item) => [`${item.failure_type}:${item.failure_id}`, item]));
  const failures = [
    ...(kind !== "email" ? (runs || []).map((run) => ({ id: run.id, kind: "automation" as const, title: run.job_name, detail: `${run.trigger} run`, status: statusByKey.get(`automation:${run.id}`)?.status || "open", error: run.error_message || "Automation failed without an error message.", createdAt: run.created_at, startedAt: run.started_at, finishedAt: run.finished_at, retryable: true, metadata: { jobName: run.job_name, trigger: run.trigger } })) : []),
    ...(kind !== "automation" ? (emails || []).map((event) => ({ id: event.id, kind: "email" as const, title: event.kind, detail: event.recipient, status: statusByKey.get(`email:${event.id}`)?.status || "open", error: event.last_error || "Email delivery failed.", createdAt: event.created_at, startedAt: event.created_at, finishedAt: null, retryable: event.status === "failed", metadata: { subject: event.subject, attempts: event.attempts, nextAttemptAt: event.next_attempt_at } })) : []),
  ].filter((failure) => {
    const matchesStatus = !selectedStatus || selectedStatus === "all" || failure.status === selectedStatus;
    const searchable = `${failure.title} ${failure.detail} ${failure.error}`.toLowerCase();
    return matchesStatus && (!search || searchable.includes(search));
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return Response.json({ failures }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  const access = await requireStudioPermission("system_health.manage");
  if (!access.ok) return access.response;
  let body: { failureType?: unknown; failureId?: unknown; action?: unknown; notes?: unknown };
  try { body = await request.json(); } catch { return errorResponse("Invalid failure action request."); }
  if (body.failureType !== "automation" && body.failureType !== "email") return errorResponse("Invalid failure type.");
  if (typeof body.failureId !== "string" || !uuid.test(body.failureId)) return errorResponse("Invalid failure ID.");
  if (body.action !== "acknowledge" && body.action !== "resolve") return errorResponse("Invalid failure action.");
  const now = new Date().toISOString();
  const resolved = body.action === "resolve";
  const { error } = await access.supabase.from("studio_system_health_failure_acknowledgements").upsert({ failure_type: body.failureType, failure_id: body.failureId, status: resolved ? "resolved" : "acknowledged", notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : null, acknowledged_by: access.user.id, resolved_by: resolved ? access.user.id : null, acknowledged_at: now, resolved_at: resolved ? now : null, updated_at: now }, { onConflict: "failure_type,failure_id" });
  if (error) return errorResponse("Failure status could not be updated.", 503);
  await access.supabase.from("store_audit_logs").insert({ actor_id: access.user.id, action: resolved ? "system.health_failure_resolved" : "system.health_failure_acknowledged", entity_type: `system_health_${body.failureType}_failure`, entity_id: body.failureId, metadata: { notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : null } });
  return Response.json({ ok: true, status: resolved ? "resolved" : "acknowledged" }, { headers: { "Cache-Control": "private, no-store" } });
}
