"use client";

import { useCallback, useEffect, useState } from "react";
import { IconBolt, IconCircleCheck, IconClock, IconRefresh, IconX } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Event = { id: string; event_type: string; status: string; attempts: number; last_error: string | null; created_at: string; delivered_at: string | null };
type Status = { configured: boolean; schedulerConfigured: boolean; aiConfigured: boolean; queueAvailable: boolean; error: string | null; events: Event[]; counts: { pending: number | null; failed: number | null; delivered: number | null } };
const dateTime = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));

export default function AutomationsPage() {
  const [data, setData] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/studio/automations", { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load automations."); setData(result); setMessage(null); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not load automations."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function run() {
    setRunning(true); setMessage(null);
    try { const response = await fetch("/api/studio/automations", { method: "POST", headers: { "Content-Type": "application/json" } }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Dispatch failed."); await load(); setMessage(`${result.processed} events processed: ${result.delivered} accepted by webhook, ${result.failed} failed.`); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Dispatch failed."); }
    finally { setRunning(false); }
  }
  const signals = [
    { label: "Queued", value: data?.counts.pending, icon: IconClock, helper: "Waiting for delivery" },
    { label: "Delivered", value: data?.counts.delivered, icon: IconCircleCheck, helper: "Accepted by webhook" },
    { label: "Failed", value: data?.counts.failed, icon: IconX, helper: "Eligible for retry" },
  ];
  const pipeline = [
    { label: "Database event queue", ready: data?.queueAvailable, note: "Order and appointment inserts" },
    { label: "HTTPS webhook", ready: data?.configured, note: "STUDIO_AUTOMATION_WEBHOOK_URL" },
    { label: "Scheduled worker", ready: data?.schedulerConfigured, note: "CRON_SECRET + external scheduler" },
    { label: "AI drafting", ready: data?.aiConfigured, note: "Human-reviewed drafts only" },
  ];
  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Studio / Operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Automations</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">See how order and appointment events move through the queue, and retry pending work when the webhook is ready.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button></header>
    {message && <Alert><AlertTitle>Queue update</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
    {data?.error && <Alert variant="destructive"><AlertTitle>Automation setup needs attention</AlertTitle><AlertDescription>{data.error}</AlertDescription></Alert>}
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Automation queue counts">{signals.map(({ label, value, icon: Icon, helper }) => <Card key={label} size="sm"><CardHeader className="!flex items-start justify-between"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-3xl tabular-nums">{loading ? "—" : value ?? "—"}</CardTitle></div><span className="rounded-lg bg-muted p-2 text-muted-foreground"><Icon size={18} /></span></CardHeader><CardContent className="text-xs text-muted-foreground">{helper}</CardContent></Card>)}</section>
    <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><span className="rounded-lg bg-primary/10 p-2 text-primary"><IconBolt size={18} /></span>Dispatch pipeline</CardTitle><CardDescription>Check each connection before dispatching queued events.</CardDescription></CardHeader><CardContent><div className="divide-y">{pipeline.map((step) => <div key={step.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="text-sm font-medium">{step.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{step.note}</p></div><Badge variant={step.ready ? "default" : "secondary"}>{loading ? "Checking" : step.ready ? "Ready" : "Setup"}</Badge></div>)}</div><Button className="mt-5" disabled={running || !data?.queueAvailable || !data?.configured} onClick={() => void run()}>{running ? "Dispatching…" : "Run queue now"}</Button><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Webhook acceptance is recorded here; confirm downstream delivery with your provider. Automatic dispatch needs a scheduler calling this endpoint with <code>CRON_SECRET</code>.</p></CardContent></Card>
      <Card><CardHeader><CardTitle>How events move</CardTitle><CardDescription>Four steps from a new record to a delivery attempt.</CardDescription></CardHeader><CardContent><ol className="space-y-4">{[["01", "Record arrives", "An order request or appointment is saved."], ["02", "Event is queued", "A database trigger records a unique event."], ["03", "Worker delivers", "A small payload is sent with an idempotency key."], ["04", "Failures retry", "Attempts back off progressively, up to five tries."]].map(([number, title, detail]) => <li key={number} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium tabular-nums">{number}</span><span><strong className="text-sm font-medium">{title}</strong><small className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{detail}</small></span></li>)}</ol></CardContent></Card>
    </div>
    <Card className="flex flex-1 flex-col"><CardHeader className="border-b"><CardTitle>Recent events</CardTitle><CardDescription>Latest queue entries, including delivery attempts and errors.</CardDescription></CardHeader><CardContent className="flex-1 p-0"><div className="divide-y">{data?.events.length ? data.events.map((item) => <article key={item.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_110px_100px_160px] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.event_type === "store_order_created" ? "Store order created" : "Appointment created"}</p><p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{item.id}</p>{item.last_error && <p className="mt-1 text-xs text-destructive">{item.last_error}</p>}</div><Badge variant={item.status === "failed" ? "destructive" : item.status === "delivered" ? "default" : "secondary"} className="w-fit capitalize">{item.status}</Badge><span className="text-xs text-muted-foreground">{item.attempts} attempts</span><time dateTime={item.created_at} className="text-xs text-muted-foreground">{dateTime(item.created_at)}</time></article>) : <p className="flex h-full items-center justify-center px-5 py-10 text-center text-sm text-muted-foreground">{loading ? "Loading events…" : data?.queueAvailable ? "No events recorded yet." : "The event queue is not available."}</p>}</div></CardContent></Card>
  </main>;
}
