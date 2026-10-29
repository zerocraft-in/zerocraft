"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { IconActivity, IconChartBar, IconClock, IconRefresh, IconShoppingBag, IconUsers } from "@tabler/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { useStudioOverview, type StudioOverview } from "../use-studio-overview";

type LiveData = { activeUsers: number; eventCount: number; orders?: number; locations: { city: string; country: string; activeUsers: number }[]; connected: boolean; error?: string };
const sourceConfig = { records: { label: "Records", color: "var(--chart-1)" } } satisfies ChartConfig;
const locationConfig = { visitors: { label: "Visitors", color: "var(--chart-2)" } } satisfies ChartConfig;

const formatDate = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));

function Metric({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: typeof IconActivity; tone: string }) {
  return <Card><CardHeader className="flex-row items-center justify-between space-y-0 pb-2"><CardDescription>{label}</CardDescription><span className={`grid size-8 place-items-center rounded-lg ${tone}`}><Icon className="size-4" /></span></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

function OverviewSkeleton() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Card key={index} className="h-32 animate-pulse bg-muted/40" />)}</div>;
}

function SourceChart({ data }: { data: StudioOverview | null }) {
  const rows = (data?.tables ?? []).filter((table) => table.available && table.count !== null).map((table) => ({ source: table.label.replace(/^Store /, ""), records: table.count ?? 0 })).slice(0, 8);
  if (!rows.length) return <div className="grid h-[260px] place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">No connected sources are available.</div>;
  return <ChartContainer config={sourceConfig} className="h-[260px] w-full"><BarChart data={rows} margin={{ top: 8, right: 10, left: -22, bottom: 0 }} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="source" tickLine={false} axisLine={false} tickMargin={8} interval={0} angle={-22} textAnchor="end" height={52} /><YAxis hide /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="records" fill="var(--color-records)" radius={[5, 5, 0, 0]} maxBarSize={48} /></BarChart></ChartContainer>;
}

function LocationChart({ data }: { data: LiveData | null }) {
  const rows = (data?.locations ?? []).slice(0, 7).map((location) => ({ city: location.city, visitors: location.activeUsers }));
  if (!rows.length) return <div className="grid h-[260px] place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">No live location data is available.</div>;
  return <ChartContainer config={locationConfig} className="h-[260px] w-full"><BarChart data={rows} layout="vertical" margin={{ top: 8, right: 10, left: 0, bottom: 0 }} accessibilityLayer><CartesianGrid horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="city" tickLine={false} axisLine={false} width={84} /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="visitors" fill="var(--color-visitors)" radius={5} barSize={18} /></BarChart></ChartContainer>;
}

export default function AnalyticsRoute() {
  const { data, loading, error, refresh } = useStudioOverview();
  const [live, setLive] = useState<LiveData | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  const loadLive = async () => {
    setLiveLoading(true);
    try {
      const response = await fetch("/api/studio/analytics/live", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Realtime analytics is unavailable.");
      setLive(payload as LiveData);
      setLiveError(null);
    } catch (cause) {
      setLiveError(cause instanceof Error ? cause.message : "Realtime analytics is unavailable.");
      setLive(null);
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => {
    void loadLive();
    const timer = window.setInterval(() => void loadLive(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshAll = async () => { await Promise.all([refresh(), loadLive()]); };
  const availableTables = data?.tables.filter((table) => table.available) ?? [];
  const coverage = data?.tables.length ? Math.round((availableTables.length / data.tables.length) * 100) : 0;
  const totalVisitors = live?.locations.reduce((sum, location) => sum + location.activeUsers, 0) ?? 0;
  const latestActivity = useMemo(() => data?.recent?.slice(0, 5) ?? [], [data?.recent]);

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12"><header className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs text-muted-foreground"><IconActivity className="size-4" /> Insights</div><h1 className="mt-1 text-3xl font-semibold tracking-tight">Analytics</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">A live view of workspace records, commerce activity, and connected visitor signals.</p></div><div className="flex items-center gap-2"><Badge variant="outline" className="hidden gap-1.5 rounded-full sm:inline-flex"><span className={`size-1.5 rounded-full ${live?.connected ? "bg-emerald-500" : "bg-muted-foreground"}`} />{live?.connected ? "Realtime connected" : "Overview mode"}</Badge><Button variant="outline" onClick={() => void refreshAll()} disabled={loading || liveLoading}><IconRefresh className={loading || liveLoading ? "size-3.5 animate-spin" : "size-3.5"} /> Refresh</Button></div></header>{error && <Alert variant="destructive"><AlertTitle>Analytics data is unavailable</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}{liveError && <Alert><AlertTitle>Realtime data is unavailable</AlertTitle><AlertDescription>{liveError}</AlertDescription></Alert>}{loading && !data ? <OverviewSkeleton /> : <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Visitors right now" value={live?.activeUsers ?? "—"} detail={live?.connected ? "GA4 realtime visitors" : "No realtime connection"} icon={IconUsers} tone="bg-chart-1/10 text-chart-1" /><Metric label="Total orders" value={data?.commerce.totalOrders ?? "—"} detail="Connected commerce records" icon={IconShoppingBag} tone="bg-chart-2/10 text-chart-2" /><Metric label="Live events" value={live?.eventCount ?? "—"} detail="Realtime event count" icon={IconActivity} tone="bg-chart-3/10 text-chart-3" /><Metric label="Data coverage" value={`${coverage}%`} detail={`${availableTables.length}/${data?.tables.length ?? 0} sources connected`} icon={IconChartBar} tone="bg-chart-4/10 text-chart-4" /></section>}<section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]"><Card><CardHeader><CardTitle className="text-base">Records by source</CardTitle><CardDescription>Counts returned by the connected studio data sources.</CardDescription></CardHeader><CardContent><SourceChart data={data} /></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Connection coverage</CardTitle><CardDescription>Availability of the sources used in this dashboard.</CardDescription></CardHeader><CardContent><div className="flex items-end justify-between"><div><p className="text-4xl font-semibold tabular-nums">{coverage}%</p><p className="mt-1 text-sm text-muted-foreground">{availableTables.length} of {data?.tables.length ?? 0} sources ready</p></div><IconChartBar className="size-7 text-chart-4" /></div><Progress value={coverage} className="mt-6" /><div className="mt-6 space-y-3">{(data?.tables ?? []).slice(0, 5).map((table) => <div key={table.name} className="flex items-center justify-between text-sm"><span className="truncate text-muted-foreground">{table.label}</span><Badge variant={table.available ? "secondary" : "outline"} className="ml-3 text-[10px]">{table.available ? "Ready" : "Unavailable"}</Badge></div>)}</div></CardContent></Card></section><section className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Live visitors by location</CardTitle><CardDescription>{live?.connected ? "Current realtime locations" : "Connect Analytics to populate live locations"}</CardDescription></div><Badge variant="outline" className="rounded-full">{totalVisitors} visitors</Badge></div></CardHeader><CardContent><LocationChart data={live} /></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Commerce performance</CardTitle><CardDescription>Live totals from the connected orders backend.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Total orders</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data?.commerce.totalOrders ?? "—"}</p></div><div className="rounded-lg border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data?.commerce.pendingOrders ?? "—"}</p></div><div className="rounded-lg border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Fulfilled</p><p className="mt-2 text-2xl font-semibold tabular-nums">{data?.commerce.fulfilledOrders ?? "—"}</p></div><div className="sm:col-span-3 flex items-center gap-2 pt-1 text-xs text-muted-foreground"><IconClock className="size-3.5" /> Updates every 30 seconds</div></CardContent></Card></section><Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Recent activity</CardTitle><CardDescription>Latest backend records across the workspace.</CardDescription></div><Badge variant="outline">{latestActivity.length} updates</Badge></div></CardHeader><CardContent>{latestActivity.length ? <div className="divide-y">{latestActivity.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"><IconActivity className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="truncate text-xs text-muted-foreground">{item.detail}</p></div><span className="text-xs text-muted-foreground">{formatDate(item.date)}</span></div>)}</div> : <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No recent activity yet.</div>}</CardContent></Card></main>;
}
