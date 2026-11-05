"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleDot,
  Mail,
} from "lucide-react";
import { Badge } from "@zerocraft/ui/components/badge";
import { Button } from "@zerocraft/ui/components/button";
import { Card, CardContent } from "@zerocraft/ui/components/card";

const glass =
  "border-white/[.1] bg-[rgba(28,28,32,.82)] shadow-none backdrop-blur-2xl";

const stages = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won"];

const activity = [
  ["Proposal drafted", "Nov 3, waiting on review", true],
  ["Discovery call booked", "Oct 30, Anna K.", false],
  ["Qualified after budget check", "Oct 29, Anna K.", false],
  ["Inquiry received", "Oct 28, website form", false],
] as const;

export default function LeadDetailPage() {
  const [owner, setOwner] = useState("Anna K.");
  const [followUp, setFollowUp] = useState("2026-11-06");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-32px)] overflow-visible px-7 pb-8 pt-5 max-md:-mx-4 max-md:px-4">
      <div className="relative z-10 mb-5 flex items-center gap-2 text-[15px] text-zinc-400">
        <Link href="/studio/inquiries" className="inline-flex items-center gap-1.5 hover:text-white">
          <ArrowLeft className="size-4" />
          Pipeline
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-white">Atlas product site</span>
      </div>

      <div className="relative z-10 grid min-w-0 grid-cols-[minmax(0,1fr)_330px] gap-5 max-[1180px]:grid-cols-1">
        <main className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-[clamp(40px,5vw,62px)] font-extralight leading-none tracking-[-.045em]">
                Atlas product site
              </h1>
              <p className="mt-3 text-base text-zinc-400">
                Atlas Labs <span className="text-zinc-600">·</span> via website form <span className="text-zinc-600">·</span> received Oct 28
              </p>
            </div>
            <Badge variant="outline" className="h-7 rounded-full border-orange-500 px-3 text-orange-300">
              Proposal
            </Badge>
          </div>

          <Card className={`${glass} mt-7 rounded-[32px] p-5`}>
            <CardContent className="p-0">
              <div className="flex items-center" aria-label="Lead stage" role="list">
                {stages.map((stage, index) => (
                  <div key={stage} className="flex flex-1 items-center last:flex-none" role="listitem">
                    <span className={`grid size-3 shrink-0 place-items-center rounded-full ${stage === "Proposal" ? "size-5 bg-orange-500 shadow-[0_0_0_4px_rgba(255,106,43,.22)]" : "bg-white"}`}>
                      {stage === "Proposal" && <span className="size-1.5 rounded-full bg-white" />}
                    </span>
                    {index < stages.length - 1 && <span className={`h-px flex-1 ${index < 3 ? "bg-white/45" : "bg-white/20"}`} />}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between gap-2 text-xs text-zinc-500 max-[620px]:text-[10px]">
                {stages.map((stage) => <span key={stage} className={stage === "Proposal" ? "text-orange-300" : ""}>{stage}</span>)}
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
            <Card className={`${glass} rounded-[32px] p-5`}>
              <CardContent className="p-0">
                <h2 className="text-lg font-medium">Details</h2>
                <div className="mt-3">
                  {[
                    ["Contact", "Maya R."],
                    ["Company", "Atlas Labs"],
                    ["Service", "Website design and build"],
                    ["Budget", "$48K"],
                    ["Timeline", "8 weeks"],
                    ["Source", "Website form"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 border-t border-white/[.08] py-2.5 text-sm">
                      <span className="text-zinc-500">{label}</span>
                      <strong className="text-right font-medium">{value}</strong>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={`${glass} rounded-[32px] p-5`}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Activity</h2>
                  <span className="font-mono text-sm text-zinc-500">04 nov</span>
                </div>
                <div className="mt-3">
                  {activity.map(([title, detail, current]) => (
                    <div key={title} className="flex gap-3 py-2 text-sm">
                      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${current ? "bg-orange-500" : "bg-white"}`} />
                      <span>{title}<small className="mt-1 block text-xs text-zinc-500">{detail}</small></span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={`${glass} mt-4 rounded-[32px] p-5`}>
            <CardContent className="p-0">
              <h2 className="text-lg font-medium">Notes</h2>
              <label htmlFor="lead-note" className="sr-only">Add a note</label>
              <textarea
                id="lead-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a note. Use @ to mention a teammate."
                className="mt-3 min-h-[110px] w-full resize-none rounded-[20px] border border-white/[.14] bg-white/[.05] px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-orange-300/50"
              />
              <div className="mt-3 flex justify-end">
                <Button className="rounded-full" onClick={() => { setNote(""); showNotice("Note added"); }} disabled={!note.trim()}>
                  Add note
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <aside className={`${glass} sticky top-4 self-start flex max-h-[calc(100vh-32px)] w-full flex-col gap-5 overflow-y-auto rounded-[40px] p-6 max-[1180px]:static max-[1180px]:max-h-none`} aria-label="Lead actions">
          <div>
            <div className="text-sm text-zinc-400">Lead actions</div>
            <h2 className="mt-1 text-[28px] font-light leading-tight">Proposal review</h2>
          </div>

          <div>
            <label htmlFor="lead-owner" className="mb-1.5 block text-[13px] text-zinc-400">Owner</label>
            <div className="flex items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/20 bg-[#3a3a40] text-xs font-semibold">AK</span>
              <select id="lead-owner" value={owner} onChange={(event) => setOwner(event.target.value)} className="h-11 w-full rounded-[18px] border border-white/[.14] bg-white/[.05] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-300/50">
                <option>Anna K.</option><option>Raj M.</option><option>Sara L.</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="follow-up" className="mb-1.5 block text-[13px] text-zinc-400">Follow-up reminder</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 size-4 text-zinc-500" />
              <input id="follow-up" type="date" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="h-11 w-full rounded-[18px] border border-white/[.14] bg-white/[.05] px-3 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-orange-300/50" />
            </div>
          </div>

          <div>
            <div className="mb-2 text-[13px] text-zinc-400">Proposal status</div>
            <Badge variant="outline" className="rounded-full border-violet-300 bg-violet-300/15 text-violet-100">Drafted, in review</Badge>
          </div>

          <div className="mt-auto space-y-2">
            <Button className="w-full rounded-full" onClick={() => showNotice("Project conversion started")}>
              <Check /> Convert to project <ArrowUpRight />
            </Button>
            <Button variant="outline" className="w-full rounded-full border-white/15" onClick={() => showNotice("Reply composer opened")}>
              <Mail /> Send email reply
            </Button>
            <Button variant="outline" className="w-full rounded-full border-white/15 text-zinc-400" onClick={() => showNotice("Lead marked as lost")}>
              Mark as lost
            </Button>
          </div>
        </aside>
      </div>

      {notice && (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#1e1412]/95 px-4 py-2.5 text-sm shadow-2xl backdrop-blur-xl">
          <CircleDot className="size-4 text-orange-400" />
          {notice}
        </div>
      )}
    </div>
  );
}
