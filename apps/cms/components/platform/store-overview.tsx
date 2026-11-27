'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Link from 'next/link';
import { useCurrency } from '@/lib/currency-context';

type StoreOverviewData = { products?: unknown[]; orders?: { currency?: string; paidTotal?: number; count?: number } };

export function StoreOverview({ name, slug, setupCompleted }: { name: string; slug: string; setupCompleted: string }) {
  const { currency, formatAmount } = useCurrency();
  const [data, setData] = useState<StoreOverviewData | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setLoadError(false);
    fetch(`/api/store?currency=${currency}`, { cache: 'no-store', signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Store overview unavailable'); return response.json() as Promise<StoreOverviewData>; })
      .then((payload) => setData(payload))
      .catch((error: unknown) => { if (error instanceof DOMException && error.name === 'AbortError') return; if (error instanceof Error && error.name === 'AbortError') return; setLoadError(true); });
    return () => controller.abort();
  }, [currency]);

  const chart = useMemo(() => {
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Array.from({ length: 7 }, (_, index) => { const day = new Date(today - (6 - index) * 86400000); return { label: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(day), sales: 0 }; });
  }, []);

  const loading = !data && !loadError;
  const metricValue = (value: string | number) => (loading ? 'Loading…' : loadError ? 'Unavailable' : value);
  const metrics = [['Sessions', metricValue(0)], ['Total sales', metricValue(data?.orders?.currency === currency ? formatAmount(Number(data.orders.paidTotal)) : formatAmount(0))], ['Orders', metricValue(data?.orders?.count ?? 0)], ['Products', metricValue(data?.products?.length ?? 0)]];
  const setupDate = new Date(setupCompleted);
  const formattedSetupDate = Number.isNaN(setupDate.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(setupDate);

  return <main className="min-h-svh bg-background px-6 py-8 lg:px-10"><div className="mx-auto max-w-7xl space-y-6"><div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overview</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Good morning, {name}</h1><p className="mt-1 text-sm text-muted-foreground">Here’s what’s happening with your store today.</p></div><Link href={`/store/${slug}/setup`} className="rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted">Manage setup</Link></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">Last 7 days</p></div>)}</div><div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]"><section className="rounded-xl border bg-card p-5 shadow-sm"><h2 className="font-semibold">Sales overview</h2><p className="mt-1 text-sm text-muted-foreground">Orders and sales from your store.</p><div className="mt-6 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="label" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false}/><Tooltip/><Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></div></section><section className="rounded-xl border bg-card p-5 shadow-sm"><h2 className="font-semibold">Quick actions</h2><div className="mt-4 grid gap-2">{[['Add a product', '/store/products/new'], ['View orders', '/store/orders'], ['Manage content', '/store/content']].map(([title, href]) => <Link key={href} href={href} className="rounded-lg border p-3 text-sm hover:bg-muted"><span className="font-medium">{title}</span><span className="mt-1 block text-xs text-muted-foreground">Open workspace →</span></Link>)}</div></section></div><section className="rounded-xl border bg-card p-5 shadow-sm"><h2 className="font-semibold">Store status</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Store URL</p><p className="mt-1 text-sm font-medium">/store/{slug}</p></div><div><p className="text-xs text-muted-foreground">Status</p><span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Ready</span></div><div><p className="text-xs text-muted-foreground">Setup completed</p><p className="mt-1 text-sm font-medium">{formattedSetupDate}</p></div></div></section></div></main>;
}
