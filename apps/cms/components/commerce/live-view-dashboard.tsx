"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { IconActivity, IconChartLine, IconClock, IconRefresh, IconShoppingBag, IconUsers } from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@zerocraft/components/ui/chart";
import { Button } from "@zerocraft/components/ui/studio-controls";

type LiveLocation = { city: string; country: string; activeUsers: number };
type LiveData = { activeUsers: number; eventCount: number; orders?: number; locations: LiveLocation[]; connected: boolean };

const fallbackTrend = [18, 24, 21, 33, 29, 42, 38, 48, 44, 56, 51, 64];
const trendConfig = { visitors: { label: "Visitors", color: "var(--chart-1)" } } satisfies ChartConfig;
const sourceConfig = { visitors: { label: "Visitors", color: "var(--chart-2)" } } satisfies ChartConfig;
const behaviorConfig = { value: { label: "Visitors", color: "var(--chart-3)" } } satisfies ChartConfig;

const metricItems: Array<{ label: string; detail: string; icon: ComponentType<{ className?: string }>; tone: string }> = [
  { label: "Visitors right now", detail: "Active sessions", icon: IconUsers, tone: "text-chart-1 bg-chart-1/10" },
  { label: "Total sales", detail: "Today so far", icon: IconChartLine, tone: "text-chart-2 bg-chart-2/10" },
  { label: "Events", detail: "Realtime events", icon: IconActivity, tone: "text-chart-3 bg-chart-3/10" },
  { label: "Orders", detail: "Completed orders", icon: IconShoppingBag, tone: "text-chart-4 bg-chart-4/10" },
];

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: ComponentType<{ className?: string }>; tone: string }) {
  return <Card><CardHeader className="flex-row items-center justify-between space-y-0 pb-2"><CardDescription>{label}</CardDescription><span className={`grid size-8 place-items-center rounded-lg ${tone}`}><Icon className="size-4" /></span></CardHeader><CardContent><p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <Card><CardHeader className="flex-row items-start justify-between gap-3 space-y-0"><div><CardTitle className="text-sm">{title}</CardTitle>{subtitle && <CardDescription className="mt-1">{subtitle}</CardDescription>}</div>{action}</CardHeader><CardContent>{children}</CardContent></Card>;
}

export default function LiveViewDashboard() {
  const [data, setData] = useState<LiveData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/analytics/live", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    setData(response.ok ? payload : { activeUsers: 0, eventCount: 0, orders: 0, locations: [], connected: false });
  };

  useEffect(() => {
    let active = true;
    const run = async () => { if (!active) return; await load(); };
    void run();
    const timer = window.setInterval(() => void run(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const locations = data?.locations || [];
  const totalVisitors = locations.reduce((sum, item) => sum + item.activeUsers, 0);
  const trend = useMemo(() => { const cities = locations.slice(0, 8).map((item) => item.activeUsers); return cities.length > 1 ? [...cities, ...fallbackTrend.slice(0, 12 - cities.length)] : fallbackTrend; }, [locations]);
  const trendData = trend.map((visitors, index) => ({ time: `${30 - index * 3}m`, visitors }));
  const cityData = (locations.length ? locations.slice(0, 6) : [{ city: "India", activeUsers: 0 }]).map((item) => ({ city: item.city, visitors: item.activeUsers }));
  const sources = [{ source: "Direct", visitors: 46 }, { source: "Search", visitors: 31 }, { source: "Social", visitors: 23 }];
  const behavior = [{ stage: "Carts", value: Math.max(0, totalVisitors - 1) }, { stage: "Checkout", value: Math.max(0, Math.floor(totalVisitors / 2)) }, { stage: "Purchased", value: data?.orders ?? 0 }];
  const connected = Boolean(data?.connected);

  return <main className="min-h-full bg-muted p-4 text-foreground md:p-6"><div className="mx-auto flex max-w-[1440px] flex-col gap-5"><header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><p className="text-xs font-medium text-muted-foreground">Analytics</p><Badge variant="secondary" className="gap-1 rounded-full text-[10px]"><span className={`size-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground"}`} />{connected ? "Live" : "Demo"}</Badge></div><h1 className="mt-1 text-2xl font-semibold tracking-tight">Live View</h1><p className="mt-1 text-sm text-muted-foreground">Monitor visitors, activity, and commerce signals in real time.</p></div><Button variant="outline" className="h-9 rounded-lg" onClick={() => void refresh()}><IconRefresh className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh</Button></header><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metricItems.map((item, index) => <MetricCard key={item.label} {...item} value={[data?.activeUsers ?? 0, "₹0", data?.eventCount ?? 0, data?.orders ?? 0][index]} />)}</div><div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)]"><Panel title="Visitors over time" subtitle="Realtime activity across the last 30 minutes" action={<Badge variant="outline" className="rounded-full text-[10px]">Updates every 30s</Badge>}><div className="mb-2 flex items-end justify-between"><div><p className="text-3xl font-semibold tabular-nums">{data?.activeUsers ?? 0}</p><p className="text-xs text-muted-foreground">visitors right now</p></div></div><ChartContainer config={trendConfig} className="h-[220px] w-full"><AreaChart data={trendData} margin={{ top: 12, right: 6, left: -24, bottom: 0 }} accessibilityLayer><defs><linearGradient id="liveVisitorsFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-visitors)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--color-visitors)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} /><YAxis hide /><ChartTooltip content={<ChartTooltipContent indicator="line" />} /><Area dataKey="visitors" type="monotone" stroke="var(--color-visitors)" strokeWidth={2} fill="url(#liveVisitorsFill)" dot={false} /></AreaChart></ChartContainer></Panel><Panel title="Customer behavior" subtitle="Current funnel health"><ChartContainer config={behaviorConfig} className="h-[220px] w-full"><BarChart data={behavior} layout="vertical" margin={{ top: 6, right: 12, left: 4, bottom: 0 }} accessibilityLayer><CartesianGrid horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} width={58} /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="value" fill="var(--color-value)" radius={5} barSize={18} /></BarChart></ChartContainer></Panel></div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Sessions by location" subtitle="Top active locations"><ChartContainer config={sourceConfig} className="h-[240px] w-full"><BarChart data={cityData} layout="vertical" margin={{ top: 8, right: 10, left: 0, bottom: 0 }} accessibilityLayer><CartesianGrid horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="city" tickLine={false} axisLine={false} width={82} /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="visitors" fill="var(--color-visitors)" radius={5} barSize={18} /></BarChart></ChartContainer></Panel><Panel title="Traffic sources" subtitle="Where visitors came from"><ChartContainer config={sourceConfig} className="h-[240px] w-full"><BarChart data={sources} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="source" tickLine={false} axisLine={false} /><YAxis hide /><ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /><Bar dataKey="visitors" fill="var(--color-visitors)" radius={[5, 5, 0, 0]} barSize={38} /></BarChart></ChartContainer></Panel></div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Sales performance" subtitle="Commerce snapshot"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Conversion rate</p><p className="mt-2 text-xl font-semibold">0.0%</p></div><div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Avg. order value</p><p className="mt-2 text-xl font-semibold">₹0</p></div><div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Live events</p><p className="mt-2 text-xl font-semibold">{data?.eventCount ?? 0}</p></div></div><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><IconClock className="size-3.5" /> Last refreshed just now</p></Panel><Panel title="Realtime status" subtitle="Analytics connection"><div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4"><span className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} /><div><p className="text-sm font-medium">{connected ? "GA4 realtime connected" : "Demo data active"}</p><p className="mt-1 text-xs text-muted-foreground">{connected ? "Live events will refresh automatically." : "Connect Analytics when you are ready for live metrics."}</p></div></div></Panel></div></div></main>;
}
