"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconCheck, IconHeartbeat, IconPlayerPlay, IconRefresh, IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CheckStatus = "healthy" | "warning" | "failed" | "unavailable";
type HealthCheck = { key: string; label: string; status: CheckStatus; message: string; latencyMs?: number; checkedAt: string; meta?: Record<string, unknown> };
type Health = { overall: "healthy" | "degraded" | "critical"; checks: HealthCheck[]; summary: { checkedAt: string; failureCount24h: number } };

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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/studio/system-health", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "System health could not be loaded.");
      setHealth(payload); setError("");
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

  const healthyCount = useMemo(() => health?.checks.filter((item) => item.status === "healthy").length || 0, [health]);

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">System / Reliability</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight"><IconHeartbeat className="size-7" />System health</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Monitor the services, database, email, storage, and scheduled jobs behind ZeroCraft.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button><Button onClick={() => void runDiagnostics()} disabled={diagnosing}><IconPlayerPlay />{diagnosing ? "Checking…" : "Run diagnostics"}</Button></div></header>
    {message && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{message}</div>}
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    {health && <Card className={health.overall === "healthy" ? "border-emerald-500/30" : health.overall === "critical" ? "border-destructive/40" : "border-amber-500/40"}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-2xl ${health.overall === "healthy" ? "bg-emerald-500/10" : health.overall === "critical" ? "bg-destructive/10" : "bg-amber-500/10"}`}><StatusIcon status={health.overall === "healthy" ? "healthy" : health.overall === "critical" ? "failed" : "warning"} /></span><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Overall status</p><p className="mt-1 text-xl font-semibold capitalize">{health.overall}</p></div></div><div className="flex gap-6 text-sm"><span><strong>{healthyCount}</strong> healthy</span><span><strong>{health.checks.length - healthyCount}</strong> need attention</span><span><strong>{health.summary.failureCount24h}</strong> failures / 24h</span></div></CardContent></Card>}
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{health?.checks.map((item) => <Card key={item.key} className="min-h-44"><CardHeader className="flex-row items-start justify-between gap-3 space-y-0"><div className="flex items-start gap-3"><span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-muted"><StatusIcon status={item.status} /></span><div><CardTitle className="text-base">{item.label}</CardTitle><CardDescription className="mt-1">{item.message}</CardDescription></div></div><Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge></CardHeader><CardContent className="flex items-center justify-between pt-0 text-xs text-muted-foreground"><span>Checked {dateLabel(item.checkedAt)}</span><span>{item.latencyMs ?? "—"} ms</span></CardContent></Card>)}</section>
    {!health && loading && <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">Loading system health…</div>}
    {health && <Card><CardHeader><CardTitle>Health details</CardTitle><CardDescription>Read-only diagnostics. SMTP diagnostics verify the connection but never send an email.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Last checked</p><p className="mt-1 text-sm font-medium">{dateLabel(health.summary.checkedAt)}</p></div><div><p className="text-xs text-muted-foreground">Failure window</p><p className="mt-1 text-sm font-medium">{health.summary.failureCount24h} failed events in the last 24 hours</p></div><div><p className="text-xs text-muted-foreground">Auto-refresh</p><p className="mt-1 flex items-center gap-1 text-sm font-medium"><IconRefresh className="size-3.5" />Every 60 seconds</p></div></CardContent></Card>}
  </main>;
}
