"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, LayoutGrid, List, Plus, RefreshCw, Search, Users } from "lucide-react";
import { Badge } from "@zerocraft/ui/components/badge";
import { Button } from "@zerocraft/ui/components/button";
import { StudioLoadTransition } from "@/components/studio-loading";
import { Card, CardContent } from "@zerocraft/ui/components/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@zerocraft/ui/components/empty";

type Lead = { id: string; name: string; email: string; company: string; stage: string; source: string; service_interest: string; next_action: string; next_action_at: string | null; updated_at: string };
type View = "board" | "list";
const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const labels: Record<string, string> = { new: "New", contacted: "Contacted", qualified: "Qualified", proposal: "Proposal", won: "Won", lost: "Lost" };
const glass = "border-white/[.1] bg-[rgba(28,28,32,.82)] shadow-none backdrop-blur-2xl";

export default function InquiriesDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load(pageToLoad = page) {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/studio/leads?page=${pageToLoad}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`, { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not load leads."); setLeads(payload.leads ?? []); setTotal(payload.total ?? 0); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load leads."); } finally { setLoading(false); }
  }
  useEffect(() => { const timer = setTimeout(() => void load(page), 180); return () => clearTimeout(timer); }, [search, page]);
  const grouped = useMemo(() => Object.fromEntries(stages.map((stage) => [stage, leads.filter((lead) => lead.stage === stage)])), [leads]);
  return <div className="relative -mx-8 -mb-10 min-h-[calc(100vh-32px)] overflow-hidden px-7 pb-6 pt-5 max-md:-mx-4 max-md:px-4">
    <div className="relative z-10 flex flex-wrap items-center gap-2"><Link href="/studio" className="text-[15px] text-zinc-400 hover:text-white">ZeroCraft Studio <span className="text-zinc-700">/</span> <span className="text-white">Pipeline</span></Link><span className="flex-1" /><div className="flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-3"><Search className="size-4 text-zinc-500" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search leads" aria-label="Search leads" className="w-40 bg-transparent text-sm outline-none placeholder:text-zinc-600" /></div><Button variant={view === "board" ? "default" : "outline"} size="sm" className="rounded-full border-white/15" onClick={() => setView("board")} aria-pressed={view === "board"}><LayoutGrid />Board</Button><Button variant={view === "list" ? "default" : "outline"} size="sm" className="rounded-full border-white/15" onClick={() => setView("list")} aria-pressed={view === "list"}><List />List</Button><Button variant="outline" size="sm" className="rounded-full border-white/15" onClick={() => void load()} aria-label="Refresh leads"><RefreshCw /></Button><Button render={<Link href="/studio/inquiries/new" />} size="sm" className="rounded-full"><Plus />New lead</Button></div>
    <h1 className="relative z-10 mt-6 text-[clamp(38px,4vw,58px)] font-extralight leading-none tracking-[-.04em]">Pipeline</h1><p className="relative z-10 mt-2 text-base text-zinc-400">{loading ? "Loading live leads…" : `${total} live lead${total === 1 ? "" : "s"}${total > pageSize ? ` · page ${page} of ${Math.ceil(total / pageSize)}` : ""}`}</p>
    {error && <div role="alert" className="relative z-10 mt-5 flex items-center justify-between rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}
    <StudioLoadTransition loading={loading} label="Loading the live pipeline…" loadingClassName="relative z-10 mt-6 min-h-32 rounded-[28px] border border-white/[.1] bg-white/[.04]">
    {leads.length === 0 ? (
  <Empty className="relative z-10 mt-6 rounded-[32px] border-white/10 bg-white/[.02] p-16">
    <EmptyHeader>
      <EmptyMedia variant="accent">
        <Users className="size-7" />
      </EmptyMedia>
      <EmptyTitle className="text-2xl font-light tracking-tight text-white">
        No leads match this view
      </EmptyTitle>
      <EmptyDescription className="max-w-md text-sm text-zinc-400">
        Capture client inquiries from your contact form or manually qualify new creative opportunities.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Link
        href="/studio/inquiries/new"
        className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: "var(--brand-accent)" }}
      >
        <Plus size={16} />
        Create first lead
      </Link>
    </EmptyContent>
  </Empty>
) : view === "board" ? <div className="relative z-10 mt-4 grid min-h-[calc(100vh-240px)] grid-cols-6 gap-3 overflow-x-auto rounded-[36px] border border-white/[.08] bg-white/[.02] p-4 max-[1180px]:min-w-[1120px]">{stages.map((stage) => <div key={stage} className="min-w-[170px] rounded-[28px] border border-white/[.08] bg-black/20 p-3"><div className="flex items-center justify-between px-2 py-1"><span className="text-sm font-medium">{labels[stage]}</span><span className="text-xs text-zinc-500">{grouped[stage].length}</span></div><div className="mt-3 space-y-2">{grouped[stage].map((lead) => <Link key={lead.id} href={`/studio/inquiries/${lead.id}`} className="block"><Card className={`${glass} rounded-[24px] p-4 transition hover:border-orange-400/50`}><CardContent className="p-0"><div className="flex items-start justify-between gap-2"><span className="text-sm font-medium">{lead.name}</span><ArrowUpRight className="size-4 text-zinc-500" /></div><p className="mt-2 truncate text-xs text-zinc-500">{lead.company || lead.email}</p><div className="mt-4 flex items-center justify-between gap-2 text-xs"><Badge variant="outline" className="border-white/15 text-zinc-400">{lead.service_interest || lead.source}</Badge><span className="truncate text-zinc-500">{lead.next_action || "No next action"}</span></div></CardContent></Card></Link>)}</div></div>)}</div> : <Card className={`${glass} relative z-10 mt-4 overflow-hidden rounded-[36px]`}><CardContent className="overflow-x-auto p-0"><div className="grid min-w-[760px] grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/[.08] px-6 py-4 text-xs uppercase tracking-[.12em] text-zinc-500"><span>Lead</span><span>Stage</span><span>Source</span><span>Follow-up</span><span>Updated</span></div><div className="min-w-[760px]">{leads.map((lead) => <Link key={lead.id} href={`/studio/inquiries/${lead.id}`} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/[.08] px-6 py-5 text-left transition-colors last:border-b-0 hover:bg-white/[.04]"><span><strong className="block text-sm font-medium">{lead.name}</strong><small className="mt-1 block text-xs text-zinc-500">{lead.company || lead.email}</small></span><span className="text-sm text-zinc-300">{labels[lead.stage] ?? lead.stage}</span><span className="text-sm text-zinc-400">{lead.source}</span><span className="text-sm text-zinc-400">{lead.next_action_at ? new Date(lead.next_action_at).toLocaleDateString() : "—"}</span><span className="text-sm text-zinc-400">{new Date(lead.updated_at).toLocaleDateString()}</span></Link>)}</div></CardContent></Card>}
    </StudioLoadTransition>
    {total > pageSize && <nav aria-label="Lead pages" className="relative z-10 mt-5 flex items-center justify-end gap-3 text-sm text-zinc-400"><Button variant="outline" size="sm" className="rounded-full" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><span>Page {page} of {Math.ceil(total / pageSize)}</span><Button variant="outline" size="sm" className="rounded-full" disabled={loading || page >= Math.ceil(total / pageSize)} onClick={() => setPage((current) => current + 1)}>Next</Button></nav>}
  </div>;
}
