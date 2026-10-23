"use client";

import Link from "next/link";
import {
  IconActivity,
  IconAlertCircle,
  IconArrowUpRight,
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconShoppingBag,
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
import { PageHeader, PageShell } from "@/components/studio/page-header";
import { useStudioOverview } from "./use-studio-overview";

const metricConfig = [
  {
    label: "Portfolio projects",
    key: "works",
    href: "/works",
    icon: IconBriefcase,
  },
  {
    label: "Published stories",
    key: "blogs",
    href: "/blogs",
    icon: IconFileText,
  },
  {
    label: "Appointments",
    key: "appointments",
    href: "/appointments",
    icon: IconCalendar,
  },
  {
    label: "Store orders",
    key: "store_orders",
    href: "/orders",
    icon: IconShoppingBag,
  },
  { label: "Clients", key: "clients", href: "/clients", icon: IconUsers },
] as const;

export default function StudioDashboard() {
  const { data, loading, error, refresh } = useStudioOverview();
  const table = (name: string) =>
    data?.tables.find((item) => item.name === name);
  const rows = metricConfig.map((row) => ({
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
  const checkedAtLabel = data?.checkedAt
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(data.checkedAt))
    : null;

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Studio overview"
        title="Welcome to ZeroCraft"
        description="Manage your works, clients, appointments, and journal from one place."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <IconRefresh className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button
              size="sm"
              render={<Link href="/works?create=1" />}
              nativeButton={false}
            >
              <IconPlus /> New work
            </Button>
          </>
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
        >
          <IconAlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
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
            <IconAlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
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
            render={<Link href="/settings" />}
            nativeButton={false}
          >
            Review sources <IconArrowUpRight />
          </Button>
        </div>
      )}

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Studio metrics"
      >
        {rows.map(({ label, key, href, icon: Icon, count }) => (
          <Link
            key={key}
            href={href}
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors group-hover:border-foreground/30">
              <CardHeader className="grid-cols-[1fr_auto] items-center pb-2">
                <CardDescription>{label}</CardDescription>
                <CardAction>
                  <Icon className="size-4 text-muted-foreground" />
                </CardAction>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <p className="text-3xl font-semibold tabular-nums">
                    {count ?? "—"}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {key === "blogs"
                    ? totalBlogs + " total stories"
                    : key === "appointments"
                      ? (data?.pendingAppointments ?? 0) + " pending review"
                      : key === "store_orders"
                        ? (data?.pendingOrders ?? 0) + " awaiting fulfillment"
                        : "Active workspace records"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section
        className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]"
        aria-label="Studio activity"
      >
        <Card>
          <CardHeader className="border-b">
            <div>
              <CardTitle>Records by area</CardTitle>
              <CardDescription>
                Current record counts across your studio
              </CardDescription>
            </div>
            <CardAction>
              <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {loading
              ? rows.map((row) => (
                  <Skeleton key={row.key} className="h-8 w-full" />
                ))
              : rows.map(
                  ({ key, label, href, icon: Icon, count, available }) => (
                    <Link
                      key={key}
                      href={href}
                      className="group block space-y-2"
                    >
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
                            width:
                              (available && count
                                ? Math.max(
                                    4,
                                    Math.round((count / maxCount) * 100),
                                  )
                                : 0) + "%",
                          }}
                        />
                      </div>
                    </Link>
                  ),
                )}
          </CardContent>
          <CardFooter className="justify-between text-xs text-muted-foreground">
            <span>
              {checkedAtLabel
                ? "Checked at " + checkedAtLabel
                : "Waiting for live data"}
            </span>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              Workspace settings <IconArrowUpRight className="size-3.5" />
            </Link>
          </CardFooter>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
              <CardDescription>Journal publication progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-semibold tracking-tight">
                    {loading ? "—" : publicationRate + "%"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    of stories published
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {loading ? "—" : published + " of " + totalBlogs}
                </p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: (loading ? 0 : publicationRate) + "%" }}
                />
              </div>
              <Button
                variant="outline"
                className="mt-5 w-full justify-between"
                render={<Link href="/blogs" />}
                nativeButton={false}
              >
                Manage stories <IconArrowUpRight />
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
              <CardDescription>Common studio tools</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {[
                ["Reports", "/reports", IconChartBar],
                ["Store", "/store", IconShoppingBag],
                ["Settings", "/settings", IconSettings],
              ].map(([label, href, Icon]) => (
                <Button
                  key={href as string}
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start gap-2 px-3 py-3"
                  render={<Link href={href as string} />}
                  nativeButton={false}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {label as string}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader className="border-b">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest updates across your studio</CardDescription>
          </div>
          <CardAction>
            <Badge variant="secondary">
              {data?.recent?.length ?? 0} updates
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="divide-y pt-0">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="flex gap-3 py-4">
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
                className="flex items-center gap-3 py-4 transition hover:bg-muted/30"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <IconActivity className="size-4 text-muted-foreground" />
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
            <p className="py-8 text-sm text-muted-foreground">
              No activity has been recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
