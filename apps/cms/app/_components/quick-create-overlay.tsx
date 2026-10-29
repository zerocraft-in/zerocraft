"use client";

import { useRouter } from "next/navigation";
import { IconCalendarPlus, IconFilePlus, IconFolderPlus, IconShoppingBag } from "@tabler/icons-react";

const actions = [
  { label: "New project", description: "Start a project brief", href: "/projects?create=1", icon: IconFolderPlus },
  { label: "New client", description: "Add a CRM contact", href: "/clients?create=1", icon: IconFilePlus },
  { label: "New appointment", description: "Schedule a client call", href: "/appointments?create=1", icon: IconCalendarPlus },
  { label: "New product", description: "Add a store product", href: "/store/products/new", icon: IconShoppingBag },
];

export function QuickCreateOverlay() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-4 backdrop-blur-[2px]" role="presentation">
      <button type="button" aria-label="Close quick create" className="absolute inset-0 cursor-default" onClick={() => router.back()} />
      <section role="dialog" aria-modal="true" aria-labelledby="quick-create-title" className="relative mx-auto mt-[12vh] w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace action</p><h2 id="quick-create-title" className="mt-1 text-lg font-semibold">Quick create</h2><p className="mt-1 text-xs text-muted-foreground">Start a new record without leaving your current workspace.</p></div><button type="button" onClick={() => router.back()} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">Close</button></div>
        <div className="mt-5 grid gap-2">{actions.map(({ label, description, href, icon: Icon }) => <button key={href} type="button" onClick={() => router.push(href)} className="flex items-center gap-3 rounded-lg border border-border/80 p-3 text-left transition-colors hover:bg-muted"><span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span></button>)}</div>
      </section>
    </div>
  );
}
