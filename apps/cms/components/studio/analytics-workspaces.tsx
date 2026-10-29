"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  IconActivity,
  IconChartLine,
  IconChevronDown,
  IconClock,
  IconMapPin,
  IconRefresh,
  IconSearch,
  IconShoppingBag,
  IconUsers,
} from "@tabler/icons-react";
import { Button, Input } from "@/components/ui/studio-controls";

const reportRows = [
  ["Sessions by device type", "Behavior"],
  ["Sessions by landing page", "Behavior"],
  ["Shopify Comparison Reports", "Behavior"],
  ["Storefront agent assisted sessions", "Behavior"],
  ["Storefront agent conversations and feedback", "Behavior"],
  ["Customer cohort analysis", "Customers"],
  ["Customers by location", "Customers"],
  ["New customers over time", "Customers"],
  ["One-time customers", "Customers"],
  ["Predicted spenders", "Customers"],
  ["Returning customer rate over time", "Customers"],
  ["Returning customers", "Customers"],
  ["RFM customer analysis", "Customers"],
  ["RFM customer list", "Customers"],
  ["Chargeback rate", "Finances"],
  ["Cost of goods sold by order", "Finances"],
  ["Discounts by order", "Finances"],
  ["Dispute loss amount over time", "Finances"],
  ["Dispute rate over time", "Finances"],
  ["Finance summary", "Finances"],
  ["Gross payments from Shopify Payments", "Finances"],
  ["Gross profit breakdown", "Finances"],
  ["Gross profit by order", "Finances"],
  ["Gross sales by order", "Finances"],
  ["Net payments over time", "Finances"],
];

function ChartCard({ title, children, className = "" }: { title: string; children?: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-border bg-background p-4 shadow-sm ${className}`}><h2 className="text-xs font-semibold">{title}</h2>{children}</section>;
}

function LegacyLiveViewPage() {
  const [data, setData] = useState<{ activeUsers: number; eventCount: number; orders?: number; locations: LiveLocation[]; connected: boolean; error?: string } | null>(null);
  const [query, setQuery] = useState("");
  const [streamerMode, setStreamerMode] = useState(false);
  const [globeView, setGlobeView] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");
  const [fullScreen, setFullScreen] = useState(false);
  const mapPanel = useRef<HTMLDivElement>(null);
  const searchSuggestions = useMemo(() => Object.keys(INDIA_SEARCH_POINTS).filter((name) => name.includes(query.trim().toLowerCase())).slice(0, 7), [query]);
  const commitSearch = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setQuery(next);
    setSearchLocation(next);
  };
  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch("/api/studio/analytics/live", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (active) setData(response.ok ? payload : { activeUsers: 0, eventCount: 0, orders: 0, locations: [], connected: false, error: payload.error });
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const indiaLocations = (data?.locations || []).filter((item) => item.country.toLowerCase() === "india" && `${item.city} ${item.country}`.toLowerCase().includes(query.trim().toLowerCase()));
  const indiaVisitors = indiaLocations.reduce((total, item) => total + item.activeUsers, 0);
  const connected = data?.connected === true;
  const toggleFullScreen = async () => {
    if (!mapPanel.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await mapPanel.current.requestFullscreen();
    setFullScreen(Boolean(document.fullscreenElement));
  };
  return <section className="relative flex h-full min-h-0 flex-col bg-background text-sm [&>div:nth-child(2)]:hidden [&>p]:hidden">
    <div ref={mapPanel} className={`relative min-h-0 flex-1 overflow-hidden bg-background ${fullScreen ? "h-screen rounded-none" : "h-full"}`}><div className="absolute left-4 top-3 z-40 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-900 shadow-md backdrop-blur"><span className="size-2 rounded-full bg-emerald-500" /> <strong>Live View</strong><span className="text-slate-500">· Just now</span></div><div className="absolute right-4 top-3 z-40 flex items-center gap-2"><div className="relative hidden sm:block"><IconSearch className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" /><Input aria-label="Search location" placeholder="Search location" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setSearchLocation(query); }} className="h-8 w-48 rounded-lg border-slate-200 bg-white/95 pl-8 text-xs text-slate-900 shadow-md placeholder:text-slate-500" /></div><Button variant="outline" className="h-8 rounded-lg border-slate-200 bg-white/95 px-2.5 text-xs text-slate-700 shadow-md hover:bg-slate-50" onClick={() => setStreamerMode((value) => !value)}>{streamerMode ? "Disable streamer mode" : "Enable streamer mode"}</Button><Button variant="outline" className="h-8 rounded-lg border-slate-200 bg-white/95 px-2.5 text-xs text-slate-700 shadow-md hover:bg-slate-50" onClick={() => setGlobeView((value) => !value)}>{globeView ? "Switch to map view" : "Switch to globe view"}</Button><Button variant="outline" aria-label={fullScreen ? "Exit full screen" : "Full screen"} className="size-8 rounded-lg border-slate-200 bg-white/95 p-0 text-sm text-slate-700 shadow-md hover:bg-slate-50" onClick={() => void toggleFullScreen()}>{fullScreen ? "↙" : "↗"}</Button></div><div className="absolute left-4 top-14 z-30 flex w-64 flex-col gap-2"><div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-900 shadow-md backdrop-blur"><IconMapPin className="size-4 text-slate-600" /> India · {indiaVisitors} visitors right now</div>{!streamerMode && <div className="space-y-2"><div className="grid grid-cols-2 gap-2">{[["Visitors right now", data?.activeUsers ?? 0], ["Total sales", "₹0"], ["Sessions", data?.activeUsers ?? 0], ["Orders", data?.orders ?? 0]].map(([label, value]) => <div key={label as string} className="rounded-xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-md backdrop-blur"><p className="text-[10px] text-slate-500">{label as string}</p><p className="mt-1 text-lg font-semibold">{value as number}</p><div className="mt-2 h-0.5 rounded-full bg-sky-400/70" /></div>)}</div><div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-md backdrop-blur"><p className="text-xs font-semibold">Customer behavior</p><div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 text-[10px]"><span className="pr-2">Active carts<br /><strong>0</strong></span><span className="px-2">Checking out<br /><strong>0</strong></span><span className="pl-2">Purchased<br /><strong>0</strong></span></div></div></div>}</div><div className="absolute inset-0"><Globe locations={indiaLocations} globeView={globeView} streamerMode={streamerMode} searchQuery={searchLocation} /></div><div className="absolute bottom-4 left-4 z-40 flex items-center gap-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md backdrop-blur"><span><i className="mr-1 inline-block size-2 rounded-full bg-violet-500" /> Orders</span><span><i className="mr-1 inline-block size-2 rounded-full bg-sky-400" /> Visitors right now</span></div><div className="absolute bottom-4 right-4 z-40 flex items-center gap-1"><Button variant="outline" aria-label="Zoom in" className="size-8 rounded-lg border-slate-200 bg-white/95 p-0 text-base text-slate-700 shadow-md hover:bg-slate-50" onClick={() => setGlobeView(false)}>+</Button><Button variant="outline" aria-label="Zoom out" className="size-8 rounded-lg border-slate-200 bg-white/95 p-0 text-base text-slate-700 shadow-md hover:bg-slate-50" onClick={() => setGlobeView(true)}>−</Button></div><div className="absolute bottom-16 right-4 z-40 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-md backdrop-blur">{indiaLocations.length} live city markers</div></div>
    {!streamerMode && <div className="grid gap-4 xl:grid-cols-3"><ChartCard title="India sessions by city">{indiaLocations.length ? <div className="mt-3 divide-y divide-border">{indiaLocations.slice(0, 10).map((item) => <div key={`${item.city}-${item.country}`} className="flex items-center justify-between py-2 text-xs"><span>{item.city}</span><strong>{item.activeUsers}</strong></div>)}</div> : <EmptyChart label={connected ? "No active India visitors" : "Connect Analytics to load locations"} />}</ChartCard><ChartCard title="Realtime signal"><EmptyChart label={connected ? "GA4 realtime report is active" : "Waiting for Analytics"} /></ChartCard><ChartCard title="India map status"><div className="mt-3 space-y-2 text-xs text-muted-foreground"><p>Mode: <span className="font-medium text-foreground">{globeView ? "3D globe" : "Normal map"}</span></p><p>Search: <span className="font-medium text-foreground">{searchLocation || "India"}</span></p><p>Refresh: every 30 seconds</p></div></ChartCard></div>}
    <p className="text-center text-xs text-muted-foreground">{connected ? `GA4 India focus · refreshed ${new Date().toLocaleTimeString()} · updates every 30 seconds` : "Live data appears when Google Analytics is connected."}</p>
  </section>;
}

export function LiveViewPage() {
  const [data, setData] = useState<{ activeUsers: number; eventCount: number; orders?: number; locations: LiveLocation[]; connected: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("India");
  const [streamerMode, setStreamerMode] = useState(false);
  const [globeView, setGlobeView] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const mapPanel = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => Object.keys(INDIA_SEARCH_POINTS).filter((name) => name.includes(query.trim().toLowerCase())).slice(0, 7), [query]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch("/api/studio/analytics/live", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (active) setData(response.ok ? payload : { activeUsers: 0, eventCount: 0, orders: 0, locations: [], connected: false });
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const locations = (data?.locations || []).filter((item) => item.country.toLowerCase() === "india");
  const commitSearch = (value: string) => { const next = value.trim(); if (!next) return; setQuery(next); setSearchLocation(next); };
  const toggleFullScreen = async () => { if (!mapPanel.current) return; if (document.fullscreenElement) await document.exitFullscreen(); else await mapPanel.current.requestFullscreen(); setFullScreen(Boolean(document.fullscreenElement)); };
  return <section className="relative flex h-full min-h-0 flex-col bg-[#101112] text-sm">
    <div ref={mapPanel} className={`relative min-h-0 flex-1 overflow-hidden bg-[#101112] ${fullScreen ? "h-screen" : "h-full"}`}>
      <div className="absolute left-4 top-3 z-40 flex items-center gap-2 rounded-xl border border-white/10 bg-[#17191b]/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" /><strong>Live View</strong><span className="text-white/45">· Just now</span></div>
      <div className="absolute right-4 top-3 z-40 flex items-start gap-2">
        <div className="relative hidden sm:block"><IconSearch className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/50" /><Input aria-label="Search location" placeholder="Search location" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") commitSearch(query); }} className="h-8 w-52 rounded-xl border-white/10 bg-[#17191b]/95 pl-8 text-xs text-white shadow-2xl placeholder:text-white/45" />{query.trim() && query.trim().toLowerCase() !== searchLocation.trim().toLowerCase() && suggestions.length > 0 && <div className="absolute left-0 right-0 top-10 overflow-hidden rounded-xl border border-white/10 bg-[#17191b] p-1 shadow-2xl"><p className="px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/40">India locations</p>{suggestions.map((name) => <button key={name} type="button" className="flex w-full rounded-lg px-2 py-1.5 text-left text-xs capitalize text-white/80 hover:bg-white/10 hover:text-white" onClick={() => commitSearch(name)}>{name}</button>)}</div>}</div>
        <Button variant="outline" className="h-8 rounded-xl border-white/10 bg-[#17191b]/95 px-2.5 text-xs text-white shadow-2xl hover:bg-white/10" onClick={() => setStreamerMode((value) => !value)}>{streamerMode ? "Disable streamer mode" : "Enable streamer mode"}</Button>
        <Button variant="outline" className="h-8 rounded-xl border-white/10 bg-[#17191b]/95 px-2.5 text-xs text-white shadow-2xl hover:bg-white/10" onClick={() => setGlobeView((value) => !value)}>{globeView ? "Switch to map view" : "Switch to globe view"}</Button>
        <Button variant="outline" aria-label={fullScreen ? "Exit full screen" : "Full screen"} className="size-8 rounded-xl border-white/10 bg-[#17191b]/95 p-0 text-white shadow-2xl hover:bg-white/10" onClick={() => void toggleFullScreen()}>{fullScreen ? "↙" : "↗"}</Button>
      </div>
      <div className="absolute left-4 top-14 z-30 flex max-h-[calc(100%-5rem)] w-72 flex-col gap-2 overflow-y-auto pr-1">
        <div className="rounded-xl border border-white/10 bg-[#17191b]/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur"><IconMapPin className="mr-2 inline size-4 text-white/60" />India · {locations.reduce((sum, item) => sum + item.activeUsers, 0)} visitors right now</div>
        {!streamerMode && <><div className="grid grid-cols-2 gap-2">{[["Visitors right now", data?.activeUsers ?? 0], ["Total sales", "₹0"], ["Sessions", data?.activeUsers ?? 0], ["Orders", data?.orders ?? 0]].map(([label, value]) => <div key={label as string} className="rounded-xl border border-white/10 bg-[#17191b]/95 p-3 text-white shadow-2xl"><p className="text-[10px] text-white/50">{label as string}</p><p className="mt-1 text-lg font-semibold">{value as string | number}</p><div className="mt-2 h-0.5 rounded-full bg-cyan-400/80" /></div>)}</div><div className="rounded-xl border border-white/10 bg-[#17191b]/95 p-3 text-white shadow-2xl"><p className="text-xs font-semibold">Customer behavior</p><div className="mt-3 grid grid-cols-3 divide-x divide-white/10 text-[10px] text-white/70"><span className="pr-2">Active carts<br /><strong className="text-white">0</strong></span><span className="px-2">Checking out<br /><strong className="text-white">0</strong></span><span className="pl-2">Purchased<br /><strong className="text-white">0</strong></span></div></div><LiveInsightCharts locations={locations} /></>}
      </div>
      <div className="absolute inset-0"><SafeLiveMapSurface locations={locations} globeView={globeView} searchQuery={searchLocation} streamerMode={streamerMode} /></div>
      <div className="absolute bottom-4 left-4 z-40 rounded-xl border border-white/10 bg-[#17191b]/95 px-3 py-2 text-xs text-white/75 shadow-2xl"><span className="mr-4"><i className="mr-1 inline-block size-2 rounded-full bg-violet-400" />Orders</span><span><i className="mr-1 inline-block size-2 rounded-full bg-cyan-400" />Visitors right now</span></div>
      <div className="absolute bottom-4 right-4 z-40 flex gap-1"><Button variant="outline" aria-label="Zoom in" className="size-8 rounded-xl border-white/10 bg-[#17191b]/95 p-0 text-white shadow-2xl hover:bg-white/10" onClick={() => setGlobeView(false)}>+</Button><Button variant="outline" aria-label="Zoom out" className="size-8 rounded-xl border-white/10 bg-[#17191b]/95 p-0 text-white shadow-2xl hover:bg-white/10" onClick={() => setGlobeView(true)}>−</Button></div>
    </div>
  </section>;
}

export default LiveViewPage;

function EmptyChart({ label = "No data for this date range" }: { label?: string }) {
  return <div className="relative mt-4 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-muted/20 text-xs text-muted-foreground"><div className="absolute inset-x-4 bottom-7 border-t border-dashed border-sky-400/70" /><span>{label}</span></div>;
}

function TrendChart({ color = "#58c8ff" }: { color?: string }) {
  return <svg viewBox="0 0 500 120" className="mt-4 h-28 w-full" role="img" aria-label="Trend chart"><path d="M0 94 C55 92 70 98 115 91 S175 90 215 96 S270 100 320 88 S370 93 414 88 S470 90 500 84" fill="none" stroke={color} strokeWidth="2" /><path d="M0 94 C55 92 70 98 115 91 S175 90 215 96 S270 100 320 88 S370 93 414 88 S470 90 500 84 L500 120 L0 120Z" fill={color} opacity=".08" /></svg>;
}

export function AnalyticsOverviewPage() {
  return <section className="space-y-4 text-sm"><header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-medium text-muted-foreground">Insights</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Analytics</h1></div><div className="flex items-center gap-2"><Button variant="outline" className="h-8 rounded-lg text-xs"><IconClock className="size-3.5" /> Last 30 days <IconChevronDown className="size-3.5" /></Button><Button className="h-8 rounded-lg text-xs"><IconRefresh className="size-3.5" /> Refresh</Button></div></header><div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-100"><IconActivity className="size-4" /> Analytics data is read-only until a provider connection is configured.</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Total sales over time", "₹0", IconChartLine], ["Returning customer rate", "—", IconUsers], ["Orders", "0", IconShoppingBag], ["Total sales", "₹0", IconChartLine]].map(([label, value, Icon]) => <div key={label as string} className="rounded-xl border border-border bg-background p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label as string}</p><Icon className="size-4 text-muted-foreground" /></div><p className="mt-3 text-2xl font-semibold">{value as string}</p><div className="mt-3 h-1 rounded-full bg-sky-400/70" /></div>)}</div><div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><ChartCard title="Total sales over time"><TrendChart /><div className="mt-2 flex justify-center gap-4 text-[10px] text-muted-foreground"><span>● Oct 2026</span><span>● Nov 2026</span></div></ChartCard><ChartCard title="Total sales breakdown"><div className="mt-4 divide-y divide-border">{["Online Store", "Draft orders", "Custom orders", "Point of sale", "Sales channels", "Taxes"].map((item) => <div key={item} className="flex items-center justify-between py-2 text-xs"><span>{item}</span><span>₹0.00</span></div>)}</div></ChartCard></div><div className="grid gap-4 lg:grid-cols-3"><ChartCard title="Total sales by sales channel"><EmptyChart /></ChartCard><ChartCard title="Average order value over time"><TrendChart color="#a78bfa" /></ChartCard><ChartCard title="Total sales per product"><EmptyChart /></ChartCard></div><div className="grid gap-4 lg:grid-cols-3"><ChartCard title="Sessions by location"><EmptyChart /></ChartCard><ChartCard title="Conversion rate over time"><TrendChart color="#22c55e" /></ChartCard><ChartCard title="Conversion rate breakdown"><div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs"><span>Sessions<br /><strong>0</strong></span><span>Added to cart<br /><strong>0.0%</strong></span><span>Reached checkout<br /><strong>0.0%</strong></span><span>Completed<br /><strong>0.0%</strong></span></div></ChartCard></div><div className="grid gap-4 lg:grid-cols-2"><ChartCard title="Customers over time"><EmptyChart /></ChartCard><ChartCard title="Customers by location"><EmptyChart /></ChartCard></div></section>;
}

export function ReportsLibraryPage() {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => reportRows.filter(([name, category]) => `${name} ${category}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <section className="space-y-5 text-sm"><header className="flex items-center justify-between"><div><p className="text-xs font-medium text-muted-foreground">Analytics</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Reports</h1></div><Button className="h-9 rounded-lg">New exploration</Button></header><div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"><div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-sm"><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search reports" placeholder="Search reports" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 rounded-lg pl-9" /></div><span className="text-xs text-muted-foreground">{rows.length} reports</span></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr className="border-b border-border"><th className="px-4 py-3 font-medium">Report</th><th className="w-48 px-4 py-3 font-medium">Category</th><th className="w-40 px-4 py-3 font-medium">Created by</th><th className="w-12 px-4 py-3" /></tr></thead><tbody className="divide-y divide-border">{rows.map(([name, category]) => <tr key={name} className="transition-colors hover:bg-muted/40"><td className="px-4 py-2.5 font-medium">{name}</td><td className="px-4 py-2.5"><span className="rounded-md bg-muted px-2 py-1 text-[11px]">{category}</span></td><td className="px-4 py-2.5 text-xs text-muted-foreground"><span className="text-primary">▣</span> Shopify</td><td className="px-4 py-2.5 text-right text-muted-foreground">•••</td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>Learn more about the <u>reporting experience</u></span><span>1–{rows.length} of {rows.length}</span></div></div></section>;
}

type GoogleMapsWindow = Window & {
  google?: {
    maps?: {
      Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
      Marker?: new (options: Record<string, unknown>) => unknown;
      importLibrary?: (library: string) => Promise<Record<string, unknown>>;
    };
  };
};

type LiveLocation = { city: string; country: string; activeUsers: number; lat: number; lng: number };

const INDIA_SEARCH_POINTS: Record<string, { lat: number; lng: number }> = {
  india: { lat: 22.5, lng: 79 }, delhi: { lat: 28.6139, lng: 77.209 }, "new delhi": { lat: 28.6139, lng: 77.209 }, "connaught place": { lat: 28.6315, lng: 77.2167 },
  mumbai: { lat: 19.076, lng: 72.8777 }, bombay: { lat: 19.076, lng: 72.8777 }, andheri: { lat: 19.1197, lng: 72.8468 }, bandra: { lat: 19.0607, lng: 72.8362 }, powai: { lat: 19.1176, lng: 72.906 },
  bengaluru: { lat: 12.9716, lng: 77.5946 }, bangalore: { lat: 12.9716, lng: 77.5946 }, whitefield: { lat: 12.9698, lng: 77.75 }, koramangala: { lat: 12.9352, lng: 77.6245 }, "hsr layout": { lat: 12.9116, lng: 77.6389 },
  hyderabad: { lat: 17.385, lng: 78.4867 }, "banjara hills": { lat: 17.4156, lng: 78.4347 }, gachibowli: { lat: 17.4401, lng: 78.3489 },
  chennai: { lat: 13.0827, lng: 80.2707 }, madras: { lat: 13.0827, lng: 80.2707 }, "anna nagar": { lat: 13.085, lng: 80.2101 }, "t nagar": { lat: 13.0418, lng: 80.2341 }, adyar: { lat: 13.0067, lng: 80.2572 }, velachery: { lat: 12.9815, lng: 80.218 },
  kolkata: { lat: 22.5726, lng: 88.3639 }, "salt lake": { lat: 22.5867, lng: 88.417 }, pune: { lat: 18.5204, lng: 73.8567 }, baner: { lat: 18.559, lng: 73.7868 }, hinjewadi: { lat: 18.5912, lng: 73.7389 }, "viman nagar": { lat: 18.5679, lng: 73.9143 }, kharadi: { lat: 18.5515, lng: 73.9476 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 }, jaipur: { lat: 26.9124, lng: 75.7873 }, surat: { lat: 21.1702, lng: 72.8311 }, kochi: { lat: 9.9312, lng: 76.2673 }, coimbatore: { lat: 11.0168, lng: 76.9558 }, madurai: { lat: 9.9252, lng: 78.1198 }, tenkasi: { lat: 8.9597, lng: 77.3152 },
  noida: { lat: 28.5355, lng: 77.391 }, gurgaon: { lat: 28.4595, lng: 77.0266 }, gurugram: { lat: 28.4595, lng: 77.0266 }, lucknow: { lat: 26.8467, lng: 80.9462 }, chandigarh: { lat: 30.7333, lng: 76.7794 }, indore: { lat: 22.7196, lng: 75.8577 }, nagpur: { lat: 21.1458, lng: 79.0882 },
};

function ThreeDGlobe() {
  return <div className="relative grid size-[min(70vw,620px)] place-items-center [perspective:1000px]" aria-label="3D visitor map"><div className="absolute size-[min(62vw,540px)] rounded-full bg-cyan-300/10 blur-3xl" /><div className="relative size-[min(62vw,540px)] overflow-hidden rounded-full border border-cyan-200/50 bg-[radial-gradient(circle_at_35%_28%,#f5ffff_0,#d6f3f7_36%,#a8d9ed_68%,#76b8e8_100%)] shadow-[0_0_90px_rgba(92,210,226,0.32)] [transform:rotateX(8deg)]"><div className="absolute inset-0 animate-[spin_34s_linear_infinite] bg-[radial-gradient(circle,#28bfd0_1.5px,transparent_1.7px)] [background-size:9px_9px] [mask-image:radial-gradient(ellipse_at_center,#000_47%,transparent_72%)] opacity-90" /><div className="absolute inset-x-[-18%] top-[14%] h-[70%] rounded-[50%] border border-white/60 [transform:rotateY(62deg)]" /><div className="absolute inset-x-[-18%] top-[14%] h-[70%] rounded-[50%] border border-white/50 [transform:rotateY(-62deg)]" /><div className="absolute inset-x-[8%] top-[48%] h-px bg-white/60 shadow-[0_-75px_0_rgba(255,255,255,0.35),0_75px_0_rgba(255,255,255,0.35)]" /><span className="absolute left-[31%] top-[34%] size-3 animate-pulse rounded-full bg-violet-500 shadow-[0_0_0_5px_rgba(139,92,246,0.22),0_0_20px_rgba(139,92,246,0.85)]" /><span className="absolute left-[64%] top-[48%] size-2.5 animate-pulse rounded-full bg-sky-500 shadow-[0_0_0_5px_rgba(14,165,233,0.2),0_0_18px_rgba(14,165,233,0.8)] [animation-delay:700ms]" /><span className="absolute left-[48%] top-[64%] size-2 animate-pulse rounded-full bg-sky-500 shadow-[0_0_0_5px_rgba(14,165,233,0.18),0_0_16px_rgba(14,165,233,0.75)] [animation-delay:1200ms]" /></div></div>;
}

const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#17191b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a7adb5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#17191b" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#3b424b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b2530" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3037" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7f8994" }] },
];

function DarkGlobe({ searchQuery }: { searchQuery: string }) {
  return <div className="grid size-full min-h-[650px] place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,#1d3941_0,#101112_48%,#090a0b_100%)]" aria-label="Dark globe visitor map"><div className="relative size-[min(62vw,620px)] rounded-full bg-cyan-400/10 blur-3xl" /><div className="absolute size-[min(54vw,520px)] overflow-hidden rounded-full border border-cyan-300/30 bg-[radial-gradient(circle_at_35%_28%,#29535d_0,#15343c_42%,#0b171b_75%,#07090a_100%)] shadow-[0_0_100px_rgba(34,211,238,.22)]"><div className="absolute inset-0 opacity-75 [background-image:radial-gradient(circle,#39d4e4_1.5px,transparent_1.7px)] [background-size:9px_9px] [mask-image:radial-gradient(ellipse_at_center,#000_45%,transparent_72%)]" /><div className="absolute inset-x-[-18%] top-[14%] h-[70%] rounded-[50%] border border-cyan-200/25 [transform:rotateY(62deg)]" /><div className="absolute inset-x-[-18%] top-[14%] h-[70%] rounded-[50%] border border-cyan-200/20 [transform:rotateY(-62deg)]" /><div className="absolute inset-x-[8%] top-[48%] h-px bg-cyan-100/25 shadow-[0_-75px_0_rgba(103,232,249,.14),0_75px_0_rgba(103,232,249,.14)]" /><span className="absolute left-[31%] top-[34%] size-3 rounded-full bg-violet-400 shadow-[0_0_0_5px_rgba(167,139,250,.2),0_0_20px_rgba(167,139,250,.85)]" /><span className="absolute left-[64%] top-[48%] size-2.5 rounded-full bg-cyan-300 shadow-[0_0_0_5px_rgba(103,232,249,.18),0_0_18px_rgba(103,232,249,.8)]" /><span className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70 backdrop-blur">{searchQuery || "India"}</span></div></div>;
}

function MiniSparkline({ color, values }: { color: string; values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${36 - (value / max) * 28}`).join(" ");
  return <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-3 h-10 w-full" aria-hidden="true"><path d={`M ${points} L 100 40 L 0 40 Z`} fill={color} opacity=".12" /><polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}

function LiveInsightCharts({ locations }: { locations: LiveLocation[] }) {
  const cityValues = locations.slice(0, 6).map((item) => item.activeUsers);
  const values = cityValues.length ? cityValues : [2, 4, 3, 6, 4, 7];
  return <><div className="rounded-xl border border-white/10 bg-[#17191b]/95 p-3 text-white shadow-2xl"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Sessions by location</p><span className="rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-300">Live</span></div><MiniSparkline color="#22d3ee" values={values} /><div className="mt-1 flex items-center justify-between text-[10px] text-white/45"><span>{locations[0]?.city || "India"}</span><strong className="text-cyan-300">{locations.reduce((sum, item) => sum + item.activeUsers, 0)} visitors</strong></div></div><div className="rounded-xl border border-white/10 bg-[#17191b]/95 p-3 text-white shadow-2xl"><div className="flex items-center justify-between"><p className="text-xs font-semibold">New vs returning</p><span className="text-[10px] text-white/40">Today</span></div><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10"><span className="bg-violet-400" style={{ width: "68%" }} /><span className="bg-cyan-400" style={{ width: "32%" }} /></div><div className="mt-2 flex justify-between text-[10px] text-white/55"><span><i className="mr-1 inline-block size-1.5 rounded-full bg-violet-400" />New 68%</span><span><i className="mr-1 inline-block size-1.5 rounded-full bg-cyan-400" />Returning 32%</span></div></div><div className="rounded-xl border border-white/10 bg-[#17191b]/95 p-3 text-white shadow-2xl"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Total sales by product</p><span className="text-[10px] text-white/40">₹0</span></div><div className="mt-3 space-y-2">{["Online store", "Agentic", "Direct"].map((label, index) => <div key={label}><div className="mb-1 flex justify-between text-[10px] text-white/55"><span>{label}</span><span>{[62, 24, 14][index]}%</span></div><div className="h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${[62, 24, 14][index]}%`, opacity: 1 - index * .2 }} /></div></div>)}</div></div></>;
}

function FreeOpenStreetMap({ locations = [], searchQuery = "", streamerMode = false }: { locations?: LiveLocation[]; searchQuery?: string; streamerMode?: boolean }) {
  const [zoom, setZoom] = useState(searchQuery.trim() ? 11 : 5);
  useEffect(() => { setZoom(searchQuery.trim() ? 11 : 5); }, [searchQuery]);
  const normalized = searchQuery.trim().toLowerCase().replace(/\s+/g, " ");
  const match = Object.entries(INDIA_SEARCH_POINTS).find(([name]) => normalized === name || normalized.includes(name) || name.includes(normalized));
  const center = match?.[1] || INDIA_SEARCH_POINTS.india;
  const world = 2 ** zoom;
  const x = ((center.lng + 180) / 360) * world;
  const sin = Math.sin((center.lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const tileSize = 256;
  const tiles = [-2, -1, 0, 1, 2].flatMap((dx) => [-2, -1, 0, 1, 2].map((dy) => ({ dx, dy, tx: tileX + dx, ty: tileY + dy })));
  const markerStyle = (location: LiveLocation) => {
    const markerX = ((location.lng + 180) / 360) * world;
    const markerSin = Math.sin((location.lat * Math.PI) / 180);
    const markerY = (0.5 - Math.log((1 + markerSin) / (1 - markerSin)) / (4 * Math.PI)) * world;
    return { left: `calc(50% + ${(markerX - x) * tileSize}px)`, top: `calc(50% + ${(markerY - y) * tileSize}px)` };
  };
  return <div className="relative size-full min-h-[650px] overflow-hidden bg-[#101112]" aria-label="Free OpenStreetMap live visitor map"><div className="absolute inset-0 bg-[#101112]"><div className="absolute left-1/2 top-1/2 size-[1280px] -translate-x-1/2 -translate-y-1/2" style={{ width: `${tileSize * 5}px`, height: `${tileSize * 5}px` }}>{tiles.map(({ dx, dy, tx, ty }) => <img key={`${tx}:${ty}`} src={`https://tile.openstreetmap.org/${zoom}/${((tx % world) + world) % world}/${Math.max(0, Math.min(world - 1, ty))}.png`} alt="" className="absolute size-64 brightness-[.55] contrast-[1.15] saturate-[.7]" style={{ left: `${(dx + 2) * tileSize}px`, top: `${(dy + 2) * tileSize}px` }} />)}{locations.slice(0, 100).map((location) => <span key={`${location.city}-${location.country}`} title={`${location.city}: ${location.activeUsers} active visitors`} className="absolute z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-100/70 bg-cyan-400 text-[10px] font-semibold text-[#071014] shadow-[0_0_0_5px_rgba(34,211,238,.18),0_0_18px_rgba(34,211,238,.85)]" style={markerStyle(location)}>{streamerMode ? "•" : location.activeUsers}</span>)}</div></div><div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-xl border border-white/10 bg-[#17191b]/95 p-1 shadow-2xl"><Button variant="outline" aria-label="Zoom in" className="size-8 rounded-lg border-white/10 bg-transparent p-0 text-white hover:bg-white/10" onClick={() => setZoom((value) => Math.min(14, value + 1))}>+</Button><Button variant="outline" aria-label="Zoom out" className="size-8 rounded-lg border-white/10 bg-transparent p-0 text-white hover:bg-white/10" onClick={() => setZoom((value) => Math.max(3, value - 1))}>−</Button></div><div className="absolute bottom-1 left-1 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/60">© OpenStreetMap contributors</div></div>;
}

function SafeLiveMapSurface({ locations = [], globeView = false, streamerMode = false, searchQuery = "" }: { locations?: LiveLocation[]; globeView?: boolean; streamerMode?: boolean; searchQuery?: string }) {
  if (globeView) return <DarkGlobe searchQuery={searchQuery} />;
  return <FreeOpenStreetMap locations={locations} searchQuery={searchQuery} streamerMode={streamerMode} />;
}

function LiveMapSurface({ locations = [], globeView = false, streamerMode = false, searchQuery = "" }: { locations?: LiveLocation[]; globeView?: boolean; streamerMode?: boolean; searchQuery?: string }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [threeDUnavailable, setThreeDUnavailable] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapElement.current) return;
    const initialize = async () => {
      const maps = (window as GoogleMapsWindow).google?.maps;
      if (!maps || !mapElement.current || !maps.importLibrary) return;
      try {
        let center = { lat: 22.5, lng: 79 };
        let closeZoom = 5;
        if (searchQuery.trim()) {
          const normalized = searchQuery.trim().toLowerCase().replace(/\s+/g, " ");
          const match = Object.entries(INDIA_SEARCH_POINTS).find(([name]) => normalized === name || normalized.includes(name) || name.includes(normalized));
          if (match) { center = match[1]; closeZoom = 11; }
        }
        if (!globeView) {
          const map = new maps.Map(mapElement.current, { center, zoom: closeZoom, mapTypeId: "roadmap", fullscreenControl: false, streetViewControl: false, mapTypeControl: false, clickableIcons: false });
          locations.slice(0, 100).forEach((location) => {
            const Marker = maps.Marker;
            if (!Marker) return;
            new Marker({ map, position: { lat: location.lat, lng: location.lng }, title: `${location.city}, ${location.country}: ${location.activeUsers} active visitors`, label: streamerMode ? "•" : String(location.activeUsers) });
          });
          setMapReady(true);
          return;
        }
        const maps3d = await maps.importLibrary("maps3d");
        const Map3DElement = maps3d.Map3DElement as new (options: Record<string, unknown>) => HTMLElement;
        const Marker3DElement = maps3d.Marker3DElement as new (options: Record<string, unknown>) => HTMLElement;
        if (!Map3DElement || !Marker3DElement || !mapElement.current) throw new Error("3D Maps library unavailable");
        const map3d = new Map3DElement({ center: { lat: center.lat, lng: center.lng, altitude: 0 }, range: searchQuery.trim() ? 160_000 : 6_000_000, tilt: 0, heading: 0, mode: "HYBRID", defaultUIHidden: false });
        map3d.setAttribute("aria-label", "Google Maps 3D India live visitor map");
        map3d.className = "block size-full min-h-[650px] overflow-hidden rounded-xl";
        locations.slice(0, 100).forEach((location) => {
          const marker = new Marker3DElement({ position: { lat: location.lat, lng: location.lng, altitude: 120 }, label: streamerMode ? "Live visitor" : `${location.city} · ${location.activeUsers}`, extruded: true, drawsWhenOccluded: true, collisionBehavior: "REQUIRED" });
          marker.setAttribute("title", `${location.city}, ${location.country}: ${location.activeUsers} active visitors`);
          map3d.append(marker);
        });
        mapElement.current.replaceChildren(map3d);
        setMapReady(true);
      } catch {
        setThreeDUnavailable(true);
      }
    };
    if ((window as GoogleMapsWindow).google?.maps) { initialize(); return; }
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
    if (existing) { existing.addEventListener("load", initialize, { once: true }); return () => existing.removeEventListener("load", initialize); }
    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=beta`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initialize, { once: true });
    document.head.appendChild(script);
    const retry = window.setTimeout(() => void initialize(), 1500);
    return () => { script.removeEventListener("load", initialize); window.clearTimeout(retry); };
  }, [apiKey, globeView, locations, searchQuery, streamerMode]);

  if (apiKey && !threeDUnavailable) return <div ref={mapElement} className="size-full min-h-[650px] overflow-hidden rounded-xl bg-sky-50" aria-label={mapReady ? (globeView ? "Google Maps 3D live visitor globe" : "Google Maps live visitor map") : "Loading Google Maps"} />;
  return <ThreeDGlobe />;
}

function Globe({ locations = [], globeView = false, streamerMode = false, searchQuery = "" }: { locations?: LiveLocation[]; globeView?: boolean; streamerMode?: boolean; searchQuery?: string }) {
  return <LiveMapSurface locations={locations} globeView={globeView} streamerMode={streamerMode} searchQuery={searchQuery} />;
}

function LegacyDashboardLiveViewPage() {
  return <section className="space-y-4 text-sm"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">Analytics</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Live View</h1></div><div className="flex items-center gap-2"><Input placeholder="Search location" className="h-8 w-48 rounded-lg" /><Button variant="outline" className="h-8 rounded-lg"><IconRefresh className="size-3.5" /> Refresh</Button></div></header><div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-100"><span className="size-2 rounded-full bg-emerald-500" /> Live View · Just now</div><div className="grid gap-4 xl:grid-cols-[265px_minmax(0,1fr)]"><aside className="space-y-3"><div className="grid grid-cols-2 gap-3">{[["Visitors right now", "0"], ["Total sales", "₹0"], ["Sessions", "0"], ["Orders", "0"]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-background p-3 shadow-sm"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p><div className="mt-3 h-1 rounded-full bg-sky-400/70" /></div>)}</div><ChartCard title="Customer behavior"><div className="mt-5 grid grid-cols-3 divide-x text-xs"><span className="px-2">Active carts<br /><strong>0</strong></span><span className="px-2">Checking out<br /><strong>0</strong></span><span className="px-2">Purchased<br /><strong>0</strong></span></div></ChartCard><ChartCard title="Sessions by location"><EmptyChart /></ChartCard><ChartCard title="New vs returning customers"><EmptyChart /></ChartCard><ChartCard title="Total sales by product"><EmptyChart /></ChartCard></aside><div className="relative min-h-[650px] overflow-hidden rounded-xl border border-border bg-background shadow-sm"><div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-xs backdrop-blur"><IconMapPin className="size-4 text-primary" /> Visitors right now</div><div className="grid min-h-[650px] place-items-center"><Globe /></div><div className="absolute bottom-4 right-4 flex gap-4 text-xs text-muted-foreground"><span><i className="mr-1 inline-block size-2 rounded-full bg-violet-500" /> Orders</span><span><i className="mr-1 inline-block size-2 rounded-full bg-sky-400" /> Visitors right now</span></div></div></div><p className="text-center text-xs text-muted-foreground">Live data appears when an analytics provider is connected.</p></section>;
}

function LegacyConnectedLiveViewPage() {
  const [data, setData] = useState<{ activeUsers: number; eventCount: number; locations: LiveLocation[]; connected: boolean; error?: string } | null>(null);
  const [query, setQuery] = useState("");
  const load = async () => {
    const response = await fetch("/api/studio/analytics/live", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    setData(response.ok ? payload : { activeUsers: 0, eventCount: 0, locations: [], connected: false, error: payload.error });
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30_000); return () => window.clearInterval(timer); }, []);
  const locations = (data?.locations || []).filter((item) => `${item.city} ${item.country}`.toLowerCase().includes(query.toLowerCase()));
  const indiaLocations = locations.filter((item) => item.country.toLowerCase() === "india");
  const indiaVisitors = indiaLocations.reduce((total, item) => total + item.activeUsers, 0);
  const connected = data?.connected === true;
  return <section className="space-y-4 text-sm"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">Analytics</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Live View</h1></div><div className="flex items-center gap-2"><Input placeholder="Search location" value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 w-48 rounded-lg" /><Button variant="outline" className="h-8 rounded-lg" onClick={() => void load()}><IconRefresh className="size-3.5" /> Refresh</Button></div></header><div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${connected ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100" : "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100"}`}><span className="flex items-center gap-2"><span className={`size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-sky-500"}`} /> {connected ? "Live data · Just now" : (data?.error || "Connect Google Analytics to load live visitors")}</span>{!connected && <a href="/api/studio/analytics/oauth" className="rounded-md bg-foreground px-2.5 py-1.5 font-medium text-background">Connect Analytics</a>}</div><div className="grid gap-4 xl:grid-cols-[265px_minmax(0,1fr)]"><aside className="space-y-3"><div className="grid grid-cols-2 gap-3">{[["Visitors right now", String(data?.activeUsers ?? 0)], ["Events", String(data?.eventCount ?? 0)], ["Locations", String(locations.length)], ["Sessions", connected ? "Realtime" : "—"]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-background p-3 shadow-sm"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p><div className="mt-3 h-1 rounded-full bg-sky-400/70" /></div>)}</div><ChartCard title="Customer behavior"><div className="mt-5 grid grid-cols-3 divide-x text-xs"><span className="px-2">Active<br /><strong>{data?.activeUsers ?? 0}</strong></span><span className="px-2">Events<br /><strong>{data?.eventCount ?? 0}</strong></span><span className="px-2">Countries<br /><strong>{new Set(locations.map((item) => item.country)).size}</strong></span></div></ChartCard><ChartCard title="Sessions by location">{locations.length ? <div className="mt-3 divide-y divide-border">{locations.slice(0, 8).map((item) => <div key={`${item.city}-${item.country}`} className="flex items-center justify-between py-2 text-xs"><span>{item.city}, {item.country}</span><strong>{item.activeUsers}</strong></div>)}</div> : <EmptyChart label={connected ? "No active visitors" : "Connect Analytics to load locations"} />}</ChartCard><ChartCard title="Device and event stream"><EmptyChart label={connected ? "Realtime report is active" : "Waiting for Analytics"} /></ChartCard></aside><div className="relative min-h-[650px] overflow-hidden rounded-xl border border-border bg-background shadow-sm"><div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-xs backdrop-blur"><IconMapPin className="size-4 text-primary" /> {data?.activeUsers ?? 0} visitors right now</div><div className="grid min-h-[650px] place-items-center"><Globe locations={locations} /></div><div className="absolute bottom-4 right-4 flex gap-4 text-xs text-muted-foreground"><span><i className="mr-1 inline-block size-2 rounded-full bg-violet-500" /> Orders</span><span><i className="mr-1 inline-block size-2 rounded-full bg-sky-400" /> Visitors right now</span></div></div></div><p className="text-center text-xs text-muted-foreground">{connected ? `GA4 property · refreshed ${new Date().toLocaleTimeString()}` : "Live data appears when Google Analytics is connected."}</p></section>;
}
