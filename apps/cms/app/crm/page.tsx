"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconArrowUpRight, IconBriefcase, IconChevronRight, IconCheck, IconClock, IconMail, IconMessageCircle, IconPhone, IconPlus, IconRefresh, IconUsers } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Lead = { id: string; name: string; email: string; phone: string; company: string; stage: string; source: string; service_interest: string; next_action: string; updated_at: string };
type Activity = { id: string; lead_id: string; activity_type: string; detail: string; created_at: string };
type CrmData = { leads: Lead[]; clients: number; projects: Array<{ id: string; name: string; status: string; deadline: string | null }>; activities: Activity[]; works: number | null; blogs: number | null; stageCounts: Record<string, number> };

const stageLabels: Record<string, string> = { new: "New", contacted: "Contacted", qualified: "Qualified", proposal: "Proposal", won: "Won", lost: "Lost" };

export default function CrmPage() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [note, setNote] = useState("");
  const [activityType, setActivityType] = useState("note");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/studio/crm", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "CRM workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function openLead(lead: Lead) {
    setSelected(lead);
    setNote("");
    const response = await fetch(`/api/studio/leads/activities?leadId=${encodeURIComponent(lead.id)}`, { cache: "no-store" });
    const payload = await response.json();
    setActivities(response.ok ? payload.activities || [] : []);
  }

  async function saveActivity(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !note.trim() || saving) return;
    setSaving(true);
    const response = await fetch("/api/studio/leads/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: selected.id, activityType, detail: note }) });
    const payload = await response.json();
    if (response.ok) {
      setActivities((current) => [payload.activity, ...current]);
      setNote("");
      void load();
    } else {
      setError(payload.error || "Activity could not be saved.");
    }
    setSaving(false);
  }

  const visibleLeads = useMemo(() => (data?.leads || []).filter((lead) => `${lead.name} ${lead.email} ${lead.company} ${lead.service_interest}`.toLowerCase().includes(query.toLowerCase())), [data?.leads, query]);
  const whatsappNumber = selected?.phone.replace(/\D/g, "") || "";
  const openLeadCount = data ? (data.stageCounts.new || 0) + (data.stageCounts.contacted || 0) + (data.stageCounts.qualified || 0) + (data.stageCounts.proposal || 0) : "—";
  const statCards = [["Open leads", openLeadCount, IconUsers], ["Clients", data?.clients ?? "—", IconCheck], ["Active projects", data ? data.projects.filter((project) => ["planning", "active", "review"].includes(project.status)).length : "—", IconBriefcase], ["Published content", data ? (data.works || 0) + (data.blogs || 0) : "—", IconMail], ["Won", data?.stageCounts.won ?? "—", IconCheck]] as const;

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Studio CRM</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold tracking-tight"><IconUsers className="size-7" />CRM workspace</h1><p className="mt-2 text-sm text-muted-foreground">One operating view for enquiries, relationships, follow-ups, and active delivery.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button><Button render={<Link href="/leads?create=1" />}><IconPlus />Add lead</Button></div></header>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{statCards.map(([label, value, Icon]) => <Card key={label}><CardHeader className="pb-2"><CardDescription className="flex items-center justify-between">{label}<Icon className="size-4" /></CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]"><Card><CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Lead inbox</CardTitle><CardDescription>Recent enquiries that need a next action.</CardDescription></div><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or companies" className="w-full sm:w-64" /></div></CardHeader><CardContent className="p-0"><div className="divide-y">{visibleLeads.map((lead) => <button type="button" key={lead.id} onClick={() => void openLead(lead)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">{lead.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm">{lead.name}</strong><Badge variant="outline" className="text-[10px]">{stageLabels[lead.stage] || lead.stage}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{lead.company || lead.email}{lead.service_interest ? ` · ${lead.service_interest}` : ""}</p></div><div className="hidden text-right sm:block"><p className="text-xs text-muted-foreground">{lead.next_action || "No next action"}</p><p className="mt-1 text-[10px] text-muted-foreground">{lead.source}</p></div><IconArrowUpRight className="size-4 text-muted-foreground" /></button>)}{!loading && !visibleLeads.length && <div className="p-12 text-center text-sm text-muted-foreground">No leads match this search.</div>}</div></CardContent><div className="flex justify-end border-t p-4"><Button variant="outline" size="sm" render={<Link href="/leads" />}>Open full pipeline <IconArrowUpRight /></Button></div></Card>
      <div className="grid gap-5"><Card><CardHeader><CardTitle>Delivery pulse</CardTitle><CardDescription>Current projects in motion.</CardDescription></CardHeader><CardContent className="space-y-3">{(data?.projects || []).slice(0, 4).map((project) => <Link href="/projects" key={project.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><IconBriefcase className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{project.name}</strong><span className="text-[11px] capitalize text-muted-foreground">{project.status.replace("_", " ")}</span></span><IconChevronRight className="size-4 text-muted-foreground" /></Link>)}{!data?.projects?.length && <p className="text-sm text-muted-foreground">No delivery projects yet.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>Latest relationship updates.</CardDescription></CardHeader><CardContent className="space-y-3">{(data?.activities || []).slice(0, 5).map((activity) => <div key={activity.id} className="flex gap-3"><span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-muted"><IconClock className="size-3.5" /></span><div><p className="text-xs leading-5">{activity.detail}</p><p className="mt-1 text-[10px] capitalize text-muted-foreground">{activity.activity_type.replace("_", " ")}</p></div></div>)}{!data?.activities?.length && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}</CardContent></Card></div>
    </div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{selected?.name}</DialogTitle><DialogDescription>{selected?.company || selected?.email} · {stageLabels[selected?.stage || ""] || selected?.stage}</DialogDescription></DialogHeader>{selected && <div className="grid gap-5"><div className="flex flex-wrap gap-2"><Button size="sm" render={<a href={`mailto:${selected.email}`} />}><IconMail />Email</Button><Button size="sm" variant="outline" disabled={!whatsappNumber} render={<a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" />}><IconMessageCircle />WhatsApp</Button><Button size="sm" variant="outline" disabled={!selected.phone} render={<a href={`tel:${selected.phone}`} />}><IconPhone />Call</Button></div><div className="rounded-xl border p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add activity</p><form onSubmit={saveActivity} className="mt-3 grid gap-3"><div className="grid grid-cols-[150px_1fr] gap-2"><Select value={activityType} onValueChange={(value) => { if (value) setActivityType(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["note", "email", "whatsapp", "call", "appointment"].map((type) => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent></Select><Input required value={note} onChange={(event) => setNote(event.target.value)} placeholder="What happened or what is next?" /></div><div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Log activity"}</Button></div></form></div><div><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</p><div className="space-y-3">{activities.map((activity) => <div key={activity.id} className="flex gap-3 rounded-lg border p-3"><IconClock className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-sm">{activity.detail}</p><p className="mt-1 text-[11px] capitalize text-muted-foreground">{activity.activity_type.replace("_", " ")} · {new Date(activity.created_at).toLocaleString("en-IN")}</p></div></div>)}{!activities.length && <p className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">No timeline activity yet.</p>}</div></div></div>}</DialogContent></Dialog>
  </main>;
}
