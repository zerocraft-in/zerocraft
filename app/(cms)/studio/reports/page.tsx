"use client";

import Link from "next/link";
import { IconArrowUpRight, IconRefresh } from "@tabler/icons-react";
import { useStudioOverview } from "../use-studio-overview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
const moneyLabel = (amount: number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: currency === "INR" ? 0 : 2 }).format(amount);

export default function StudioReportsPage() {
  const { data, loading, error, refresh } = useStudioOverview();
  const orderTable = data?.tables.find((table) => table.name === "store_orders");
  const visible = data?.tables.filter((table) => table.available) ?? [];
  const tables = (data?.tables ?? []).filter((table) => table.name !== "notifications");
  const coverage = data?.tables.length ? Math.round(100 * visible.length / data.tables.length) : 0;
  const paidEntries = Object.entries(data?.commerce.paidByCurrency ?? {});
  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Studio / Analytics</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Reports</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">A live snapshot of records available to this studio account. Refresh to update the counts.</p></div><Button variant="outline" onClick={() => void refresh()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button></header>
    {error && <Alert variant="destructive"><AlertTitle>Report data is unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {data && data.tables.some((table) => !table.available) && <Alert><AlertTitle>Some data sources are unavailable</AlertTitle><AlertDescription>Unavailable sources are excluded from the totals. <Link href="/studio/database" className="font-medium underline underline-offset-4">Inspect database connections</Link>.</AlertDescription></Alert>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Record totals">{tables.map((table) => <Link href={table.href} key={table.name} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card size="sm" className="h-full transition-colors hover:bg-muted/40"><CardHeader className="flex-row items-start justify-between"><div><CardDescription>{table.label}</CardDescription><CardTitle className="mt-3 text-3xl tabular-nums">{loading ? "—" : table.available ? table.count : "Unavailable"}</CardTitle></div><IconArrowUpRight size={16} className="text-muted-foreground" /></CardHeader><CardContent className="text-xs text-muted-foreground">{table.available ? table.lastActivity ? `Latest activity ${dateLabel(table.lastActivity)}` : "No records yet" : table.reason}</CardContent></Card></Link>)}{loading && !data && Array.from({ length: 6 }, (_, index) => <Card key={index} size="sm" className="h-32 animate-pulse bg-muted/50" />)}</section>
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Commerce report">
      <Card><CardHeader><CardDescription>Commerce / Revenue</CardDescription><CardTitle>Order performance</CardTitle></CardHeader><CardContent>{!data?.commerce.available ? <p className="text-sm text-muted-foreground">Revenue reporting is unavailable until the order summary connection is ready.</p> : <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Total orders</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.commerce.totalOrders ?? "—"}</p></div><div className="rounded-lg bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.commerce.pendingOrders ?? "—"}</p></div><div className="rounded-lg bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Fulfilled</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data.commerce.fulfilledOrders ?? "—"}</p></div></div>}</CardContent></Card>
      <Card><CardHeader><CardDescription>Commerce / Paid value</CardDescription><CardTitle>By currency</CardTitle></CardHeader><CardContent>{paidEntries.length ? <div className="space-y-3">{paidEntries.map(([currency, amount]) => <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3" key={currency}><span className="text-sm text-muted-foreground">{currency}</span><strong className="tabular-nums">{moneyLabel(Number(amount), currency)}</strong></div>)}</div> : <p className="text-sm text-muted-foreground">No paid order value is available yet.</p>}</CardContent></Card>
    </section>
    <div className="grid flex-1 gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardDescription>Commerce / Orders</CardDescription><CardTitle>Store activity</CardTitle></CardHeader><CardContent>{orderTable?.available ? <><p className="text-sm text-muted-foreground">The order table is connected. Review fulfillment and payment status in the orders workspace.</p><Button render={<Link href="/studio/orders" />} nativeButton={false} className="mt-5">Review orders<IconArrowUpRight /></Button></> : <><p className="text-sm text-muted-foreground">Order reporting is waiting for the store order table and its access policy.</p><p className="mt-4 rounded-lg bg-muted p-4 text-xs leading-relaxed text-muted-foreground">Apply <code>supabase/admin-mvp.sql</code> to enable order records. Revenue is not estimated while the source is unavailable.</p></>}</CardContent></Card>
      <Card><CardHeader><CardDescription>Data / Quality</CardDescription><CardTitle>Connection coverage</CardTitle></CardHeader><CardContent><div className="mb-3 flex items-baseline gap-2"><strong className="text-3xl tabular-nums">{loading ? "—" : `${visible.length} / ${data?.tables.length ?? 0}`}</strong><span className="text-sm text-muted-foreground">sources connected</span></div><Progress value={coverage} aria-label="Database connection coverage" /><p className="mt-4 text-xs leading-relaxed text-muted-foreground">{coverage}% of the listed sources are available. Counts follow the signed-in account’s row-level access; database size and query performance need a separate monitoring connection.</p></CardContent></Card>
    </div>
    <p className="text-xs text-muted-foreground">{data ? `Updated ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(data.checkedAt))} UTC` : "Waiting for live data"}</p>
  </main>;
}
