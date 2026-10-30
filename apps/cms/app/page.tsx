"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconActivity,
  IconArrowUpRight,
  IconBook,
  IconBriefcase,
  IconChartBar,
  IconCheck,
  IconChevronRight,
  IconFileText,
  IconLayoutDashboard,
  IconMail,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconShoppingBag,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudioOverview } from "./use-studio-overview";

type CrmSnapshot = {
  clients: number;
  leads: Array<{
    id: string;
    name: string;
    company: string;
    stage: string;
    source: string;
  }>;
  projects: Array<{ id: string; name: string; status: string }>;
  stageCounts: Record<string, number>;
};
const stageLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

function StatCard({
  label,
  value,
  description,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string | null;
  description: string;
  href: string;
  icon: typeof IconActivity;
  accent: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full border-border/80 shadow-none transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <CardDescription>{label}</CardDescription>
          <span
            className={`grid size-8 place-items-center rounded-lg ${accent}`}
          >
            <Icon className="size-4" />
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {value ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function StudioDashboard() {
  const { data, loading, error, refresh } = useStudioOverview();
  const [crm, setCrm] = useState<CrmSnapshot | null>(null);
  const table = (name: string) =>
    data?.tables.find((item) => item.name === name);
  const totalBlogs = data?.totalBlogs ?? 0;
  const published = data?.publishedBlogs ?? 0;
  const publicationRate = totalBlogs
    ? Math.round((published / totalBlogs) * 100)
    : 0;
  const crmOpenLeads = crm
    ? ["new", "contacted", "qualified", "proposal"].reduce(
        (sum, stage) => sum + (crm.stageCounts[stage] || 0),
        0,
      )
    : null;
  const activeProjects =
    crm?.projects.filter((project) =>
      ["planning", "active", "review"].includes(project.status),
    ).length ?? null;
  const checkedAt = data?.checkedAt
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(data.checkedAt))
    : null;
  useEffect(() => {
    let active = true;
    void fetch("/api/studio/crm", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active && payload) setCrm(payload);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <IconLayoutDashboard className="size-4" />
              Zerocraft platform
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Good morning, Studio.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Your operating view across content, commerce, relationships, and
              delivery.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <IconRefresh className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button size="sm" render={<Link href="/content" />}>
              <IconPlus />
              Create content
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <IconActivity className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Workspace data needs attention</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Platform at a glance"
      >
        <StatCard
          label="Content pages"
          value={table("blogs")?.count ?? null}
          description={`${published} published journal stories`}
          href="/content"
          icon={IconFileText}
          accent="bg-violet-500/10 text-violet-600 dark:text-violet-300"
        />
        <StatCard
          label="Open leads"
          value={crmOpenLeads}
          description="Need a next action"
          href="/crm"
          icon={IconUsers}
          accent="bg-blue-500/10 text-blue-600 dark:text-blue-300"
        />
        <StatCard
          label="Active projects"
          value={activeProjects}
          description="Planning, active or review"
          href="/projects"
          icon={IconBriefcase}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
        />
        <StatCard
          label="Store orders"
          value={data?.commerce.totalOrders ?? null}
          description={`${data?.pendingOrders ?? 0} awaiting fulfilment`}
          href="/orders"
          icon={IconShoppingBag}
          accent="bg-amber-500/10 text-amber-600 dark:text-amber-300"
        />
        <StatCard
          label="Clients"
          value={crm?.clients ?? table("clients")?.count ?? null}
          description="Relationship records"
          href="/clients"
          icon={IconUsers}
          accent="bg-pink-500/10 text-pink-600 dark:text-pink-300"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Content publishing</CardTitle>
                <CardDescription>
                  Manage the public-facing layer of the platform.
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 sm:grid-cols-[1fr_180px]">
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-semibold tracking-tight">
                    {loading ? "—" : `${publicationRate}%`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    journal stories published
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {published} of {totalBlogs}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${publicationRate}%` }}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="justify-between"
                  render={<Link href="/content" />}
                >
                  <span className="flex items-center gap-2">
                    <IconFileText />
                    Pages
                  </span>
                  <IconArrowUpRight />
                </Button>
                <Button
                  variant="outline"
                  className="justify-between"
                  render={<Link href="/works" />}
                >
                  <span className="flex items-center gap-2">
                    <IconBriefcase />
                    Works
                  </span>
                  <IconArrowUpRight />
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <IconSparkles className="size-5 text-primary" />
              <p className="mt-6 text-sm font-medium">Content Studio</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Draft pages, publish stories, and keep metadata close to every
                record.
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-2 h-auto px-0"
                render={<Link href="/content" />}
              >
                Open studio <IconArrowUpRight />
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Commerce pulse</CardTitle>
                <CardDescription>Store health at a glance.</CardDescription>
              </div>
              <IconShoppingBag className="size-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="mt-1 text-2xl font-semibold">
                  {data?.commerce.pendingOrders ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Fulfilled</p>
                <p className="mt-1 text-2xl font-semibold">
                  {data?.commerce.fulfilledOrders ?? "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <span
                className={`grid size-8 place-items-center rounded-lg ${(data?.lowStock || 0) > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}
              >
                <IconCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Inventory</p>
                <p className="text-xs text-muted-foreground">
                  {(data?.lowStock || 0) > 0
                    ? `${data?.lowStock} items need attention`
                    : "No low-stock alerts"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-between"
              render={<Link href="/store" />}
            >
              Open commerce <IconArrowUpRight />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>CRM pipeline</CardTitle>
                <CardDescription>
                  Recent enquiries and relationship momentum.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" render={<Link href="/crm" />}>
                Open CRM <IconArrowUpRight />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 border-b sm:grid-cols-5">
              {["new", "contacted", "qualified", "proposal", "won"].map(
                (stage) => (
                  <div
                    key={stage}
                    className="border-r px-4 py-3 last:border-r-0"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {stageLabels[stage]}
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {crm?.stageCounts[stage] ?? "—"}
                    </p>
                  </div>
                ),
              )}
            </div>
            <div className="divide-y">
              {crm?.leads.slice(0, 4).map((lead) => (
                <Link
                  href="/crm"
                  key={lead.id}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40"
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {lead.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {lead.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {lead.company || lead.source}
                    </span>
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {stageLabels[lead.stage] || lead.stage}
                  </Badge>
                  <IconChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
              {!crm?.leads?.length && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No CRM leads yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common platform tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              ["New page", "/content", IconFileText],
              ["New lead", "/leads", IconUsers],
              ["New project", "/projects", IconBriefcase],
              ["Open reports", "/reports", IconChartBar],
              ["Workspace settings", "/settings", IconSettings],
            ].map(([label, href, Icon]) => (
              <Button
                key={href as string}
                variant="outline"
                className="h-11 justify-between"
                render={<Link href={href as string} />}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4 text-muted-foreground" />
                  {label as string}
                </span>
                <IconChevronRight className="size-4 text-muted-foreground" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>
                Latest updates across the platform.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {data?.recent?.length ?? 0} updates
            </Badge>
          </div>
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
                  className="hidden shrink-0 text-xs text-muted-foreground sm:block"
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
        <CardFooter className="justify-between border-t text-xs text-muted-foreground">
          <span>
            {checkedAt
              ? `Last checked at ${checkedAt}`
              : "Waiting for live data"}
          </span>
          <Link
            href="/system-health"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            System health <IconArrowUpRight className="size-3.5" />
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
