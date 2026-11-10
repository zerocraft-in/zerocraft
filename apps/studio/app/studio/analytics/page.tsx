"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  FileText,
  RefreshCw,
  Target,
} from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import { Card, CardContent, CardTitle } from "@zerocraft/ui/components/card";
import { StudioLoadTransition } from "@/components/studio-loading";

type Period = "3m" | "6m" | "12m";
type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
type ProjectStage = "planning" | "active" | "review" | "completed" | "on_hold" | "cancelled";
type AnalyticsData = {
  generatedAt: string;
  period: Period;
  startsAt: string;
  permissions: { leads: boolean; projects: boolean; content: boolean };
  leads: {
    total: number;
    stages: Record<LeadStage, number>;
    qualified: number;
    open: number;
    qualificationRate: number | null;
  } | null;
  projects: {
    total: number;
    active: number;
    stages: Record<ProjectStage, number>;
  } | null;
  content: {
    published: number;
    recentPublished: Array<{
      id: string;
      title: string;
      content_type: string | null;
      published_at: string | null;
    }>;
  } | null;
};

const periods: { value: Period; label: string }[] = [
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "12m", label: "12 months" },
];
const leadStages: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];
const projectStages: { key: ProjectStage; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "active", label: "Active" },
  { key: "review", label: "In review" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On hold" },
  { key: "cancelled", label: "Cancelled" },
];

const cardClass =
  "rounded-[28px] border-white/[.1] bg-white/[.055] p-5 text-foreground shadow-none";
const iconClass =
  "grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-zinc-300";

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className={cardClass}>
      <CardContent className="flex min-h-[170px] flex-col justify-between p-0">
        <span className={iconClass}>{icon}</span>
        <div>
          <CardTitle className="text-sm font-medium text-zinc-400">{label}</CardTitle>
          <strong className="mt-2 block text-5xl font-light leading-none tracking-[-.04em]">
            {value}
          </strong>
          <p className="mt-2 text-xs text-zinc-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function exportCsv(data: AnalyticsData) {
  const rows: string[][] = [
    ["Metric", "Value", "Period"],
    ["New leads", data.leads ? String(data.leads.total) : "Restricted", data.period],
    ["Qualified or progressed leads", data.leads ? String(data.leads.qualified) : "Restricted", data.period],
    ["Open leads", data.leads ? String(data.leads.open) : "Restricted", data.period],
    ["Active projects", data.projects ? String(data.projects.active) : "Restricted", "Current"],
    ["Published content", data.content ? String(data.content.published) : "Restricted", data.period],
    [],
    ["Lead stage", "Count", data.period],
    ...(data.leads
      ? leadStages.map(({ key, label }) => [label, String(data.leads!.stages[key]), data.period])
      : []),
    [],
    ["Project status", "Count", "Current"],
    ...(data.projects
      ? projectStages.map(({ key, label }) => [label, String(data.projects!.stages[key]), "Current"])
      : []),
  ];
  const csv = rows
    .map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `zerocraft-analytics-${data.period}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StudioAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("3m");
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/studio/analytics?period=${period}`, {
        cache: "no-store",
        signal,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Analytics could not be loaded.");
      }
      setData(payload as AnalyticsData);
    } catch (caught) {
      if (signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "Analytics could not be loaded.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  const periodLabel = useMemo(
    () => periods.find((item) => item.value === period)?.label ?? "selected period",
    [period],
  );
  const maxLeadCount = Math.max(1, ...leadStages.map(({ key }) => data?.leads?.stages[key] ?? 0));
  const maxProjectCount = Math.max(1, ...projectStages.map(({ key }) => data?.projects?.stages[key] ?? 0));

  return (
    <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-93px)] overflow-visible px-8 pb-10 pt-5 max-md:-mx-4 max-md:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/studio" className="text-[15px] text-zinc-400 hover:text-white">
          ZeroCraft Studio <span className="text-zinc-700">/</span>{" "}
          <span className="text-white">Analytics</span>
        </Link>
        <span className="flex-1" />
        <div className="flex flex-wrap items-center gap-2" aria-label="Analytics period">
          {periods.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={period === item.value ? "default" : "outline"}
              aria-pressed={period === item.value}
              onClick={() => setPeriod(item.value)}
              className={period === item.value ? "rounded-full" : "rounded-full border-white/15 bg-white/[.06]"}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-white/15 bg-white/[.06]"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-white/15 bg-white/[.06]"
          onClick={() => data && exportCsv(data)}
          disabled={!data || loading}
        >
          <ArrowDownToLine size={15} />
          Export CSV
        </Button>
      </div>

      <section className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(42px,5vw,64px)] font-extralight leading-none tracking-[-.04em]">
            Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-400">
            Live Studio records for the {periodLabel}. Metrics only reflect data your workspace records.
          </p>
        </div>
        {data?.generatedAt && (
          <p className="text-xs text-zinc-500">Updated {new Date(data.generatedAt).toLocaleTimeString()}</p>
        )}
      </section>

      {error && (
        <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300/20 bg-red-300/[.08] p-4 text-sm text-red-100">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setRefreshKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      )}

      <StudioLoadTransition
        loading={loading && !data}
        label="Loading live analytics…"
        loadingClassName="mt-7 min-h-44 rounded-[28px] border border-white/[.07] bg-white/[.035]"
      >
      {data ? (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="New leads"
              value={data.leads ? data.leads.total.toLocaleString() : "—"}
              detail={data.permissions.leads ? `Created in the last ${periodLabel}` : "Lead data restricted"}
              icon={<Target size={18} />}
            />
            <Metric
              label="Qualified / progressed"
              value={data.leads?.qualificationRate === null || !data.leads ? "—" : `${data.leads.qualificationRate}%`}
              detail={data.leads ? `${data.leads.qualified} of ${data.leads.total} leads currently qualified or later` : "Lead data restricted"}
              icon={<BarChart3 size={18} />}
            />
            <Metric
              label="Active projects"
              value={data.projects ? data.projects.active.toLocaleString() : "—"}
              detail={data.permissions.projects ? "Current project status" : "Project data restricted"}
              icon={<BriefcaseBusiness size={18} />}
            />
            <Metric
              label="Published content"
              value={data.content ? data.content.published.toLocaleString() : "—"}
              detail={data.permissions.content ? `Published in the last ${periodLabel}` : "Content data restricted"}
              icon={<BookOpen size={18} />}
            />
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <Card className={`${cardClass} min-h-[360px]`}>
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-medium">Lead funnel</CardTitle>
                    <p className="mt-1 text-sm text-zinc-500">Current stage of leads created during this period</p>
                  </div>
                  <span className={iconClass}><Target size={17} /></span>
                </div>
                {data.leads ? (
                  <div className="mt-6 space-y-4">
                    {leadStages.map(({ key, label }) => {
                      const count = data.leads!.stages[key];
                      return (
                        <div key={key} className="grid grid-cols-[90px_1fr_42px] items-center gap-3 text-sm">
                          <span className="text-zinc-400">{label}</span>
                          <span
                            role="meter"
                            aria-label={`${label} leads`}
                            aria-valuemin={0}
                            aria-valuemax={maxLeadCount}
                            aria-valuenow={count}
                            className="h-2 overflow-hidden rounded-full bg-white/[.08]"
                          >
                            <span
                              className="block h-full rounded-full bg-orange-400"
                              style={{ width: `${(count / maxLeadCount) * 100}%` }}
                            />
                          </span>
                          <span className="text-right tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                    {!data.leads.total && <p className="text-sm text-zinc-500">No leads were created during this period.</p>}
                  </div>
                ) : (
                  <p className="mt-8 text-sm text-zinc-500">You do not have permission to view lead analytics.</p>
                )}
              </CardContent>
            </Card>

            <Card className={`${cardClass} min-h-[360px]`}>
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-medium">Project delivery</CardTitle>
                    <p className="mt-1 text-sm text-zinc-500">Current workspace project statuses</p>
                  </div>
                  <Link href="/studio/projects" aria-label="Open Studio projects" className="grid size-9 place-items-center rounded-full bg-white text-black">
                    <ArrowUpRight size={17} />
                  </Link>
                </div>
                {data.projects ? (
                  <div className="mt-6 space-y-4">
                    {projectStages.map(({ key, label }) => {
                      const count = data.projects!.stages[key];
                      return (
                        <div key={key} className="grid grid-cols-[100px_1fr_42px] items-center gap-3 text-sm">
                          <span className="text-zinc-400">{label}</span>
                          <span
                            role="meter"
                            aria-label={`${label} projects`}
                            aria-valuemin={0}
                            aria-valuemax={maxProjectCount}
                            aria-valuenow={count}
                            className="h-2 overflow-hidden rounded-full bg-white/[.08]"
                          >
                            <span
                              className="block h-full rounded-full bg-violet-300"
                              style={{ width: `${(count / maxProjectCount) * 100}%` }}
                            />
                          </span>
                          <span className="text-right tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                    {!data.projects.total && <p className="text-sm text-zinc-500">No projects are recorded.</p>}
                  </div>
                ) : (
                  <p className="mt-8 text-sm text-zinc-500">You do not have permission to view project analytics.</p>
                )}
              </CardContent>
            </Card>

            <Card className={`${cardClass} min-h-[260px] xl:col-span-2`}>
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-medium">Recently published</CardTitle>
                    <p className="mt-1 text-sm text-zinc-500">Content published during the selected period</p>
                  </div>
                  <Link href="/studio/content" aria-label="Open Studio content" className="grid size-9 place-items-center rounded-full bg-white text-black">
                    <ArrowUpRight size={17} />
                  </Link>
                </div>
                {data.content ? data.content.recentPublished.length ? (
                  <div className="mt-5 divide-y divide-white/[.08]">
                    {data.content.recentPublished.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="mt-1 text-xs capitalize text-zinc-500">{(item.content_type ?? "page").replaceAll("_", " ")}</p>
                        </div>
                        <time className="shrink-0 text-xs text-zinc-500">{formatDate(item.published_at)}</time>
                      </div>
                    ))}
                    {data.content.published > data.content.recentPublished.length && (
                      <p className="pt-3 text-xs text-zinc-500">
                        Showing {data.content.recentPublished.length} of {data.content.published} published items.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-8 text-sm text-zinc-500">No content was published during this period.</p>
                ) : (
                  <p className="mt-8 text-sm text-zinc-500">You do not have permission to view content analytics.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.025] px-4 py-3 text-xs leading-relaxed text-zinc-500">
            Website visits, page views, response time, revenue, margins, and client retention are not tracked in the available Studio data, so they are not reported here.
          </p>
        </>
      ) : !error ? (
        <div className="mt-7 rounded-2xl border border-white/[.08] bg-white/[.025] p-6 text-sm text-zinc-400">
          Analytics data is not available.
        </div>
      ) : null}
      </StudioLoadTransition>
    </div>
  );
}
