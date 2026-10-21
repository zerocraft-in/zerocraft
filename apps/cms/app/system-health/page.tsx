"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconCheck, IconDownload, IconHeartbeat, IconPlayerPlay, IconRefresh, IconRotateClockwise, IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CheckStatus = "healthy" | "warning" | "failed" | "unavailable";
type HealthCheck = { key: string; label: string; status: CheckStatus; message: string; latencyMs?: number; checkedAt: string; meta?: Record<string, unknown> };
type HealthRun = { id: string; overall: string; trigger: string; created_at: string };
type HealthIncident = { id: string; status: string; severity: string; component: string; first_seen_at: string; last_seen_at: string; resolved_at: string | null; latest_message: string; notification_sent_at: string | null; notification_attempts: number; last_error: string | null };
type Failure = { id: string; kind: "automation" | "email"; title: string; detail: string; status: "open" | "acknowledged" | "resolved"; error: string; createdAt: string; startedAt: string; finishedAt: string | null; retryable: boolean; metadata: Record<string, unknown> };
type Health = { overall: "healthy" | "degraded" | "critical"; checks: HealthCheck[]; summary: { checkedAt: string; failureCount24h: number }; history?: { runs: HealthRun[]; incidents: HealthIncident[] } };

const statusLabel: Record<CheckStatus, string> = { healthy: "Healthy", warning: "Warning", failed: "Failed", unavailable: "Unavailable" };
const statusVariant: Record<CheckStatus, "default" | "secondary" | "destructive" | "outline"> = { healthy: "default", warning: "secondary", failed: "destructive", unavailable: "outline" };
const dateLabel = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "healthy") return <IconCheck className="size-5 text-emerald-600" />;
  if (status === "failed") return <IconX className="size-5 text-destructive" />;
  return <IconAlertTriangle className="size-5 text-amber-600" />;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [failures, setFailures] = useState<Failure[]>([]);
  const [failureBusy, setFailureBusy] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [response, failuresResponse] = await Promise.all([fetch("/api/studio/system-health", { cache: "no-store" }), fetch("/api/studio/system-health/failures", { cache: "no-store" })]);
      const payload = await response.json();
      const failuresPayload = await failuresResponse.json();
      if (!response.ok) throw new Error(payload.error || "System health could not be loaded.");
      if (!failuresResponse.ok) throw new Error(failuresPayload.error || "Recent failures could not be loaded.");
      setHealth(payload); setFailures(failuresPayload.failures || []); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "System health could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function runDiagnostics() {
    setDiagnosing(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/studio/system-health", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Diagnostics could not be completed.");
      setHealth(payload); setMessage("Diagnostics completed and recorded in the audit log.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Diagnostics could not be completed."); }
    finally { setDiagnosing(false); }
  }

  async function updateFailure(failure: Failure, action: "acknowledge" | "resolve") {
    setFailureBusy(failure.id); setError("");
    try {
      const response = await fetch("/api/studio/system-health/failures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ failureType: failure.kind, failureId: failure.id, action }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failure status could not be updated.");
      setFailures((current) => current.map((item) => item.id === failure.id ? { ...item, status: payload.status } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failure status could not be updated."); }
    finally { setFailureBusy(null); }
  }

  async function retryFailure(failure: Failure) {
    setFailureBusy(failure.id); setError(""); setMessage("");
    try {
      const endpoint = failure.kind === "automation" ? "/api/studio/automations/health" : "/api/studio/email-events";
      const body = failure.kind === "automation" ? undefined : JSON.stringify({ eventId: failure.id });
      const response = await fetch(endpoint, { method: "POST", headers: body ? { "Content-Type": "application/json" } : undefined, body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Retry failed.");
      await updateFailure(failure, "resolve");
      setMessage(`${failure.kind === "automation" ? "Automation" : "Email"} retry completed.`);
      await load(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Retry failed."); }
    finally { setFailureBusy(null); }
  }

  const healthyCount = useMemo(() => health?.checks.filter((item) => item.status === "healthy").length || 0, [health]);

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">System / Reliability</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight"><IconHeartbeat className="size-7" />System health</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Monitor the services, database, email, storage, and scheduled jobs behind ZeroCraft.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button><Button onClick={() => void runDiagnostics()} disabled={diagnosing}><IconPlayerPlay />{diagnosing ? "Checking…" : "Run diagnostics"}</Button></div></header>
    {message && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{message}</div>}
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    {health && <Card className={health.overall === "healthy" ? "border-emerald-500/30" : health.overall === "critical" ? "border-destructive/40" : "border-amber-500/40"}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-2xl ${health.overall === "healthy" ? "bg-emerald-500/10" : health.overall === "critical" ? "bg-destructive/10" : "bg-amber-500/10"}`}><StatusIcon status={health.overall === "healthy" ? "healthy" : health.overall === "critical" ? "failed" : "warning"} /></span><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Overall status</p><p className="mt-1 text-xl font-semibold capitalize">{health.overall}</p></div></div><div className="flex gap-6 text-sm"><span><strong>{healthyCount}</strong> healthy</span><span><strong>{health.checks.length - healthyCount}</strong> need attention</span><span><strong>{health.summary.failureCount24h}</strong> failures / 24h</span></div></CardContent></Card>}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{health?.checks.map((item) => <Card key={item.key} className="min-h-44"><CardHeader className="flex-row items-start justify-between gap-3 space-y-0"><div className="flex items-start gap-3"><span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-muted"><StatusIcon status={item.status} /></span><div><CardTitle className="text-base">{item.label}</CardTitle><CardDescription className="mt-1">{item.message}</CardDescription></div></div><Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge></CardHeader><CardContent className="flex items-center justify-between pt-0 text-xs text-muted-foreground"><span>Checked {dateLabel(item.checkedAt)}</span><span>{item.latencyMs ?? "—"} ms</span></CardContent></Card>)}</section>
    {!health && loading && <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">Loading system health…</div>}
    {health && <Card><CardHeader><CardTitle>Recent failures</CardTitle><CardDescription>Failed automation and email events from the last 24 hours. Retry, acknowledge, or resolve each item.</CardDescription></CardHeader><CardContent className="space-y-3">{failures.map((failure) => <div key={`${failure.kind}:${failure.id}`} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{failure.title}</p><Badge variant={failure.kind === "automation" ? "secondary" : "outline"}>{failure.kind}</Badge><Badge variant={failure.status === "resolved" ? "default" : failure.status === "acknowledged" ? "secondary" : "destructive"}>{failure.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{failure.detail} · {dateLabel(failure.createdAt)}</p></div><div className="flex flex-wrap gap-2">{failure.retryable && failure.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => void retryFailure(failure)} disabled={failureBusy === failure.id}><IconRotateClockwise className={failureBusy === failure.id ? "animate-spin" : ""} />Retry</Button>}{failure.status === "open" && <Button size="sm" variant="outline" onClick={() => void updateFailure(failure, "acknowledge")} disabled={failureBusy === failure.id}>Acknowledge</Button>}{failure.status === "acknowledged" && <Button size="sm" variant="outline" onClick={() => void updateFailure(failure, "resolve")} disabled={failureBusy === failure.id}>Resolve</Button>}</div></div><p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{failure.error}</p></div>)}{!failures.length && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700">No recent failures. All monitored events are healthy.</div>}</CardContent></Card>}
    {health && <Card><CardHeader className="flex-row items-start justify-between gap-3 space-y-0"><div><CardTitle>Health history</CardTitle><CardDescription>Durable checks, incidents, and recovery state from the last 7 days.</CardDescription></div><div className="flex gap-2"><a className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted" href="/api/studio/system-health/history?format=csv"><IconDownload className="size-4" />CSV</a><a className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted" href="/api/studio/system-health/history?format=pdf"><IconDownload className="size-4" />PDF</a></div></CardHeader><CardContent className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><div><div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Runs</p><p className="mt-1 text-xl font-semibold">{health.history?.runs.length || 0}</p></div><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Incidents</p><p className="mt-1 text-xl font-semibold">{health.history?.incidents.length || 0}</p></div><div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Open</p><p className="mt-1 text-xl font-semibold">{health.history?.incidents.filter((item) => item.status === "open").length || 0}</p></div></div><div className="mt-4 space-y-2">{(health.history?.runs || []).slice(0, 8).map((run) => <div key={run.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span>{dateLabel(run.created_at)} <span className="text-muted-foreground">· {run.trigger}</span></span><Badge variant={run.overall === "healthy" ? "default" : run.overall === "critical" ? "destructive" : "secondary"}>{run.overall}</Badge></div>)}{!health.history?.runs.length && <p className="text-sm text-muted-foreground">No recorded runs yet.</p>}</div></div><div><p className="mb-2 text-sm font-medium">Incident timeline</p><div className="space-y-2">{(health.history?.incidents || []).slice(0, 8).map((incident) => <div key={incident.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{incident.component}</p><div className="flex gap-1"><Badge variant={incident.severity === "critical" ? "destructive" : "secondary"}>{incident.severity}</Badge><Badge variant={incident.status === "resolved" ? "default" : "outline"}>{incident.status}</Badge></div></div><p className="mt-1 text-xs text-muted-foreground">{incident.latest_message}</p><p className="mt-2 text-[11px] text-muted-foreground">Last seen {dateLabel(incident.last_seen_at)}{incident.resolved_at ? ` · Resolved ${dateLabel(incident.resolved_at)}` : ""}</p></div>)}{!health.history?.incidents.length && <p className="text-sm text-muted-foreground">No incidents recorded. The system is currently quiet.</p>}</div></div></CardContent></Card>}
    {health && <Card><CardHeader><CardTitle>Health details</CardTitle><CardDescription>Read-only diagnostics. SMTP diagnostics verify the connection but never send an email.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Last checked</p><p className="mt-1 text-sm font-medium">{dateLabel(health.summary.checkedAt)}</p></div><div><p className="text-xs text-muted-foreground">Failure window</p><p className="mt-1 text-sm font-medium">{health.summary.failureCount24h} failed events in the last 24 hours</p></div><div><p className="text-xs text-muted-foreground">Auto-refresh</p><p className="mt-1 flex items-center gap-1 text-sm font-medium"><IconRefresh className="size-3.5" />Every 60 seconds</p></div></CardContent></Card>}
  </main>;
}
