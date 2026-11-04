import Link from "next/link";
import { ExternalLink, Filter, Plus } from "lucide-react";
import { Badge } from "@zerocraft/ui/components/badge";
import { Button } from "@zerocraft/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/ui/components/card";

const projects = [
  ["Cinema Streetwear Atelier", "Creative E-Commerce", "ZeroCraft Internal", "2026", "Published", "14.2k", "from-amber-300 to-orange-400"],
  ["ZeroCraft Unified CMS", "Platform Architecture", "Enterprise Suite", "2026", "Published", "6.8k", "from-sky-300 to-blue-500"],
  ["HyperScale Spatial Showroom", "Creative Engineering", "Voxel Dynamics", "2025", "Published", "3.5k", "from-violet-300 to-fuchsia-500"],
  ["Sovereign Auth & Payments Engine", "Fintech Infrastructure", "Finova Network", "2026", "Draft", "—", "from-emerald-300 to-teal-500"],
] as const;

const glass = "border-white/10 bg-white/[.055] shadow-[0_18px_55px_rgba(0,0,0,.2)] backdrop-blur-2xl";

export default function ProjectsDashboard() {
  return (
    <div className="relative isolate space-y-6 overflow-hidden rounded-[28px] p-1">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 -z-10 size-72 rounded-full bg-sky-300/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/3 -z-10 size-64 rounded-full bg-amber-300/20 blur-3xl" />
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Portfolio operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Showcase projects</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Curate case studies and manage the work that represents ZeroCraft in public.</p></div><Button render={<Link href="/studio/projects/new" />}><Plus /> New project</Button></section>
      <Card className={`${glass} overflow-hidden`}><CardHeader className="border-b border-border/70"><div><CardTitle>Project library</CardTitle><CardDescription>{projects.length} active entries · synced with the public portfolio</CardDescription></div><Button variant="outline" size="sm"><Filter /> Filter</Button></CardHeader><CardContent className="p-0"><div className="divide-y divide-border/70">{projects.map(([title, category, client, year, status, views, color]) => <div key={title} className="flex flex-col gap-4 p-5 transition-colors hover:bg-white/45 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-sm font-bold text-white shadow-sm`}>{title.slice(0, 1)}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{title}</h3>{status === "Published" ? <Badge variant="secondary">Published</Badge> : <Badge variant="outline">Draft</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{category} · {client} · {year}</p></div></div><div className="flex items-center gap-5 pl-14 md:pl-0"><span className="font-mono text-xs text-muted-foreground">{views} views</span><Button variant="ghost" size="sm">Edit</Button><Button variant="ghost" size="icon-xs" aria-label={`Open ${title}`}><ExternalLink /></Button></div></div>)}</div></CardContent></Card>
    </div>
  );
}
