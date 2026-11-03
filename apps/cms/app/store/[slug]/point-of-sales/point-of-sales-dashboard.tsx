"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/lib/currency-context";
import type { CurrencyCode } from "@/lib/currency";
import Link from "next/link";
import {
  IconCheck,
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
import { Card, CardContent } from "@zerocraft/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@zerocraft/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@zerocraft/components/ui/dropdown-menu";
import { CommercePageHeader } from "@/components/commerce/commerce-page-header";

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

type QuickRangeDays = 7 | 30 | 90;

const QUICK_RANGES: { days: QuickRangeDays; label: string }[] = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

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

function computeRange(days: QuickRangeDays) {
  const to = utcDate(new Date());
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days + 1);
  return { from, to };
}

export default function PointOfSalesDashboard({ slug }: { slug: string }) {
  const { currency, activeConfig, formatAmount: money } = useCurrency();
  const [selectedDays, setSelectedDays] = useState<QuickRangeDays>(30);
  const [analytics, setAnalytics] = useState<PosAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => computeRange(selectedDays), [selectedDays]);

  const loadAnalytics = useCallback(async (startRange: { from: Date; to: Date }) => {
    setLoading(true);
    setError(null);
    try {
      const start = utcDate(startRange.from).toISOString();
      const endDate = utcDate(startRange.to);
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
    void loadAnalytics(range);
  }, [range, loadAnalytics]);

  const totals = { gross: analytics?.gross || 0, discounts: analytics?.discounts || 0, refunds: analytics?.refunds || 0 };
  const chartData = useMemo(() => {
    const start = utcDate(range.from);
    const end = utcDate(range.to);
    const days: { date: string; sales: number }[] = [];
    for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
      const key = dateKey(current);
      days.push({ date: key, sales: analytics?.daily[key] || 0 });
    }
    return days;
  }, [analytics, range]);

  const activeLabel = QUICK_RANGES.find((item) => item.days === selectedDays)?.label || `Last ${selectedDays} days`;

  return (
    <div className="flex min-h-screen flex-col">
      <CommercePageHeader
        left={
          <>
            <span className="grid size-7 place-items-center rounded-md bg-sky-500/10 text-sky-600">
              <IconShoppingBag className="size-4" />
            </span>
            <span>Point of Sale</span>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/store/${slug}/settings/locations`} />}>
              <IconMapPin />Manage locations
            </Button>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/store/${slug}/settings/users`} />}>
              <IconUsers />Manage staff
            </Button>
            <Button variant="outline" size="icon" aria-label="Point of Sale options">
              <IconDots />
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-[1120px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="min-w-36 justify-between gap-2" />
                }
              >
                <span>{activeLabel}</span>
                <IconChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {QUICK_RANGES.map(({ days, label }) => (
                  <DropdownMenuItem
                    key={days}
                    onClick={() => setSelectedDays(days)}
                    className="justify-between"
                  >
                    <span>{label}</span>
                    {selectedDays === days && <IconCheck className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
                <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
                  {error}
                  <Button className="ml-2" size="sm" variant="outline" onClick={() => void loadAnalytics(range)}>Try again</Button>
                </div>
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
              <p className="mt-2 text-center text-xs text-muted-foreground">{`${shortDate(dateKey(utcDate(range.from)))} – ${shortDate(dateKey(utcDate(range.to)))}`}</p>
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
    </div>
  );
}
