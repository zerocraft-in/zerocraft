"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconBriefcase,
  IconCalendarEvent,
  IconChartBar,
  IconChevronRight,
  IconCircleCheck,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { studio } from "@/lib/studio-config";
import { useStudioOverview } from "../use-studio-overview";

const metricConfig = [
  { label: "Total works", key: "works", icon: IconBriefcase },
  { label: "Active clients", key: "clients", icon: IconUsers },
  { label: "Appointments", key: "appointments", icon: IconCalendarEvent },
  { label: "Published stories", key: "blogs", icon: IconChartBar },
] as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export default function StudioOverviewPage() {
  const { data, loading, error, refresh } = useStudioOverview();
  const count = (key: string) =>
    data?.tables.find((item) => item.name === key)?.count ?? null;
  const publishedRate = data?.totalBlogs
    ? Math.round(((data.publishedBlogs ?? 0) / data.totalBlogs) * 100)
    : null;

  return (
    <main className="mx-auto w-full max-w-[1180px] space-y-7 px-6 py-7 text-foreground antialiased lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Workspace</span>
            <IconChevronRight className="size-3" />
            <span>Studio</span>
          </div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-medium tracking-tight">
            <IconBriefcase className="size-6" /> Studio
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Your central workspace for works, clients, appointments, and studio
            operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            render={<Link href={`${ADMIN_ROUTES.studio.works}?create=1`} />}
            nativeButton={false}
          >
            <IconPlus /> New work
          </Button>
        </div>
      </header>

      <nav
        className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm"
        aria-label="Studio navigation"
      >
        {[
          { label: "Overview", href: ADMIN_ROUTES.studio.overview },
          { label: "Works", href: ADMIN_ROUTES.studio.works },
          { label: "Clients", href: ADMIN_ROUTES.studio.clients },
          { label: "Appointments", href: ADMIN_ROUTES.studio.appointments },
          { label: "Journal", href: ADMIN_ROUTES.studio.blogs },
        ].map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${index === 0 ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </div>
      )}

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Studio metrics"
      >
        {metricConfig.map((metric) => {
          const Icon = metric.icon;
          const value = count(metric.key);
          return (
            <Card key={metric.key} className="border-border shadow-none">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>{metric.label}</CardDescription>
                <Icon className="size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">
                  {loading ? <Skeleton className="h-8 w-14" /> : (value ?? "—")}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {metric.key === "blogs"
                    ? `${publishedRate ?? "—"}% published`
                    : "Connected workspace data"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section
        className="grid gap-3 sm:grid-cols-2"
        aria-label="Operational alerts"
      >
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardDescription>Inventory</CardDescription>
            <CardTitle>Low-stock alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {loading ? "—" : (data?.lowStock ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Items at or below their reorder point.
            </p>
            <Button
              className="mt-4"
              size="sm"
              variant="outline"
              render={<Link href="/store/inventory" />}
              nativeButton={false}
            >
              Review inventory
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardDescription>System</CardDescription>
            <CardTitle>Unread notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {loading ? "—" : (data?.unreadNotifications ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Live admin alerts from the workspace.
            </p>
            <Button
              className="mt-4"
              size="sm"
              variant="outline"
              render={<Link href="/settings" />}
              nativeButton={false}
            >
              Open settings
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="border-border shadow-none">
          <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border">
            <div>
              <CardTitle className="text-sm">Studio information</CardTitle>
              <CardDescription className="mt-1">
                Live profile details connected to Supabase.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={ADMIN_ROUTES.system.settings} />}
              nativeButton={false}
            >
              <IconEdit /> Edit
            </Button>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
            {[
              ["Studio name", "Zerocraft Studio"],
              ["Owner", data?.workspaceProfile?.full_name || "—"],
              ["Website", studio.url.replace(/^https?:\/\//, "")],
              ["Email", data?.workspaceProfile?.email || studio.email],
              ["Role", data?.workspaceProfile?.role || "—"],
              ["Timezone", "Asia / Kolkata"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="mt-1 text-sm font-medium">
                  {loading ? "—" : value}
                </div>
              </div>
            ))}
          </CardContent>
          <div className="flex items-center gap-2 border-t border-border px-5 py-4 text-[11px] text-muted-foreground">
            <IconCircleCheck className="size-4" /> Live workspace profile{" "}
            <Link
              href={ADMIN_ROUTES.system.settings}
              className="ml-auto font-semibold text-foreground hover:underline"
            >
              Manage profile
            </Link>
          </div>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border">
            <div>
              <CardTitle className="text-sm">Recent activity</CardTitle>
              <CardDescription className="mt-1">
                The latest changes across your studio.
              </CardDescription>
            </div>
            <Link
              href={ADMIN_ROUTES.operations.reports}
              className="text-[11px] font-semibold hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-5 p-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : data?.recent.length ? (
              <div className="divide-y divide-border">
                {data.recent.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start gap-3 px-5 py-4 transition hover:bg-muted/40"
                  >
                    <span className="mt-1 size-2 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {item.detail}
                      </span>
                    </span>
                    <time className="whitespace-nowrap text-[10px] text-muted-foreground">
                      {formatDate(item.date)}
                    </time>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-5 text-xs text-muted-foreground">
                No activity has been recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-border bg-muted/30 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Keep your studio moving</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a work item, add a client, or book your next appointment.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              render={<Link href={`${ADMIN_ROUTES.studio.works}?create=1`} />}
              nativeButton={false}
            >
              <IconPlus /> Add work
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={ADMIN_ROUTES.studio.clients} />}
              nativeButton={false}
            >
              View clients <IconArrowRight />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
