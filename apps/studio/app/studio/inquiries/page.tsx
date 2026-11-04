"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CircleCheck,
  CircleDot,
  FileText,
  Globe2,
  LayoutGrid,
  List,
  Mail,
  Plus,
  Send,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@zerocraft/ui/components/badge";
import { Button } from "@zerocraft/ui/components/button";
import { Card, CardContent } from "@zerocraft/ui/components/card";

const stageNodes = [
  ["New", "7", "Website inquiries", "left-3 top-40", "#ffffff"],
  ["Contacted", "9", "$74K potential", "left-[245px] top-10", "#ffffff"],
  ["Qualified", "12", "$142K potential", "left-[480px] top-40", "#ffffff"],
  ["Proposal", "5", "$168K potential", "left-[715px] top-10", "#ff6a2b"],
  ["Negotiation", "3", "$98K potential", "left-[950px] top-40", "#ffffff"],
] as const;

const glass =
  "border-white/[.1] bg-[rgba(28,28,32,.82)] shadow-none backdrop-blur-2xl";

const pipelineLeads = [
  ["Atlas product site", "Atlas Labs", "Proposal", "$48K", "Anna K."],
  ["Northwind brand system", "Northwind", "Qualified", "$36K", "Raj P."],
  ["Lumen launch film", "Lumen", "Contacted", "$24K", "Sara M."],
  ["Cinder campaign", "Cinder Coffee", "New", "$18K", "Maya C."],
  [
    "Kinetix spatial system",
    "Kinetix Studio",
    "Negotiation",
    "$42K",
    "Marcus A.",
  ],
] as const;

type PipelineView = "board" | "canvas" | "list";

function StageIcon({ stage }: { stage: string }) {
  return stage === "New" ? (
    <Globe2 size={14} />
  ) : stage === "Contacted" ? (
    <Mail size={14} />
  ) : stage === "Qualified" ? (
    <Check size={14} />
  ) : stage === "Proposal" ? (
    <FileText size={14} />
  ) : (
    <Target size={14} />
  );
}
function AvatarStack({ count = 3 }: { count?: number }) {
  return (
    <div className="flex">
      {["AK", "MR", "SL"].slice(0, count).map((name, index) => (
        <span
          key={name}
          className="-ml-1.5 grid size-6 place-items-center rounded-full border-2 border-[#1c1c20] bg-zinc-700 text-[9px] font-semibold first:ml-0"
        >
          {index === 1 ? "PN" : name}
        </span>
      ))}
    </div>
  );
}

function PipelineBoard() {
  const columns = [
    "New",
    "Contacted",
    "Qualified",
    "Proposal",
    "Negotiation",
  ] as const;
  return (
    <div className="relative z-10 mt-4 grid min-h-[calc(100vh-240px)] grid-cols-5 gap-3 overflow-x-auto rounded-[36px] border border-white/[.08] bg-white/[.02] p-4 max-[1180px]:min-w-[980px]">
      {columns.map((column) => {
        const leads = pipelineLeads.filter((lead) => lead[2] === column);
        return (
          <div
            key={column}
            className="min-w-[190px] rounded-[28px] border border-white/[.08] bg-black/20 p-3"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-medium">{column}</span>
              <span className="text-xs text-zinc-500">{leads.length || 0}</span>
            </div>
            <div className="mt-3 space-y-2">
              {leads.map(([name, company, stage, value, owner]) => (
                <Card key={name} className={`${glass} rounded-[24px] p-4`}>
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{name}</span>
                      <StageIcon stage={stage} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{company}</p>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <strong className="font-medium text-orange-300">
                        {value}
                      </strong>
                      <span className="text-zinc-400">{owner}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full border-dashed border-white/15 text-zinc-500"
              >
                <Plus /> Add lead
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineList() {
  return (
    <Card
      className={`${glass} relative z-10 mt-4 overflow-hidden rounded-[36px]`}
    >
      <CardContent className="p-0">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_.8fr_1fr] gap-4 border-b border-white/[.08] px-6 py-4 text-xs uppercase tracking-[.12em] text-zinc-500 max-md:min-w-[760px]">
          <span>Lead</span>
          <span>Stage</span>
          <span>Owner</span>
          <span>Value</span>
          <span>Next action</span>
        </div>
        <div className="max-md:min-w-[760px]">
          {pipelineLeads.map(([name, company, stage, value, owner]) => (
            <button
              key={name}
              className="grid w-full grid-cols-[1.5fr_1fr_1fr_.8fr_1fr] gap-4 border-b border-white/[.08] px-6 py-5 text-left transition-colors last:border-b-0 hover:bg-white/[.04]"
            >
              <span>
                <strong className="block text-sm font-medium">{name}</strong>
                <small className="mt-1 block text-xs text-zinc-500">
                  {company}
                </small>
              </span>
              <span className="text-sm text-zinc-300">{stage}</span>
              <span className="text-sm text-zinc-400">{owner}</span>
              <strong className="text-sm font-medium text-orange-300">
                {value}
              </strong>
              <span className="text-sm text-zinc-400">
                Review details <ArrowUpRight className="ml-1 inline size-3" />
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InquiriesDashboard() {
  const [view, setView] = useState<PipelineView>("canvas");

  return (
    <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-32px)] overflow-hidden bg-[radial-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] bg-[size:24px_24px] px-7 pb-6 pt-5 max-md:-mx-4 max-md:px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[38%] top-[120px] size-[620px] rounded-full bg-[radial-gradient(circle_at_50%_50%,#ff6a2b,#b3261e_55%,transparent_72%)] opacity-25 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(5,5,6,.72)_100%)]"
      />
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <Link
          href="/studio"
          className="text-[15px] text-zinc-400 hover:text-white"
        >
          ZeroCraft Studio <span className="text-zinc-700">/</span>{" "}
          <span className="text-white">Pipeline</span>
        </Link>
        <span className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className={`rounded-full border-white/15 ${view === "board" ? "bg-white text-black" : "bg-white/[.06] text-zinc-400"}`}
          onClick={() => setView("board")}
          aria-pressed={view === "board"}
        >
          <LayoutGrid />
          Board
        </Button>
        <Button
          variant={view === "canvas" ? "default" : "outline"}
          size="sm"
          className="rounded-full border-white/15"
          onClick={() => setView("canvas")}
          aria-pressed={view === "canvas"}
        >
          Canvas
        </Button>
        <Button
          variant={view === "list" ? "default" : "outline"}
          size="sm"
          className="rounded-full border-white/15"
          onClick={() => setView("list")}
          aria-pressed={view === "list"}
        >
          <List />
          List
        </Button>
        <Button
          render={<Link href="/studio/inquiries/new" />}
          size="sm"
          className="rounded-full"
        >
          <Plus /> New lead
        </Button>
      </div>
      <h1 className="relative z-10 mt-6 text-[clamp(38px,4vw,58px)] font-extralight leading-none tracking-[-.04em]">
        Pipeline
      </h1>
      <p className="relative z-10 mt-2 text-base text-zinc-400">
        From first inquiry to signed work. Select a stage to see its leads.
      </p>
      {view === "board" && <PipelineBoard />}
      {view === "list" && <PipelineList />}
      {view === "canvas" && (
        <div
          className="relative z-10 mt-4 overflow-x-auto"
          role="region"
          aria-label="Pipeline canvas"
          tabIndex={0}
        >
          <div className="relative mx-auto h-[720px] w-[1340px]">
            <svg
              className="absolute inset-0"
              width="1340"
              height="720"
              viewBox="0 0 1340 720"
              fill="none"
              aria-hidden="true"
            >
              <g stroke="#ff6a2b" strokeWidth="2">
                <path d="M190 235C217 235 217 125 245 125" />
                <path d="M425 125C452 125 452 235 480 235" />
                <path d="M660 235C687 235 687 125 715 125" />
              </g>
              <g stroke="rgba(255,255,255,.35)" strokeWidth="1.5">
                <path d="M895 125C922 125 922 235 950 235" />
                <path d="M1130 235C1155 235 1155 115 1180 115" />
                <path
                  d="M1130 235C1155 235 1155 285 1180 285"
                  strokeDasharray="5 5"
                />
              </g>
            </svg>
            {stageNodes.map(([stage, count, value, position, color]) => (
              <Card
                key={stage}
                className={`${glass} absolute ${position} h-[170px] w-[180px] rounded-[32px] p-4 ${stage === "Proposal" ? "border-orange-500 shadow-[0_0_0_1px_#ff6a2b,0_0_40px_rgba(255,106,43,.3)]" : ""}`}
              >
                <CardContent className="flex h-full flex-col justify-between p-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="grid size-7 place-items-center rounded-full border border-white/50">
                      <StageIcon stage={stage} />
                    </span>
                    {stage}
                  </div>
                  <div>
                    <strong className="block text-[44px] font-light leading-none tracking-[-.04em]">
                      {count}
                    </strong>
                    <span className="mt-1 block text-[13px] text-zinc-400">
                      {value}
                    </span>
                  </div>
                  <AvatarStack
                    count={
                      stage === "Contacted" || stage === "Proposal" ? 2 : 3
                    }
                  />
                </CardContent>
              </Card>
            ))}
            <Card
              className={`${glass} absolute left-[1180px] top-[60px] h-[110px] w-[130px] rounded-[28px] p-3`}
            >
              <CardContent className="flex h-full flex-col justify-between p-0">
                <span className="text-sm font-medium">Won</span>
                <div>
                  <strong className="block text-[34px] font-light leading-none">
                    4
                  </strong>
                  <span className="text-xs text-zinc-400">this quarter</span>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`${glass} absolute left-[1180px] top-[230px] h-[110px] w-[130px] rounded-[28px] border-dashed p-3`}
            >
              <CardContent className="flex h-full flex-col justify-between p-0">
                <span className="text-sm font-medium">Lost</span>
                <div>
                  <strong className="block text-[34px] font-light leading-none">
                    2
                  </strong>
                  <span className="text-xs text-zinc-400">this quarter</span>
                </div>
              </CardContent>
            </Card>
            {[204, 439, 674, 909].map((left, index) => (
              <Button
                key={left}
                variant="outline"
                size="icon-xs"
                className={`absolute top-[167px] rounded-full border-white/30 bg-[#17171a] ${index < 3 ? "border-orange-500 text-orange-400" : "text-white"}`}
                style={{ left }}
                aria-label={`Add pipeline step ${index + 1}`}
              >
                <Plus />
              </Button>
            ))}
            <Card
              className={`${glass} absolute left-[245px] top-[300px] w-[440px] rounded-[40px] p-[22px]`}
            >
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Activity</span>
                  <span className="font-mono text-sm text-zinc-500">
                    04 nov
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex gap-3 text-sm">
                    <i className="mt-1.5 size-2.5 shrink-0 rounded-full bg-white" />
                    <span>
                      Inquiry received
                      <br />
                      <small className="text-zinc-500">
                        Oct 28, website form
                      </small>
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <i className="mt-1.5 size-2.5 shrink-0 rounded-full bg-white" />
                    <span>
                      Discovery call booked
                      <br />
                      <small className="text-zinc-500">Oct 30, Anna K.</small>
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <i className="mt-1.5 size-2.5 shrink-0 rounded-full bg-orange-500" />
                    <span>
                      Proposal drafted
                      <br />
                      <small className="text-zinc-500">
                        Nov 3, waiting on review
                      </small>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`${glass} absolute left-[715px] top-[300px] w-[470px] rounded-[40px] p-[22px]`}
            >
              <CardContent className="p-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-medium">Atlas product site</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Atlas Labs · via website form
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-orange-500 text-orange-300"
                  >
                    Proposal
                  </Badge>
                </div>
                <div className="mt-3">
                  {[
                    ["Budget", "$48K"],
                    ["Timeline", "8 weeks"],
                    ["Owner", "Anna K."],
                    ["Follow-up", "Nov 6"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between border-t border-white/[.08] py-2 text-sm"
                    >
                      <span className="text-zinc-500">{label}</span>
                      <strong className="font-medium">{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1 rounded-full">Send proposal</Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full border-white/15"
                  >
                    Convert to project <ArrowUpRight />
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="absolute bottom-5 left-1/2 flex h-14 w-[500px] -translate-x-1/2 flex-row items-center gap-3 rounded-full border-white/[.12] bg-[#1e1412]/80 px-5 backdrop-blur-2xl">
              <Sparkles size={18} className="text-orange-400" />
              <span className="flex-1 text-sm text-zinc-500">
                Ask about your pipeline…
              </span>
              <Button size="icon-sm" className="rounded-full">
                <Send />
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
