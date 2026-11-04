import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CircleGauge,
  Clock3,
  FileText,
  Globe2,
  MousePointerClick,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@zerocraft/ui/components/button";
import { Card, CardContent, CardTitle } from "@zerocraft/ui/components/card";

export const metadata: Metadata = { title: "ZeroCraft Studio — Analytics" };

const darkCard =
  "rounded-[32px] border-white/[.1] bg-white/[.06] p-6 text-foreground shadow-none backdrop-blur-[28px]";
const lightCard = `${darkCard} bg-white text-[#0a0a0b]`;
const openButton =
  "grid size-11 place-items-center rounded-full bg-white text-[#0a0a0b] transition-transform hover:scale-105";
const metrics = [
  ["Proposal win rate", "42", "%", FileText],
  ["Avg. response time", "3.2", "hrs", Clock3],
  ["Pipeline value", "$482", "K", Globe2],
  ["Project margin", "38", "%", BriefcaseBusiness],
  ["Client retention", "86", "%", RefreshCw],
] as const;

function IconRing({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-10 place-items-center rounded-full border border-current/60 opacity-80">
      {children}
    </span>
  );
}
function Bars() {
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

export default function StudioAnalyticsPage() {
  return (
    <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-93px)] overflow-hidden px-8 pb-10 pt-5 max-md:-mx-4 max-md:px-4">
   
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <Link
          href="/studio"
          className="text-[15px] text-zinc-400 hover:text-white"
        >
          ZeroCraft Studio <span className="text-zinc-700">/</span>{" "}
          <span className="text-white">Analytics</span>
        </Link>
        <span className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-white/15 bg-white/[.06] text-zinc-400"
        >
          3 month
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-white/15 bg-white/[.06] text-zinc-400"
        >
          6 month
        </Button>
        <Button size="sm" className="rounded-full">
          1 year
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-white/15 bg-white/[.06] text-zinc-400"
        >
          <ArrowDownToLine /> Export
        </Button>
      </div>
      <h1 className="relative z-10 mt-7 text-[clamp(42px,5vw,64px)] font-extralight leading-none tracking-[-.04em]">
        Analytics
      </h1>
      <p className="relative z-10 mt-3 max-w-2xl text-xl font-light leading-relaxed text-zinc-300">
        Contact form completions are up 14% since the Atlas site launched.
      </p>
      <div className="relative z-10 mt-7 grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[640px]:grid-cols-1">
        <Card
          className={`${darkCard} col-span-2 row-span-2 min-h-[410px] border-white/20 bg-[linear-gradient(150deg,rgba(255,106,43,.92),rgba(130,32,22,.9)_68%,rgba(24,12,12,.95))] p-7 max-[640px]:col-span-1 max-[640px]:row-span-1`}
        >
          <CardContent className="flex h-full flex-col justify-between p-0">
            <div className="flex items-center justify-between">
              <IconRing>
                <Target size={18} />
              </IconRing>
              <Button
                className={openButton}
                variant="ghost"
                size="icon-lg"
                aria-label="Open funnel report"
              >
                <ArrowUpRight />
              </Button>
            </div>
            <div>
              <CardTitle className="text-xl font-medium text-white">
                Lead funnel
              </CardTitle>
              <div className="mt-4 flex items-end justify-between">
                <strong className="text-8xl font-light leading-none tracking-[-.04em] text-white">
                  2.0<small className="ml-1 text-xl text-white/70">%</small>
                </strong>
                <span className="text-right text-sm text-orange-100">
                  visitor to
                  <br />
                  qualified lead
                </span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs text-white">
                  96 qualified leads ↑14%
                </span>
              </div>
              <div className="mt-7 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full bg-white" />
                  <div className="h-px flex-1 bg-white/40" />
                  <strong className="w-20 text-2xl font-light">4,820</strong>
                  <span className="w-28 text-xs text-orange-100">
                    Website visitors
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full bg-white" />
                  <div className="ml-5 h-px flex-1 bg-white/40" />
                  <strong className="w-20 text-2xl font-light">218</strong>
                  <span className="w-28 text-xs text-orange-100">
                    Form completions
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full bg-white" />
                  <div className="ml-10 h-px flex-1 bg-white/40" />
                  <strong className="w-20 text-2xl font-light">96</strong>
                  <span className="w-28 text-xs text-orange-100">
                    Qualified leads
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {metrics.map(([label, value, suffix, Icon], index) => (
          <Card key={label} className={lightCard}>
            <CardContent className="flex min-h-[190px] h-full flex-col justify-between p-0">
              <div className="flex items-center justify-between">
                <IconRing>
                  <Icon size={18} />
                </IconRing>
                <Button
                  className={openButton}
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Open ${label}`}
                >
                  <ArrowUpRight />
                </Button>
              </div>
              <div>
                <CardTitle className="text-base font-medium">{label}</CardTitle>
                <div className="mt-3 flex items-end justify-between">
                  <strong className="text-6xl font-light leading-none tracking-[-.04em]">
                    {value}
                    <small className="ml-1 text-lg tracking-normal">
                      {suffix}
                    </small>
                  </strong>
                  {index === 0 ? (
                    <CircleGauge
                      size={72}
                      strokeWidth={1}
                      className="-rotate-12"
                    />
                  ) : index === 1 ? (
                    <Bars />
                  ) : index === 2 ? (
                    <span className="flex items-center gap-1">
                      <i className="size-2 rounded-full bg-black" />
                      <i className="size-3 rounded-full bg-violet-300" />
                      <i className="size-2 rounded-full bg-black" />
                    </span>
                  ) : index === 3 ? (
                    <Bars />
                  ) : (
                    <span className="grid w-16 grid-cols-4 gap-2">
                      {Array.from({ length: 8 }).map((_, dot) => (
                        <i
                          key={dot}
                          className={
                            dot < 6
                              ? "size-1.5 rounded-full bg-black"
                              : "size-1.5 rounded-full bg-black/20"
                          }
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card
          className={`${darkCard} col-span-2 min-h-[240px] max-[640px]:col-span-1`}
        >
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                Top performers
              </CardTitle>
              <span className="font-mono text-sm text-zinc-500">
                won revenue
              </span>
            </div>
            <div className="relative mt-7 h-40 border-b border-white/30">
              <div className="absolute left-[15%] top-[30%] grid place-items-center">
                <span className="grid size-10 place-items-center rounded-full border border-white/40 text-xs">
                  Sara
                </span>
                <strong className="mt-8 text-2xl font-light">$98K</strong>
              </div>
              <div className="absolute left-[48%] top-[20%] grid place-items-center">
                <span className="grid size-14 place-items-center rounded-full border border-white/40 text-xs">
                  Raj
                </span>
                <strong className="mt-4 text-2xl font-light">$164K</strong>
              </div>
              <div className="absolute right-[10%] top-0 grid place-items-center">
                <span className="grid size-16 place-items-center rounded-full border border-orange-400/70 text-xs text-orange-200">
                  Anna
                </span>
                <strong className="mt-2 text-2xl font-light">$210K</strong>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`${darkCard} col-span-2 min-h-[240px] max-[640px]:col-span-1`}
        >
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                Content performance
              </CardTitle>
              <span className="font-mono text-sm text-zinc-500">
                page views
              </span>
            </div>
            <div className="mt-5 space-y-0">
              {[
                ["Northwind brand system", "84%", "4.2K"],
                ["Why launch films need a media library", "58%", "2.9K"],
                ["Atlas product site is live", "42%", "2.1K"],
              ].map(([name, width, views]) => (
                <div
                  key={name}
                  className="grid grid-cols-[1.5fr_1fr_70px] items-center gap-3 border-t border-white/[.08] py-3 text-sm"
                >
                  <span className="truncate">{name}</span>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-orange-500"
                      style={{ width }}
                    />
                  </div>
                  <span className="text-right">{views}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
