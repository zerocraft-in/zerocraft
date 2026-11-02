"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/lib/currency-context";
import type { CurrencyCode } from "@/lib/currency";
import Link from "next/link";
import {
  IconCalendar,
  IconChevronDown,
  IconDeviceTablet,
  IconDots,
  IconMapPin,
  IconPointFilled,
  IconShoppingBag,
  IconUsers,
} from "@tabler/icons-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Calendar } from "@zerocraft/components/ui/calendar";
import { Card, CardContent } from "@zerocraft/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@zerocraft/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@zerocraft/components/ui/popover";
import type { DateRange } from "react-day-picker";

type CurrencyTotals = { gross: number; discounts: number; refunds: number };
type PosAnalytics = {
  currency: CurrencyCode;
  orders: number;
  paidOrders: number;
  gross: number;
  discounts: number;
  refunds: number;
  daily: Record<string, number>;
  truncated: boolean;
};

const chartConfig = {
  sales: { label: "Gross sales", color: "#008060" },
} satisfies ChartConfig;

function utcDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}


function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function dateRangeLabel(range: DateRange | undefined) {
  if (!range?.from) return "Choose dates";
  const from = dateKey(utcDate(range.from));
  if (!range.to) return shortDate(from);
  return `${shortDate(from)} – ${shortDate(dateKey(utcDate(range.to)))}`;
}

export default function PointOfSalesDashboard({ slug }: { slug: string }) {
  const { currency, activeConfig, formatAmount: money } = useCurrency();
  const [range, setRange] = useState<DateRange>();
  const [draftRange, setDraftRange] = useState<DateRange>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<PosAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      const today = utcDate(new Date());
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - 29);
    setRange({ from, to: today });
  }, []);

  const loadAnalytics = useCallback(async (selected: DateRange) => {
    if (!selected.from || !selected.to) return;
    setLoading(true);
    setError(null);
    try {
      const start = utcDate(selected.from).toISOString();
      const endDate = utcDate(selected.to);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      const response = await fetch(
        `/api/admin/pos-analytics?currency=${currency}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(endDate.toISOString())}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sales analytics could not be loaded.");
      setAnalytics(result as PosAnalytics);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sales analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    if (range?.from && range.to) void loadAnalytics(range);
  }, [range, loadAnalytics]);

  const totals = { gross: analytics?.gross || 0, discounts: analytics?.discounts || 0, refunds: analytics?.refunds || 0 };
  const chartData = useMemo(() => {
    if (!range?.from || !range.to) return [];
    const start = utcDate(range.from);
    const end = utcDate(range.to);
    const days: { date: string; sales: number }[] = [];
    for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
      const key = dateKey(current);
      days.push({ date: key, sales: analytics?.daily[key] || 0 });
    }
    return days;
  }, [analytics, range]);

  const choosePreset = (days: number) => {
    const to = utcDate(new Date());
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - days + 1);
    setDraftRange({ from, to });
  };

  const openRangePicker = (open: boolean) => {
    if (open) setDraftRange(range);
    setCalendarOpen(open);
  };

  const applyRange = () => {
    if (!draftRange?.from || !draftRange.to) return;
    setRange(draftRange);
    setCalendarOpen(false);
  };

  return (
    <main className="mx-auto w-full max-w-[1120px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="grid size-7 place-items-center rounded-md bg-sky-500/10 text-sky-600"><IconShoppingBag className="size-4" /></span>
          Point of Sale
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/store/${slug}/settings/locations`} />}><IconMapPin />Manage locations</Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/store/${slug}/settings/users`} />}><IconUsers />Manage staff</Button>
          <Button variant="outline" size="icon" aria-label="Point of Sale options"><IconDots /></Button>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
          </div>
          <Popover open={calendarOpen} onOpenChange={openRangePicker}>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="min-w-40 justify-between" />}>
              <span className="inline-flex items-center gap-2"><IconCalendar />{dateRangeLabel(range)}</span><IconChevronDown />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(94vw,620px)] p-0">
              <div className="grid sm:grid-cols-[180px_1fr]">
                <div className="space-y-1 border-b p-3 sm:border-b-0 sm:border-r">
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Quick ranges</p>
                  {[
                    { days: 7, title: "Last 7 days", detail: "Compared to previous 7 days" },
                    { days: 30, title: "Last 30 days", detail: "Compared to previous 30 days" },
                    { days: 90, title: "Last 90 days", detail: "Compared to previous 90 days" },
                  ].map(({ days, title, detail }) => <button key={days} type="button" onClick={() => choosePreset(days)} className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"><span className="mt-0.5 size-4 shrink-0 rounded-full border" /><span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></span></button>)}
                </div>
                <div className="min-w-0 p-2 sm:p-3">
                  <Calendar mode="range" selected={draftRange} onSelect={setDraftRange} numberOfMonths={1} disabled={{ after: new Date() }} />
                  <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">{dateRangeLabel(draftRange)}</p>
                    <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setCalendarOpen(false)}>Cancel</Button><Button size="sm" onClick={applyRange} disabled={!draftRange?.from || !draftRange.to}>Apply range</Button></div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Gross sales</h2>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{loading ? "Loading…" : money(totals.gross)}</p>
              </div>
              <Badge variant="secondary" className="gap-1"><IconPointFilled className="size-3 text-emerald-600" />{currency}</Badge>
            </div>
            {error ? (
              <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{error}<Button className="ml-2" size="sm" variant="outline" onClick={() => range && void loadAnalytics(range)}>Try again</Button></div>
            ) : (
              <div className="mt-4 h-[260px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} tickFormatter={shortDate} />
                    <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={(value: number) => `${activeConfig.symbol}${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`} />
                    <Tooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? shortDate(String(payload[0].payload.date)) : ""} formatter={(value) => money(Number(value))} />} />
                    <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              </div>
            )}
            <p className="mt-2 text-center text-xs text-muted-foreground">{range?.from && range.to ? `${shortDate(dateKey(utcDate(range.from)))} – ${shortDate(dateKey(utcDate(range.to)))}` : "Choose a date range"}</p>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Sales summary" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Orders", value: loading ? "Loading…" : String(analytics?.orders ?? 0), detail: "Orders placed in this period" },
          { label: "Discounts", value: loading ? "Loading…" : money(totals.discounts), detail: "Discounts on paid orders" },
          { label: "Returns", value: loading ? "Loading…" : money(totals.refunds), detail: "Refunded order totals" },
        ].map((metric) => <Card key={metric.label} className="shadow-sm"><CardContent className="p-4"><p className="text-sm font-medium">{metric.label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></CardContent></Card>)}
      </section>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><IconDeviceTablet className="size-5" /></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended for you</p><h2 className="mt-1 font-semibold">Get ready to sell in person</h2><p className="mt-1 text-sm text-muted-foreground">Set up a location and assign staff before POS checkout becomes available.</p></div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {analytics?.truncated && <Badge variant="secondary">Recent order limit reached</Badge>}
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/store/${slug}/settings/locations`} />}>Manage location</Button>
          </div>
        </CardContent>
      </Card>

      <footer className="pb-4 text-center text-xs text-muted-foreground">Showing sales recorded in {currency}. <Link href={`/store/${slug}/settings/locations`} className="ml-1 underline underline-offset-2">Manage locations</Link></footer>
    </main>
  );
}
