import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  CircleGauge,
  Clock3,
  FileImage,
  FolderKanban,
  Image,
  MoreHorizontal,
  Network,
  Plus,
  Radio,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/components/card";
import { getStudioDashboardData } from "@/lib/studio-dashboard";
import { StudioHeader } from "./studio-header";

const baseCard =
  "rounded-[32px] border-white/[.1] bg-white/[.06] p-6 text-foreground shadow-none backdrop-blur-[28px]";
const lightCard = `${baseCard} bg-white text-[#0a0a0b]`;
const openButton =
  "grid size-11 place-items-center rounded-full bg-white text-[#0a0a0b] transition-transform hover:scale-105";

function MetricIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-10 place-items-center rounded-full border border-current/60 opacity-80">
      {children}
    </span>
  );
}
function MiniBars() {
  return (
    <span className="flex h-8 items-end gap-1" aria-hidden="true">
      {[6, 10, 15, 9, 20, 13, 25].map((height, index) => (
        <i
          key={index}
          className="w-1.5 rounded-t bg-current"
          style={{ height }}
        />
      ))}
    </span>
  );
}
function MiniDots() {
  return (
    <span className="grid w-20 grid-cols-5 gap-2" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <i
          key={index}
          className={
            index < 4
              ? "size-1.5 rounded-full bg-current"
              : "size-1.5 rounded-full bg-black/15"
          }
        />
      ))}
    </span>
  );
}
function MiniWave() {
  return (
    <span className="flex items-end gap-1" aria-hidden="true">
      {[10, 18, 7, 23, 14, 28].map((height, index) => (
        <i
          key={index}
          className="w-1.5 rounded-full bg-current"
          style={{ height }}
        />
      ))}
    </span>
  );
}

export default async function StudioDashboard() {
  const { projects } = await getStudioDashboardData();
  const visibleProjects = projects.slice(0, 3);
  return (
    <div className="ml-18">
      <StudioHeader />
      <section>
        <h1 className="text-[clamp(44px,5vw,72px)] font-extralight leading-none tracking-[-.045em]">
          Good morning.
        </h1>
        <p className="mt-3 text-[17px] text-zinc-400">
          Three things need your attention today.
        </p>
      </section>
      <div className="mt-7 grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
        <Card
          className={`${baseCard} col-span-2 row-span-2 min-h-[410px] border-white/20 bg-[linear-gradient(150deg,rgba(255,106,43,.92),rgba(130,32,22,.9)_68%,rgba(24,12,12,.95))] p-7 max-[640px]:col-span-1 max-[640px]:row-span-1`}
        >
          <CardContent className="flex h-full flex-col justify-between p-0">
            <div className="flex items-center justify-between">
              <MetricIcon>
                <Network size={18} />
              </MetricIcon>
              <Button
                className={openButton}
                variant="ghost"
                size="icon-lg"
                render={<Link href="/studio/inquiries" />}
                aria-label="Open pipeline"
              >
                <ArrowUpRight />
              </Button>
            </div>
            <div>
              <CardTitle className="text-xl font-medium text-white">
                Pipeline value
              </CardTitle>
              <div className="mt-4 flex items-end justify-between gap-3">
                <strong className="text-[clamp(68px,8vw,112px)] font-light leading-none tracking-[-.04em] text-white">
                  $482
                  <small className="ml-1 text-xl tracking-normal text-white/70">
                    K
                  </small>
                </strong>
                <span className="rounded-full border border-white/40 px-3 py-1.5 text-xs text-white">
                  +14% this month
                </span>
              </div>
              <div className="mt-7 flex items-center gap-0 text-white">
                <i className="size-2.5 rounded-full bg-white" />
                <b className="h-px flex-1 bg-white/55" />
                <i className="size-4 rounded-full bg-violet-200" />
                <b className="h-px flex-1 bg-white/55" />
                <i className="size-2.5 rounded-full bg-white" />
                <b className="h-px flex-1 bg-white/55" />
                <i className="size-2.5 rounded-full bg-white" />
                <b className="h-px flex-1 bg-white/55" />
                <i className="size-7 rounded-full bg-white" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/60">
                <span>New</span>
                <span>Qualified</span>
                <span>Proposal</span>
                <span>Negotiation</span>
                <span>Won</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lightCard}>
          <CardContent className="flex h-full min-h-[196px] flex-col justify-between p-0">
            <div className="flex items-center justify-between">
              <MetricIcon>
                <FolderKanban size={18} />
              </MetricIcon>
              <Button
                className={openButton}
                variant="ghost"
                size="icon-lg"
                render={<Link href="/studio/projects" />}
                aria-label="Open projects"
              >
                <ArrowUpRight />
              </Button>
            </div>
            <div>
              <CardTitle className="text-base font-medium">
                Active projects
              </CardTitle>
              <div className="mt-3 flex items-end justify-between">
                <strong className="text-6xl font-light leading-none tracking-[-.04em]">
                  {String(Math.max(visibleProjects.length, 12))}
                </strong>
                <MiniBars />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lightCard}>
          <CardContent className="flex h-full min-h-[196px] flex-col justify-between p-0">
            <div className="flex items-center justify-between">
              <MetricIcon>
                <Target size={18} />
              </MetricIcon>
              <Button
                className={openButton}
                variant="ghost"
                size="icon-lg"
                render={<Link href="/studio/inquiries" />}
                aria-label="Open opportunities"
              >
                <ArrowUpRight />
              </Button>
            </div>
            <div>
              <CardTitle className="text-base font-medium">
                Open opportunities
              </CardTitle>
              <div className="mt-3 flex items-end justify-between">
                <strong className="text-6xl font-light leading-none tracking-[-.04em]">
                  27
                </strong>
                <MiniDots />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lightCard}>
          <CardContent className="flex h-full min-h-[196px] flex-col justify-between p-0">
            <div className="flex items-center justify-between">
              <MetricIcon>
                <FileImage size={18} />
              </MetricIcon>
              <Button
                className={openButton}
                variant="ghost"
                size="icon-lg"
                render={<Link href="/studio/media" />}
                aria-label="Open media library"
              >
                <ArrowUpRight />
              </Button>
            </div>
            <div>
              <CardTitle className="text-base font-medium">
                Media published
              </CardTitle>
              <div className="mt-3 flex items-end justify-between">
                <strong className="text-6xl font-light leading-none tracking-[-.04em]">
                  138
                </strong>
                <MiniWave />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lightCard}>
          <CardContent className="flex h-full min-h-[196px] flex-col justify-between p-0">
            <div className="flex items-center justify-between">
              <MetricIcon>
                <Clock3 size={18} />
              </MetricIcon>
              <Button
                className={openButton}
                variant="ghost"
                size="icon-lg"
                render={<Link href="/studio/analytics" />}
                aria-label="Open analytics"
              >
                <ArrowUpRight />
              </Button>
            </div>
            <div>
              <CardTitle className="text-base font-medium">
                Avg. response time
              </CardTitle>
              <div className="mt-3 flex items-end justify-between">
                <strong className="text-5xl font-light leading-none tracking-[-.04em]">
                  3.2<small className="ml-1 text-lg tracking-normal">hrs</small>
                </strong>
                <CircleGauge size={72} strokeWidth={1} className="-rotate-12" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`${baseCard} col-span-2 min-h-[230px] max-[640px]:col-span-1`}
        >
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                Project delivery
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/15 bg-white/[.06]"
                render={<Link href="/studio/projects" />}
              >
                All projects
              </Button>
            </div>
            <div className="mt-4 space-y-0">
              {[
                "Northwind rebrand",
                "Atlas product site",
                "Lumen launch film",
              ].map((name, index) => (
                <div
                  key={name}
                  className="grid grid-cols-[1.6fr_1fr_1.2fr_auto] items-center gap-3 border-t border-white/[.08] py-3 text-sm max-[640px]:grid-cols-2"
                >
                  <span>{name}</span>
                  <span className="text-zinc-500">
                    {["Design", "Development", "Review"][index]}
                  </span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-orange-400"
                      style={{ width: `${[68, 41, 88][index]}%` }}
                    />
                  </div>
                  <span className="rounded-full border border-white/20 px-3 py-1 text-xs max-[640px]:col-span-2">
                    {["On track", "⚠ At risk", "Needs client input"][index]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className={`${baseCard} min-h-[230px]`}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Today focus</CardTitle>
              <span className="font-mono text-sm text-zinc-500">04 nov</span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex h-12 items-center gap-3 rounded-full border border-violet-200/20 bg-violet-200/15 px-4 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-violet-200 text-black">
                  <Check size={13} />
                </span>
                Reply to new inquiry
              </div>
              <div className="flex h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[.07] px-4 text-sm">
                <span className="size-6 rounded-full border border-zinc-500" />
                Send Atlas proposal
              </div>
              <div className="flex h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[.07] px-4 text-sm">
                <span className="size-6 rounded-full border border-zinc-500" />
                Approve Lumen cut
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`${baseCard} min-h-[230px] bg-white/[.1]`}>
          <CardContent className="flex h-full flex-col justify-between p-0">
            <div className="flex items-center justify-between">
              <MetricIcon>
                <Sparkles size={18} />
              </MetricIcon>
              <span className="text-sm text-zinc-400">Insight</span>
            </div>
            <p className="text-[26px] font-light leading-[1.25] tracking-[-.01em]">
              Since yesterday, 3 new inquiries arrived and 1 proposal is waiting
              on a reply.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
