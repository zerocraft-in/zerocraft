"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Clock3,
  FileImage,
  FileText,
  FolderKanban,
  Network,
  RefreshCw,
  Target,
} from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import { Card, CardContent, CardTitle } from "@zerocraft/ui/components/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@zerocraft/ui/components/empty";
import { StudioHeader } from "./studio-header";
import { StudioLoadTransition } from "@/components/studio-loading";

type Stage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
type Overview = {
  generatedAt: string;
  permissions: { leads: boolean; projects: boolean; media: boolean; content: boolean };
  leadCounts: Record<Stage, number> | null;
  activeProjects: number | null;
  projects: Array<{ id: string; name: string; status: string; progress: number; deadline: string | null }>;
  mediaAssets: number | null;
  publishedContent: number | null;
  actions: Array<{ id: string; title: string; context: string; dueAt: string | null }>;
};

const stages: { key: Stage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const cardClass =
  "rounded-[28px] border-white/[.1] bg-white/[.055] p-5 text-foreground shadow-none backdrop-blur-[28px]";
const iconClass =
  "grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-zinc-300";

function displayCount(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function displayDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No due date"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function Metric({
  href,
  label,
  value,
  description,
  icon,
}: {
  href: string;
  label: string;
  value: number | null;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className={cardClass}>
      <CardContent className="flex min-h-[168px] flex-col justify-between p-0">
        <div className="flex items-center justify-between gap-3">
          <span className={iconClass}>{icon}</span>
          <Link
            href={href}
            aria-label={`Open ${label.toLowerCase()}`}
            className="grid size-9 place-items-center rounded-full bg-white text-black transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
          >
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div>
          <CardTitle className="text-sm font-medium text-zinc-400">
            {label}
          </CardTitle>
          <strong className="mt-2 block text-5xl font-light leading-none tracking-[-.04em]">
            {displayCount(value)}
          </strong>
          <p className="mt-2 text-xs text-zinc-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudioOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState("Welcome back.");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/studio/overview", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Overview data could not be loaded.");
      setData(payload as Overview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Overview data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.");
  }, [load]);

  const openLeads = useMemo(() => {
    if (!data?.leadCounts) return null;
    return Object.entries(data.leadCounts)
      .filter(([stage]) => stage !== "won" && stage !== "lost")
      .reduce((total, [, count]) => total + count, 0);
  }, [data?.leadCounts]);

  const stageTotal = useMemo(
    () => Object.values(data?.leadCounts ?? {}).reduce((total, count) => total + count, 0),
    [data?.leadCounts],
  );

  const insight = useMemo(() => {
    if (!data) return "";
    const parts: string[] = [];
    if (openLeads !== null) parts.push(`${openLeads} open ${openLeads === 1 ? "lead" : "leads"}`);
    if (data.activeProjects !== null)
      parts.push(`${data.activeProjects} active ${data.activeProjects === 1 ? "project" : "projects"}`);
    return parts.length
      ? `${parts.join(" · ")} in your workspace right now.`
      : "Workspace data is restricted for your account.";
  }, [data, openLeads]);

  return (
    <div className="ml-18">
      <StudioHeader />
      <section className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(44px,5vw,72px)] font-extralight leading-none tracking-[-.045em]">
            {greeting}
          </h1>
          <p className="mt-3 text-[15px] text-zinc-400">
            A live view of your studio work and publishing.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-white/15 bg-white/[.04]"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </section>

      {error && (
        <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300/20 bg-red-300/[.08] p-4 text-sm text-red-100">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      )}

      <StudioLoadTransition
        loading={loading && !data}
        label="Loading live overview data…"
        loadingClassName="mt-7 min-h-44 rounded-[28px] border border-white/[.07] bg-white/[.035]"
      >
      {data ? (
        <>
          <div className="mt-7 grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
            <Card className="col-span-2 row-span-2 min-h-[360px] rounded-[30px] border-white/[.1] bg-white/[.055] p-6 text-foreground shadow-none backdrop-blur-[28px] max-[640px]:col-span-1">
              <CardContent className="flex h-full flex-col justify-between p-0">
                <div className="flex items-center justify-between">
                  <span className={iconClass}>
                    <Network size={18} />
                  </span>
                  <Link
                    href="/studio/inquiries"
                    aria-label="Open lead pipeline"
                    className="grid size-9 place-items-center rounded-full bg-white text-black transition-transform hover:scale-105"
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </div>
                <div>
                  <CardTitle className="text-sm font-medium text-zinc-400">Lead pipeline</CardTitle>
                  <div className="mt-3 flex items-end gap-3">
                    <strong className="text-7xl font-light leading-none tracking-[-.04em] text-foreground">
                      {displayCount(openLeads)}
                    </strong>
                    <span className="pb-1 text-sm text-zinc-500">open leads</span>
                  </div>
                  <div className="mt-7 space-y-3">
                    {stages.map((stage) => {
                      const count = data.leadCounts?.[stage.key] ?? null;
                      const width = count === null || !stageTotal ? 0 : (count / stageTotal) * 100;
                      return (
                        <div key={stage.key} className="grid grid-cols-[76px_1fr_28px] items-center gap-3 text-xs text-zinc-400">
                          <span>{stage.label}</span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <span
                              className="block h-full rounded-full transition-all duration-500"
                              style={{ width: `${width}%`, backgroundColor: "var(--brand-accent)" }}
                            />
                          </span>
                          <span className="text-right tabular-nums text-zinc-400">{count === null ? "—" : count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Metric href="/studio/projects" label="Active projects" value={data.activeProjects} description="Currently in delivery" icon={<FolderKanban size={18} />} />
            <Metric href="/studio/inquiries" label="Open opportunities" value={openLeads} description="Leads not won or closed" icon={<Target size={18} />} />
            <Metric href="/studio/media" label="Media assets" value={data.mediaAssets} description="Files in the Studio library" icon={<FileImage size={18} />} />
            <Metric href="/studio/content" label="Published content" value={data.publishedContent} description="Live CMS entries" icon={<FileText size={18} />} />

            <Card className="col-span-2 min-h-[250px] rounded-[28px] border-white/[.1] bg-white/[.055] p-5 shadow-none max-[640px]:col-span-1">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-medium">Project delivery</CardTitle>
                    <p className="mt-1 text-xs text-zinc-500">Latest projects and saved progress</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full border-white/15" render={<Link href="/studio/projects" />}>
                    All projects
                  </Button>
                </div>
                {!data.permissions.projects ? (
                  <p className="mt-6 text-sm text-zinc-500">You do not have permission to view projects.</p>
                ) : data.projects.length ? (
                  <div className="mt-4 divide-y divide-white/[.08]">
                    {data.projects.slice(0, 3).map((project) => (
                      <div key={project.id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(90px,.8fr)_minmax(70px,1fr)] items-center gap-3 py-3 text-sm max-[640px]:grid-cols-2">
                        <span className="min-w-0 truncate" title={project.name}>{project.name}</span>
                        <span className="text-xs capitalize text-zinc-500">{statusLabel(project.status)}</span>
                        <div className="flex items-center gap-2 max-[640px]:col-span-2">
                          <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-white/10">
                            <span className="block h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
                          </span>
                          <span className="w-9 text-right text-xs tabular-nums text-zinc-400">{project.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty className="mt-6 border-none bg-white/[.02] p-6 rounded-2xl">
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="size-9">
                        <FolderKanban size={16} className="text-zinc-500" />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm font-medium text-zinc-300">No active projects</EmptyTitle>
                      <EmptyDescription className="text-xs text-zinc-500">
                        Projects created or converted from won leads will appear here with live progress.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[250px] rounded-[28px] border-white/[.1] bg-white/[.055] p-5 shadow-none">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">Next actions</CardTitle>
                  <Clock3 size={17} className="text-zinc-500" />
                </div>
                {!data.permissions.leads ? (
                  <p className="mt-6 text-sm text-zinc-500">You do not have permission to view lead actions.</p>
                ) : data.actions.length ? (
                  <div className="mt-4 space-y-2">
                    {data.actions.slice(0, 3).map((action) => (
                      <div key={action.id} className="flex items-start gap-3 rounded-xl border border-white/[.08] bg-white/[.025] p-3">
                        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-violet-200 text-black"><Check size={13} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{action.title}</span>
                          <span className="mt-1 block truncate text-xs text-zinc-500">{action.context}</span>
                        </span>
                        <time className="shrink-0 text-[10px] text-zinc-500">{displayDate(action.dueAt)}</time>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty className="mt-6 border-none bg-white/[.02] p-6 rounded-2xl">
                    <EmptyHeader>
                      <EmptyMedia variant="icon" className="size-9">
                        <Clock3 size={16} className="text-zinc-500" />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm font-medium text-zinc-300">All caught up</EmptyTitle>
                      <EmptyDescription className="text-xs text-zinc-500">
                        No pending follow-ups or deliverable actions recorded today.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[250px] rounded-[28px] border-white/[.1] bg-white/[.055] p-5 shadow-none">
              <CardContent className="flex h-full flex-col justify-between p-0">
                <div className="flex items-center justify-between">
                  <span className={iconClass}><BriefcaseBusiness size={17} /></span>
                  <span className="text-xs uppercase tracking-[.14em] text-zinc-500">Workspace snapshot</span>
                </div>
                <p className="mt-8 text-xl font-light leading-relaxed text-zinc-200">
                  {insight}
                </p>
                {data.generatedAt && <p className="mt-4 text-[10px] text-zinc-600">Updated {new Date(data.generatedAt).toLocaleTimeString()}</p>}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
      </StudioLoadTransition>
    </div>
  );
}
