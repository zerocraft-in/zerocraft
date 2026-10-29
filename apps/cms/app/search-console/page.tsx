"use client";

import { useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconChartLine, IconClick, IconExternalLink, IconRefresh, IconSearch, IconSitemap } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };
type Dashboard = { checkedAt: string; siteUrl: string; period: { startDate: string; endDate: string }; queries: Row[]; daily: Row[]; sitemaps: Array<{ path?: string; lastDownloaded?: string; isPending?: boolean; warnings?: string; errors?: string }> };

const integer = new Intl.NumberFormat("en-IN");
const percentage = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function SearchConsolePage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(28);
  const [connection, setConnection] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/search-console?days=${days}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Search Console data could not be loaded.");
      setData(payload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search Console data could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    setConnection(new URLSearchParams(window.location.search).get("connection"));
  }, []);

  useEffect(() => { void load(); }, [days]);

  const totals = useMemo(() => (data?.daily || []).reduce((total, row) => ({ clicks: total.clicks + (row.clicks || 0), impressions: total.impressions + (row.impressions || 0) }), { clicks: 0, impressions: 0 }), [data]);
  const averagePosition = useMemo(() => {
    const rows = data?.daily || [];
    if (!rows.length) return 0;
    return rows.reduce((sum, row) => sum + (row.position || 0), 0) / rows.length;
  }, [data]);
  const peak = Math.max(...(data?.daily || []).map((row) => row.clicks || 0), 1);

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Insights / Search Console</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight"><IconSearch className="size-7" />Search performance</h1><p className="mt-2 text-sm text-muted-foreground">Read-only search visibility, indexing and sitemap health for Zerocraft Studio.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button><Button variant="outline" onClick={() => setDays(days === 28 ? 90 : 28)}>{days === 28 ? "Last 90 days" : "Last 28 days"}</Button><Button variant="outline" render={<a href="https://search.google.com/search-console?resource_id=https://zerocraft.in/" target="_blank" rel="noreferrer" />} nativeButton={false}><IconExternalLink />Open Google</Button></div>
    </header>
    {connection && connection !== "connected" && <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">Google Search Console connection was not completed ({connection}). Check the OAuth setup and try again.</div>}
    {connection === "connected" && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">Google Search Console connected. Live data is now available.</div>}
    {error && <Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex items-start gap-3"><IconAlertTriangle className="mt-0.5 size-5 text-amber-500" /><div><p className="font-medium">Connect Search Console to load live data</p><p className="mt-1 text-sm text-muted-foreground">{error}</p></div></div><Button render={<a href="/api/studio/search-console/oauth" />} nativeButton={false}>Connect with Google</Button></CardContent></Card>}
    {data && <><div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm"><span className="font-medium">Property:</span> <code className="ml-1 rounded bg-background px-2 py-1 text-xs">{data.siteUrl}</code><span className="ml-3 text-muted-foreground">{data.period.startDate} → {data.period.endDate}</span></div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><CardHeader className="pb-2"><CardDescription className="flex items-center justify-between">Total clicks<IconClick className="size-4 text-primary" /></CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{integer.format(Math.round(totals.clicks))}</p><p className="mt-1 text-xs text-muted-foreground">Organic search visits</p></CardContent></Card><Card><CardHeader className="pb-2"><CardDescription className="flex items-center justify-between">Impressions<IconChartLine className="size-4 text-primary" /></CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{integer.format(Math.round(totals.impressions))}</p><p className="mt-1 text-xs text-muted-foreground">Times shown in search</p></CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Average CTR</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{totals.impressions ? percentage(totals.clicks / totals.impressions) : "0.0%"}</p><p className="mt-1 text-xs text-muted-foreground">Clicks divided by impressions</p></CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Average position</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{averagePosition ? averagePosition.toFixed(1) : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Lower is better</p></CardContent></Card></section>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"><Card><CardHeader><CardTitle>Clicks by day</CardTitle><CardDescription>Organic clicks across the selected period.</CardDescription></CardHeader><CardContent className="space-y-3">{data.daily.length ? data.daily.map((row) => <div key={row.keys?.[0]} className="flex items-center gap-3 text-xs"><span className="w-24 shrink-0 text-muted-foreground">{row.keys?.[0]}</span><Progress value={((row.clicks || 0) / peak) * 100} className="h-2" /><strong className="w-12 text-right">{integer.format(Math.round(row.clicks || 0))}</strong></div>) : <p className="text-sm text-muted-foreground">No Search Console rows returned for this period.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><IconSitemap className="size-5 text-primary" />Sitemaps</CardTitle><CardDescription>Submitted sitemap health.</CardDescription></CardHeader><CardContent className="space-y-3">{data.sitemaps.length ? data.sitemaps.map((sitemap) => <div key={sitemap.path} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-3"><p className="break-all text-xs font-medium">{sitemap.path}</p><Badge variant="outline" className={sitemap.errors ? "border-destructive/30 text-destructive" : "border-emerald-500/30 text-emerald-600"}>{sitemap.errors ? "Errors" : sitemap.isPending ? "Pending" : "Healthy"}</Badge></div><p className="mt-2 text-[11px] text-muted-foreground">Last downloaded: {sitemap.lastDownloaded ? new Date(sitemap.lastDownloaded).toLocaleString("en-IN") : "Not reported"}</p></div>) : <p className="text-sm text-muted-foreground">No submitted sitemaps found.</p>}</CardContent></Card></div>
      <Card><CardHeader><CardTitle>Top search queries</CardTitle><CardDescription>Queries bringing people to Zerocraft Studio.</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y">{data.queries.length ? data.queries.map((row) => <div key={row.keys?.[0]} className="grid grid-cols-[1fr_repeat(3,80px)] items-center gap-3 px-5 py-3 text-xs"><span className="truncate font-medium">{row.keys?.[0]}</span><span className="text-right text-muted-foreground">{integer.format(Math.round(row.clicks || 0))} clicks</span><span className="text-right text-muted-foreground">{integer.format(Math.round(row.impressions || 0))} imp.</span><span className="text-right text-muted-foreground">{row.position ? row.position.toFixed(1) : "—"}</span></div>) : <div className="p-6 text-sm text-muted-foreground">No query data returned for this period.</div>}</div></CardContent></Card></>}
    <p className="text-xs text-muted-foreground">{data ? `Last checked ${new Date(data.checkedAt).toLocaleString("en-IN")}. Google data can be delayed by 2–3 days.` : "Waiting for Search Console connection."}</p>
  </main>;
}
