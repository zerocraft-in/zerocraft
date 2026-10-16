"use client";

import Link from "next/link";
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconBolt,
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconDatabase,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconShoppingBag,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudioOverview } from "./use-studio-overview";

const metricConfig = [
  {
    label: "Portfolio projects",
    key: "works",
    href: "/studio/works",
    icon: IconBriefcase,
    tint: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "Published stories",
    key: "blogs",
    href: "/studio/blogs",
    icon: IconFileText,
    tint: "text-violet-600 dark:text-violet-400",
  },
  {
    label: "Appointments",
    key: "appointments",
    href: "/studio/appointments",
    icon: IconCalendar,
    tint: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "Store orders",
    key: "store_orders",
    href: "/studio/orders",
    icon: IconShoppingBag,
    tint: "text-emerald-600 dark:text-emerald-400",
  },
];

export default function StudioDashboard() {
  const { data, loading, error, refresh } = useStudioOverview();
  const table = (name: string) =>
    data?.tables.find((item) => item.name === name);
  const rows = [
    {
      key: "works",
      label: "Portfolio projects",
      href: "/studio/works",
      icon: IconBriefcase,
    },
    {
      key: "blogs",
      label: "Journal stories",
      href: "/studio/blogs",
      icon: IconFileText,
    },
    {
      key: "appointments",
      label: "Appointments",
      href: "/studio/appointments",
      icon: IconCalendar,
    },
    {
      key: "store_orders",
      label: "Store orders",
      href: "/studio/orders",
      icon: IconShoppingBag,
    },
    {
      key: "clients",
      label: "Client directory",
      href: "/studio/clients",
      icon: IconUsers,
    },
  ].map((row) => ({
    ...row,
    count: table(row.key)?.count ?? null,
    available: table(row.key)?.available ?? false,
  }));
  const maxCount = Math.max(1, ...rows.map((row) => row.count ?? 0));
  const unavailable = data?.tables.filter((item) => !item.available) ?? [];
  const totalBlogs = data?.totalBlogs ?? 0;
  const published = data?.publishedBlogs ?? 0;
  const publicationRate = totalBlogs
    ? Math.round((published / totalBlogs) * 100)
    : 0;
  const totalRecords = rows.reduce(
    (sum, row) => sum + (row.available ? row.count ?? 0 : 0),
    0,
  );
  const connectedSources = rows.filter((row) => row.available).length;

  return (
    <main className="space-y-5 pb-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
            ZEROCRAFT / CONTROL CENTER
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">
            Overview<span className="text-muted-foreground">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            A live snapshot of the content, customers, and commerce behind your studio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <IconRefresh className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button render={<Link href="/studio/works" />} nativeButton={false}>
            <IconPlus />
            New work
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <IconAlertCircle className="mt-0.5 size-5 text-destructive" />
          <div>
            <p className="font-medium">Couldn’t refresh workspace data</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
        </div>
      )}
      {unavailable.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <IconAlertCircle className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium">
                Some data sources need attention
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {unavailable.map((item) => item.label).join(", ")} could not be
                read.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/studio/database" />}
          >
            Review sources
            <IconArrowUpRight />
          </Button>
        </div>
      )}

      <section
        className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]"
        aria-label="Workspace highlights"
      >
        <Card className="relative min-h-[318px] overflow-hidden border-transparent bg-gradient-to-br from-fuchsia-700 via-pink-600 to-rose-500 text-white shadow-lg shadow-pink-500/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.28),transparent_28%),radial-gradient(circle_at_0%_100%,rgba(0,0,0,0.28),transparent_45%)]" />
          <CardHeader className="relative z-10 flex-row items-start justify-between gap-4">
            <div>
              <CardDescription className="font-mono text-[10px] tracking-[0.16em] text-white/70">WORKSPACE PULSE</CardDescription>
              <CardTitle className="mt-2 text-lg text-white">Total activity</CardTitle>
            </div>
            <Button render={<Link href="/studio/reports" />} nativeButton={false} size="icon" variant="secondary" className="rounded-full bg-white text-zinc-900 hover:bg-white/90" aria-label="Open workspace reports">
              <IconArrowUpRight />
            </Button>
          </CardHeader>
          <CardContent className="relative z-10 flex flex-1 flex-col justify-between gap-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-5xl font-semibold tracking-[-0.08em] sm:text-6xl">{loading ? "—" : totalRecords.toLocaleString()}</p>
                <p className="mt-2 text-sm text-white/70">records across connected studio areas</p>
              </div>
              <div className="hidden text-right sm:block"><p className="font-mono text-2xl font-semibold">{connectedSources}/5</p><p className="text-xs text-white/70">sources online</p></div>
            </div>
            <div className="grid max-w-sm grid-cols-8 gap-2" aria-hidden="true">
              {Array.from({ length: 32 }, (_, index) => <span key={index} className={`size-2 rounded-full border ${index % 3 === 0 ? "border-white bg-white" : "border-white/35 bg-transparent"} ${index % 7 === 0 ? "opacity-50" : ""}`} />)}
            </div>
            <div className="flex items-center justify-between border-t border-white/20 pt-4 text-xs text-white/75"><span>Last checked just now</span><Link href="/studio/database" className="inline-flex items-center gap-1 font-medium text-white hover:underline">Database health<IconArrowUpRight className="size-3.5" /></Link></div>
          </CardContent>
        </Card>
        <Card className="min-h-[318px] border-border/70 bg-card">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div><CardDescription className="font-mono text-[10px] tracking-[0.16em]">FEATURED WORK</CardDescription><CardTitle className="mt-2">Your studio in motion</CardTitle></div>
            <Badge variant="secondary" className="gap-1.5"><span className="size-1.5 rounded-full bg-primary" />Live</Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <Link href="/studio/works" className="group relative min-h-40 overflow-hidden rounded-2xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={data?.featuredWork?.image_url ? { backgroundImage: `linear-gradient(135deg, color-mix(in oklab, var(--primary) 45%, transparent), transparent), url(${data.featuredWork.image_url})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white"><div><p className="font-mono text-[9px] tracking-[0.14em] text-white/70">PUBLISHED WORK</p><p className="mt-1 text-sm font-medium">{data?.featuredWork?.title || "Build your featured showcase"}</p></div><span className="grid size-8 place-items-center rounded-full bg-white text-zinc-900 transition-transform group-hover:translate-x-0.5"><IconArrowUpRight className="size-4" /></span></div>
            </Link>
            <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-muted/60 p-3"><p className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground">PUBLISHED</p><p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "—" : published}</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="font-mono text-[9px] tracking-[0.12em] text-muted-foreground">RATE</p><p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "—" : `${publicationRate}%`}</p></div></div>
          </CardContent>
        </Card>
      </section>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Workspace metrics"
      >
        {metricConfig.map(({ label, key, href, icon: Icon }) => {
          const source = table(key);
          const value = key === "blogs" ? data?.publishedBlogs : source?.count;
          const helper =
            key === "appointments" && data?.pendingAppointments != null
              ? `${data.pendingAppointments} pending review`
              : key === "store_orders" && data?.pendingOrders != null
                ? `${data.pendingOrders} awaiting fulfillment`
                : key === "blogs"
                  ? `${data?.totalBlogs ?? 0} total stories`
                  : "Active workspace records";
          return (
            <Link
              key={key}
              href={href}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="h-full transition-colors group-hover:border-foreground/25">
                <CardHeader className="grid-cols-[1fr_auto] items-center">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                  <CardAction>
                    <Icon className="size-5 text-muted-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tracking-tight">
                    {loading ? (
                      <Skeleton className="h-9 w-20" />
                    ) : value == null ? (
                      "—"
                    ) : (
                      value.toLocaleString()
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {loading ? <Skeleton className="h-3 w-32" /> : helper}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section
        className="grid gap-4 xl:grid-cols-5"
        aria-label="Workspace activity summary"
      >
        <Card className="xl:col-span-3">
          <CardHeader className="border-b">
            <CardTitle>Records by area</CardTitle>
            <CardDescription>
              Current record counts across the workspace
            </CardDescription>
            <CardAction>
              <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {loading ? (
              <div className="space-y-5">
                {rows.map((row) => (
                  <Skeleton key={row.key} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              rows.map(({ key, label, href, icon: Icon, count, available }) => (
                <Link key={key} href={href} className="group block space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="group-hover:underline">{label}</span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {available && count != null
                        ? count.toLocaleString()
                        : "—"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{
                        width: `${available && count ? Math.max(4, Math.round((count / maxCount) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
          <CardFooter className="justify-between text-xs text-muted-foreground">
            <span>Counts from connected data sources</span>
            <Link
              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
              href="/studio/database"
            >
              Database health
              <IconArrowUpRight className="size-3.5" />
            </Link>
          </CardFooter>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
              <CardDescription>Journal publication progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-semibold tracking-tight">
                    {loading ? "—" : `${publicationRate}%`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    of stories published
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {loading ? "—" : `${published} of ${totalBlogs}`}
                </p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${loading ? 0 : publicationRate}%` }}
                />
              </div>
              <Button
                variant="outline"
                className="mt-5 w-full justify-between"
                render={<Link href="/studio/blogs" />}
              >
                Manage stories
                <IconArrowUpRight />
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
              <CardDescription>Common studio tools</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Reports",
                  href: "/studio/reports",
                  icon: IconChartBar,
                },
                {
                  label: "Database",
                  href: "/studio/database",
                  icon: IconDatabase,
                },
                { label: "AI studio", href: "/studio/ai", icon: IconSparkles },
                {
                  label: "Automations",
                  href: "/studio/automations",
                  icon: IconBolt,
                },
              ].map(({ label, href, icon: Icon }) => (
                <Button
                  key={href}
                  variant="outline"
                  className="h-auto justify-start gap-2 px-3 py-3"
                  render={<Link href={href} />}
                >
                  <Icon className="text-muted-foreground" />
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Latest updates across your workspace
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {data?.recent?.length ?? 0} updates
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="divide-y pt-0">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 py-4">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))
          ) : data?.recent?.length ? (
            data.recent.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 py-4 first:pt-4 hover:bg-muted/30"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <IconDatabase className="size-4 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <time
                  dateTime={item.date}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {new Date(item.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </time>
                <IconArrowUpRight className="size-4 text-muted-foreground" />
              </Link>
            ))
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-medium">No recent activity yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Workspace updates will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
