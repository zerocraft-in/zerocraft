"use client";

import Link from "next/link";
import { useState } from "react";
import { IconChevronRight, IconCode, IconInfoCircle, IconSearch } from "@tabler/icons-react";
import { Input } from "@zerocraft/components/ui/input";
import { scopedPath } from "@/lib/platform/scope";

const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function CustomerEventsSettings({ pathname }: { pathname: string }) {
  const [search, setSearch] = useState("");
  const integrationsHref = scopedPath("/settings/integrations", pathname);

  return (
    <main className="mx-auto w-full max-w-[800px] pb-20">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-medium tracking-tight">Customer events</h1><p className="mt-1 text-xs leading-5 text-muted-foreground">Manage pixels and event destinations that receive customer activity.</p></div><div className="flex gap-2"><button type="button" disabled title="Custom pixel management is not available yet" className="h-8 rounded-full border bg-card px-3 text-[11px] font-medium text-muted-foreground opacity-60">Add custom pixel</button><Link href={integrationsHref} className="inline-flex h-8 items-center rounded-full bg-foreground px-3 text-[11px] font-medium text-background">Explore integrations</Link></div></header>

      <section className="space-y-2.5">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">Pixels <IconInfoCircle className="size-3.5 text-muted-foreground" /></h2>
        <div className={cardClass}>
          <div className="flex items-center gap-2 border-b px-3 py-2"><IconSearch className="ml-1 size-4 shrink-0 text-muted-foreground" /><Input aria-label="Search pixels" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pixels" className="h-8 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0" /><span className="grid size-7 place-items-center rounded-full bg-muted text-[10px] text-muted-foreground">↕</span></div>
          <div className="grid grid-cols-[minmax(0,1fr)_92px_64px] gap-3 bg-muted/40 px-4 py-2.5 text-[10px] font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_130px_90px] sm:px-5"><span>Pixels</span><span>Status</span><span>Data</span></div>
          <div className="px-4 py-9 text-center"><IconCode className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-xs font-medium">{search ? "No matching pixels" : "No custom pixels configured"}</p><p className="mt-1 text-[11px] text-muted-foreground">{search ? "Try another search term." : "No custom customer-event pixel records are configured for this store."}</p></div>
        </div>
      </section>
      <Link href={integrationsHref} className="mt-5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">Manage analytics and event integrations<IconChevronRight className="size-3.5" /></Link>
    </main>
  );
}
