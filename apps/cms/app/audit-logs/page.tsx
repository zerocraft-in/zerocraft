"use client";

import { useCallback, useEffect, useState } from "react";
import { IconRefresh, IconShieldCheck } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/studio/page-state";

type AuditLog = { id: string; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: string };

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/audit-logs?pageSize=100`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Audit logs could not be loaded.");
      setLogs(payload.logs || []); setTotal(payload.total || 0); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Audit logs could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = logs.filter((log) => [log.action, log.entity_type, log.entity_id || "", JSON.stringify(log.metadata)].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Audit log</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">A tamper-resistant activity trail for Studio operations and commerce changes.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button></header>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    <Card><CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><IconShieldCheck className="size-5" />Activity history</CardTitle><CardDescription className="mt-1">{total.toLocaleString()} recorded events</CardDescription></div><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions or entities" className="w-full sm:w-72" /></CardHeader><CardContent className="p-0"><div className="overflow-x-auto">{loading ? <PageState kind="loading" title="Loading audit history" description="Fetching the latest Studio activity events." /> : !visible.length ? <PageState kind="empty" title="No audit events" description="Activity will appear here as your team changes workspace data." /> : <table className="w-full min-w-[760px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Event</th><th className="px-5 py-3 font-medium">Entity</th><th className="px-5 py-3 font-medium">Actor</th><th className="px-5 py-3 font-medium">When</th><th className="px-5 py-3 font-medium">Metadata</th></tr></thead><tbody>{visible.map((log) => <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-5 py-4"><Badge variant="secondary">{log.action}</Badge></td><td className="px-5 py-4"><strong className="block">{log.entity_type}</strong><span className="text-xs text-muted-foreground">{log.entity_id || "No entity id"}</span></td><td className="px-5 py-4 text-xs text-muted-foreground">{log.actor_id || "System"}</td><td className="px-5 py-4 whitespace-nowrap text-xs text-muted-foreground">{dateLabel(log.created_at)}</td><td className="max-w-[260px] truncate px-5 py-4 font-mono text-[11px] text-muted-foreground">{JSON.stringify(log.metadata)}</td></tr>)}</tbody></table>}</div></CardContent></Card>
  </main>;
}
