"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowUpRight, IconChevronRight, IconDots, IconSearch } from "@tabler/icons-react";
import { Input } from "@zerocraft/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@zerocraft/components/ui/tabs";
import { COMMERCE_APPS, COMMERCE_APP_STATUS_LABELS, type CommerceApp } from "@/lib/commerce-apps";
import type { CommerceFeatureKey } from "@/lib/commerce-features";
import { scopedPath } from "@/lib/platform/scope";

type Feature = { feature_key: CommerceFeatureKey; enabled: boolean };
type Integration = { provider: string; enabled: boolean; status: string };
const integrationProviders: Record<string, string> = { whatsapp: "whatsapp", analytics: "ga4", "search-console": "search_console", instagram: "instagram", "google-business": "google_business" };
const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function AppsSettings({ pathname }: { pathname: string }) {
  const [features, setFeatures] = useState<Feature[] | null>(null);
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [tab, setTab] = useState("installed");
  const [search, setSearch] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/admin/features", { cache: "no-store", signal: controller.signal }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error("Feature registry unavailable."); return payload.features as Feature[]; }),
      fetch("/api/admin/integrations", { cache: "no-store", signal: controller.signal }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error("Integration registry unavailable."); return payload.integrations as Integration[]; }),
    ]).then(([nextFeatures, nextIntegrations]) => { setFeatures(nextFeatures); setIntegrations(nextIntegrations); setState("ready"); }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, []);

  function isInstalled(app: CommerceApp) {
    if (app.kind === "integration") {
      const provider = integrationProviders[app.id];
      return Boolean(integrations?.some((item) => item.provider === provider && item.enabled && item.status === "connected"));
    }
    if (app.feature) return Boolean(features?.some((feature) => feature.feature_key === app.feature && feature.enabled));
    return app.status === "active";
  }

  const apps = COMMERCE_APPS.filter((app) => (tab === "installed" ? isInstalled(app) : !isInstalled(app)) && `${app.name} ${app.description} ${app.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  const integrationsHref = scopedPath("/settings/integrations", pathname);

  return (
    <main className="mx-auto w-full max-w-[800px] pb-20">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-medium tracking-tight">Apps</h1><p className="mt-1 text-xs leading-5 text-muted-foreground">Manage enabled store modules and connected services.</p></div><Link href={integrationsHref} className="inline-flex h-8 items-center rounded-full bg-foreground px-3 text-[11px] font-medium text-background">Manage integrations</Link></header>
      <div className={cardClass}>
        <div className="flex flex-col gap-2 border-b p-2.5 sm:flex-row sm:items-center sm:justify-between"><Tabs value={tab} onValueChange={setTab}><TabsList className="h-8 rounded-full bg-muted p-1"><TabsTrigger value="installed" className="rounded-full px-3 text-[11px]">Installed</TabsTrigger><TabsTrigger value="uninstalled" className="rounded-full px-3 text-[11px]">Uninstalled</TabsTrigger></TabsList><TabsContent value="installed" /><TabsContent value="uninstalled" /></Tabs><div className="relative min-w-0 flex-1 sm:max-w-[300px]"><IconSearch className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apps" className="h-8 border-0 bg-transparent pl-9 text-xs shadow-none focus-visible:ring-0" /></div></div>
        {state === "loading" ? <p className="px-4 py-7 text-xs text-muted-foreground">Loading app registry…</p> : state === "error" ? <p role="alert" className="px-4 py-7 text-xs text-destructive">Apps could not be loaded. Check your settings permission and app registry.</p> : apps.length ? apps.map((app) => { const AppIcon = app.icon; const status = app.kind === "integration" ? (isInstalled(app) ? "Connected" : COMMERCE_APP_STATUS_LABELS[app.status]) : (isInstalled(app) ? "Enabled" : "Disabled"); return <div key={app.id} className="flex min-h-[58px] items-center gap-3 border-t px-4 py-3 first:border-t-0 sm:px-5"><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${app.accent}`}><AppIcon className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{app.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{app.description}</p></div><span className={`shrink-0 rounded-md px-2 py-1 text-[10px] ${isInstalled(app) ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{status}</span><Link href={app.href ? scopedPath(app.href, pathname) : integrationsHref} aria-label={`Open ${app.name}`} className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><IconArrowUpRight className="size-4" /></Link><IconDots className="size-4 shrink-0 text-muted-foreground" /></div>; }) : <div className="px-4 py-10 text-center"><p className="text-xs font-medium">{search ? "No matching apps" : tab === "installed" ? "No apps installed" : "No uninstalled apps"}</p><p className="mt-1 text-[11px] text-muted-foreground">{search ? "Try a different search." : "App state is based on the store module and integration registries."}</p></div>}
      </div>
      <Link href={integrationsHref} className="mt-5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">View available modules and integrations<IconChevronRight className="size-3.5" /></Link>
    </main>
  );
}
