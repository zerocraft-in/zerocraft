"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowUpRight,
  IconChevronDown,
  IconDownload,
  IconPlus,
  IconSearch,
  IconSparkles,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type SquareWorkspaceConfig = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: { label: string; href: string };
  stats: Array<{ label: string; value: string; detail: string }>;
  tabs: string[];
  rows: Array<{ name: string; meta: string; status: string; value: string }>;
};

export function SquareWorkspace({ config }: { config: SquareWorkspaceConfig }) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(config.tabs[0]);
  const rows = useMemo(
    () => config.rows.filter((row) => `${row.name} ${row.meta} ${row.status}`.toLowerCase().includes(query.toLowerCase())),
    [config.rows, query],
  );

  return (
    <main className="space-y-7 pb-12">
      <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{config.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm"><IconDownload /> Export</Button>
          {config.primaryAction && <Button size="sm" render={<Link href={config.primaryAction.href} />} nativeButton={false}><IconPlus /> {config.primaryAction.label}</Button>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {config.stats.map((stat) => (
          <Card key={stat.label} className="border-border shadow-none">
            <CardHeader className="pb-2"><CardDescription>{stat.label}</CardDescription><CardTitle className="text-2xl tracking-tight">{stat.value}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">{stat.detail}</CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-none">
        <CardHeader className="gap-4 border-b border-border pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><CardTitle className="text-lg">{activeTab}</CardTitle><CardDescription className="mt-1">Manage this workspace with the same focused controls across ZeroCraft.</CardDescription></div>
            <div className="flex flex-wrap gap-2">
              <label className="flex h-9 min-w-56 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
                <IconSearch className="size-4" /><input aria-label={`Search ${config.title}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
              </label>
              <Button variant="outline" size="sm">Status <IconChevronDown /></Button>
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto text-sm" role="tablist" aria-label={`${config.title} views`}>
            {config.tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`border-b-2 pb-2 font-medium whitespace-nowrap ${activeTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{tab}</button>)}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(150px,1fr)_120px_120px] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground md:grid"><span>Name</span><span>Details</span><span>Status</span><span className="text-right">Value</span></div>
          {rows.length ? rows.map((row) => (
            <div key={row.name} className="grid gap-2 border-b border-border px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(150px,1fr)_120px_120px] md:items-center md:gap-4">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{row.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{row.meta}</p></div>
              <p className="text-sm text-muted-foreground">{row.meta}</p>
              <Badge variant={row.status === "Active" || row.status === "Completed" ? "secondary" : "outline"} className="w-fit">{row.status}</Badge>
              <p className="text-left text-sm font-medium md:text-right">{row.value}</p>
            </div>
          )) : <div className="grid min-h-48 place-items-center px-6 text-center"><div><IconSparkles className="mx-auto size-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No matching records</p><p className="mt-1 text-xs text-muted-foreground">Try a different search term or clear your filters.</p></div></div>}
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground"><span>{rows.length} records</span><Link href="/reports" className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">View insights <IconArrowUpRight className="size-3.5" /></Link></div>
        </CardContent>
      </Card>
    </main>
  );
}
