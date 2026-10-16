"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowUpRight,
  IconBolt,
  IconBrandGoogle,
  IconDatabase,
  IconPlugConnected,
  IconSearch,
  IconShoppingBag,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";

type PluginItem = {
  name: string;
  description: string;
  state: string;
  ready: boolean;
  href: string;
  icon: typeof IconBolt;
  kind: "App" | "Connection";
  action: string;
};

export default function PluginsManager({
  geminiReady,
  supabaseReady,
  commerceReady,
  automationReady,
}: {
  geminiReady: boolean;
  supabaseReady: boolean;
  commerceReady: boolean;
  automationReady: boolean;
}) {
  const [query, setQuery] = useState("");
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const items: PluginItem[] = [
    { name: "AI writing assistant", description: "Draft content with your connected Gemini model.", state: geminiReady ? "Enabled" : "Needs setup", ready: geminiReady, href: "/studio/ai", icon: IconSparkles, kind: "App", action: "Open assistant" },
    { name: "Commerce", description: "Manage products, categories, and orders in Studio.", state: commerceReady ? "Ready" : "Check setup", ready: commerceReady, href: "/studio/store", icon: IconShoppingBag, kind: "App", action: "Open Store" },
    { name: "Event automations", description: "Manage order and appointment event workflows.", state: automationReady ? "Connected" : "Needs setup", ready: automationReady, href: "/studio/automations", icon: IconBolt, kind: "App", action: "Open automations" },
    { name: "Google Gemini", description: "Model provider used by the assistant and drafting tools.", state: geminiReady ? "Connected" : "Not connected", ready: geminiReady, href: "#integrations", icon: IconBrandGoogle, kind: "Connection", action: "Manage connection" },
    { name: "Supabase", description: "Database and authentication connection for this workspace.", state: supabaseReady ? "Connected" : "Check setup", ready: supabaseReady, href: "#integrations", icon: IconDatabase, kind: "Connection", action: "Manage connection" },
  ];
  const filtered = useMemo(() => items.filter((item) => `${item.name} ${item.description} ${item.kind}`.toLowerCase().includes(query.trim().toLowerCase())), [items, query]);
  const apps = filtered.filter((item) => item.kind === "App");
  const connections = filtered.filter((item) => item.kind === "Connection");

  const closeDirectory = () => setDirectoryOpen(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
          <IconSearch size={16} aria-hidden="true" />
          <span className="sr-only">Search installed apps and connections</span>
          <input
            className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search installed apps"
          />
        </label>
        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          onClick={() => setDirectoryOpen(true)}
        >
          <IconPlugConnected size={15} />
          Add plugin
        </button>
      </div>
      <div className="flex min-h-12 flex-col justify-between gap-2 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center">
        <span className="grid gap-1">
          <strong className="text-sm font-medium">Workspace access</strong>
          <small className="text-xs text-muted-foreground">Connected tools use your Studio role permissions.</small>
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <IconDatabase size={14} />
          Managed in Studio
        </span>
      </div>

      {apps.length > 0 && <section className="overflow-hidden rounded-lg border bg-card" aria-label="Installed apps">
        <h3 className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">Installed apps</h3>
        {apps.map((item) => <PluginRow key={item.name} item={item} />)}
      </section>}
      {connections.length > 0 && <section className="overflow-hidden rounded-lg border bg-card" aria-label="Connected services">
        <h3 className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">Connected services</h3>
        {connections.map((item) => <PluginRow key={item.name} item={item} />)}
      </section>}
      {!filtered.length && <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">No installed apps or services match “{query}”.</p>}

      {directoryOpen && <div className="fixed inset-0 z-[110] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDirectory(); }}>
        <section className="max-h-[min(680px,calc(100dvh-2rem))] w-full max-w-xl overflow-auto rounded-xl border bg-popover text-popover-foreground shadow-xl" role="dialog" aria-modal="true" aria-labelledby="studio-plugin-directory-title">
          <header className="flex items-start justify-between gap-4 border-b p-5">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Studio directory</p><h3 id="studio-plugin-directory-title" className="mt-1 text-lg font-semibold tracking-tight">Add a plugin</h3><p className="mt-1 text-sm text-muted-foreground">Browse tools already available in this workspace.</p></div>
            <button type="button" className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={closeDirectory} aria-label="Close plugin directory"><IconX size={18} /></button>
          </header>
          <div className="space-y-1 p-2">
            {items.map((item) => {
              const Icon = item.icon;
              return <Link key={item.name} href={item.href} onClick={closeDirectory} className="flex min-w-0 items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent">
                <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground"><Icon size={17} /></span>
                <span className="grid min-w-0 flex-1 gap-1"><strong className="text-sm font-medium">{item.name}</strong><small className="truncate text-xs text-muted-foreground">{item.description}</small></span>
                <span className={`hidden shrink-0 items-center gap-1.5 text-xs sm:inline-flex ${item.ready ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}><i className={`size-1.5 rounded-full ${item.ready ? "bg-emerald-500" : "bg-amber-500"}`} />{item.state}</span>
                <IconArrowUpRight size={15} className="shrink-0 text-muted-foreground" />
              </Link>;
            })}
          </div>
          <div className="flex flex-col justify-between gap-2 border-t px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center"><span>More OAuth connectors can be added after their provider setup is configured.</span><Link className="inline-flex items-center gap-1 text-foreground hover:underline" href="#integrations" onClick={closeDirectory}>View integrations <IconArrowUpRight size={13} /></Link></div>
        </section>
      </div>}
    </div>
  );
}

function PluginRow({ item }: { item: PluginItem }) {
  const Icon = item.icon;
  return <article className="flex min-w-0 flex-wrap items-center gap-3 border-t px-4 py-3 first:border-t-0">
    <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground"><Icon size={18} /></span>
    <span className="grid min-w-0 flex-1 gap-1"><strong className="truncate text-sm font-medium">{item.name}</strong><small className="truncate text-xs text-muted-foreground">{item.description}</small></span>
    <span className={`inline-flex items-center gap-1.5 text-xs ${item.ready ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}><i className={`size-1.5 rounded-full ${item.ready ? "bg-emerald-500" : "bg-amber-500"}`} />{item.state}</span>
    <Link href={item.href} className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent">{item.action}<IconArrowUpRight size={13} /></Link>
  </article>;
}
