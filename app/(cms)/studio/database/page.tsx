"use client";

import Link from "next/link";
import { IconArrowUpRight, IconDatabase, IconRefresh } from "@tabler/icons-react";
import { useStudioOverview } from "../use-studio-overview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const dateTime = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));

export default function DatabasePage() {
  const { data, loading, error, refresh } = useStudioOverview();
  const connected = data?.tables.filter((table) => table.available).length ?? 0;
  const records = data?.tables.reduce((sum, table) => sum + (table.count ?? 0), 0) ?? 0;
  const total = data?.tables.length ?? 0;
  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Studio / Infrastructure</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Database overview</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Live table counts and latest activity, limited to data this studio account can access.</p></div><Button variant="outline" onClick={() => void refresh()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button></header>
    {error && <Alert variant="destructive"><AlertTitle>Could not load database overview</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Database health summary">
      {[{ title: "Connected tables", value: loading ? "—" : `${connected} / ${total}`, hint: "Sources responding", icon: IconDatabase }, { title: "Visible records", value: loading ? "—" : records.toLocaleString("en-US"), hint: "Accessible table counts", icon: IconArrowUpRight }, { title: "Connection health", value: loading ? "Checking…" : connected === total ? "All sources healthy" : "Needs attention", hint: data ? `Checked ${dateTime(data.checkedAt)}` : "Waiting for first check", icon: IconRefresh }].map(({ title, value, hint, icon: Icon }) => <Card key={title} size="sm"><CardHeader className="!flex items-start justify-between"><div><CardDescription>{title}</CardDescription><CardTitle className="mt-2 text-2xl tracking-tight">{value}</CardTitle></div><span className="rounded-lg bg-muted p-2 text-muted-foreground"><Icon size={18} /></span></CardHeader><CardContent className="text-xs text-muted-foreground">{hint}</CardContent></Card>)}
    </section>
    <Card className="flex flex-1 flex-col"><CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Studio tables</CardTitle><CardDescription className="mt-1">Counts follow the signed-in account’s row-level access.</CardDescription></div><Badge variant="secondary">Public schema</Badge></div></CardHeader><CardContent className="flex-1 p-0"><div className="divide-y">{data?.tables.map((table) => <article key={table.name} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_100px_minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="text-sm font-medium">{table.label}</p><code className="text-xs text-muted-foreground">public.{table.name}</code></div><div><strong className="text-lg tabular-nums">{table.available ? table.count ?? 0 : "—"}</strong><p className="text-xs text-muted-foreground">records</p></div><div className="text-xs text-muted-foreground">{table.available ? table.lastActivity ? `Latest ${dateTime(table.lastActivity)}` : "No records yet" : table.reason}</div><Button render={<Link href={table.href} />} nativeButton={false} variant="outline" size="sm">Open area<IconArrowUpRight /></Button></article>)}{loading && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Reading live table counts…</p>}</div></CardContent></Card>
    <p className="text-xs leading-relaxed text-muted-foreground">Unavailable sources can indicate a missing migration or access policy. Storage size, query performance, and infrastructure metrics are not exposed in this scoped view.</p>
  </main>;
}
