"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconActivity, IconArrowUpRight, IconCheck, IconChevronRight, IconClock, IconPlugConnected, IconRefresh, IconSearch, IconSettings, IconSparkles, IconX } from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@zerocraft/components/ui/dialog";
import { Input } from "@zerocraft/components/ui/input";
import { Switch } from "@zerocraft/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@zerocraft/components/ui/tabs";
import { COMMERCE_APPS, COMMERCE_APP_STATUS_LABELS, type CommerceApp, type CommerceAppStatus } from "@/lib/commerce-apps";
import { COMMERCE_FEATURES, type CommerceFeatureKey } from "@/lib/commerce-features";

const statusStyles: Record<CommerceAppStatus, string> = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ready: "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  planned: "border-border bg-muted text-muted-foreground",
  attention: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const providerKeys: Record<string, string> = { whatsapp: "whatsapp", analytics: "ga4", "search-console": "search_console", instagram: "instagram", "google-business": "google_business" };
const providerRequirements: Record<string, string> = { whatsapp: "N8N_WHATSAPP_WEBHOOK_URL", analytics: "GA4_PROPERTY_ID", "search-console": "GOOGLE_SEARCH_CONSOLE_SITE_URL", instagram: "INSTAGRAM_ACCESS_TOKEN", "google-business": "GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID" };

function StatusIcon({ status }: { status: CommerceAppStatus }) {
  if (status === "active") return <IconCheck className="size-3.5" />;
  if (status === "ready") return <IconPlugConnected className="size-3.5" />;
  if (status === "attention") return <IconActivity className="size-3.5" />;
  return <IconClock className="size-3.5" />;
}

function AppCard({ app, enabled, saving, connectionStatus, onToggle, onOpenDetails }: { app: CommerceApp; enabled: boolean; saving: boolean; connectionStatus?: string; onToggle: () => void; onOpenDetails: () => void }) {
  const AppIcon = app.icon;
  const connected = connectionStatus === "connected";
  const displayStatus: CommerceAppStatus = connected ? "active" : app.status;
  return <Card className={`group relative overflow-hidden border-border/80 shadow-none transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg ${!enabled ? "bg-muted/20" : ""}`}>
    <div className={`absolute inset-x-0 top-0 h-0.5 ${enabled ? "bg-primary" : "bg-border"}`} />
    <CardHeader className="gap-4 pb-3"><div className="flex items-start justify-between gap-3"><div className={`grid size-11 place-items-center rounded-2xl ${app.accent}`}><AppIcon className="size-5" stroke={1.8} /></div><Badge variant="outline" className={`gap-1.5 rounded-full text-[10px] ${statusStyles[displayStatus]}`}><StatusIcon status={displayStatus} />{connected ? "Connected" : COMMERCE_APP_STATUS_LABELS[app.status]}</Badge></div><div><CardTitle className="text-[15px] tracking-tight">{app.name}</CardTitle><CardDescription className="mt-1.5 min-h-10 text-xs leading-5">{app.description}</CardDescription></div></CardHeader>
    <CardContent className="space-y-4"><div className="flex min-h-11 flex-wrap content-start gap-1.5">{app.capabilities.map((capability) => <Badge key={capability} variant="secondary" className="rounded-md text-[10px] font-normal">{capability}</Badge>)}</div><div className="flex items-center justify-between border-t border-border/70 pt-3"><label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground"><Switch checked={enabled} onCheckedChange={onToggle} disabled={saving || app.status === "planned"} aria-label={`${enabled ? "Disable" : "Enable"} ${app.name}`} /><span>{app.kind === "app" ? (enabled ? "Module enabled" : "Disabled") : connected ? "Connected" : enabled ? "Enabled / configure" : "Disabled"}</span></label><div className="flex items-center gap-1"><Button variant="ghost" size="icon-sm" aria-label={`Configure ${app.name}`} onClick={onOpenDetails}><IconSettings /></Button>{app.href && enabled && <Button variant="ghost" size="icon-sm" render={<Link href={app.href} />} aria-label={`Open ${app.name}`}><IconArrowUpRight /></Button>}</div></div></CardContent>
  </Card>;
}

export default function IntegrationsPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(COMMERCE_APPS.map((app) => [app.id, app.status !== "planned"])));
  const [saving, setSaving] = useState<string | null>(null);
  const [registryReady, setRegistryReady] = useState<boolean | null>(null);
  const [health, setHealth] = useState<Record<string, { status: string; email?: string | null }> | null>(null);
  const [selectedApp, setSelectedApp] = useState<CommerceApp | null>(null);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      fetch("/api/admin/features", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error("feature registry unavailable"); const payload = await response.json() as { features?: Array<{ feature_key: CommerceFeatureKey; enabled: boolean }> }; if (mounted && payload.features) setEnabled((current) => ({ ...current, ...Object.fromEntries(payload.features!.map((feature) => [feature.feature_key, feature.enabled])) })); }),
      fetch("/api/admin/integrations", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error("integration registry unavailable"); const payload = await response.json() as { integrations?: Array<{ provider: string; enabled: boolean }> }; if (mounted) { setRegistryReady(true); if (payload.integrations) setEnabled((current) => ({ ...current, ...Object.fromEntries(payload.integrations!.map((item) => [item.provider.replaceAll("_", "-"), item.enabled])) })); } }),
      fetch("/api/admin/integrations/health", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error("health unavailable"); const payload = await response.json() as { providers?: Record<string, { status: string; email?: string | null }> }; if (mounted) setHealth(payload.providers || null); }),
    ]).catch(() => { if (mounted) setRegistryReady(false); });
    return () => { mounted = false; };
  }, []);

  async function toggleApp(app: CommerceApp) {
    const next = !(enabled[app.id] ?? false);
    setEnabled((current) => ({ ...current, [app.id]: next }));
    setSaving(app.id);
    try {
      const response = app.feature
        ? await fetch("/api/admin/features", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureKey: app.feature, enabled: next }) })
        : await fetch("/api/admin/integrations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: app.id.replaceAll("-", "_"), enabled: next }) });
      if (!response.ok) throw new Error("setting could not be saved");
      if (app.feature) window.dispatchEvent(new CustomEvent("studio-feature-change", { detail: { key: app.feature, enabled: next } }));
    } catch { setEnabled((current) => ({ ...current, [app.id]: !next })); } finally { setSaving(null); }
  }

  async function connectSelected() {
    if (!selectedApp) return;
    if (selectedApp.id === "email") {
      window.location.href = "/api/admin/email/oauth";
      return;
    }
    if (selectedApp.id === "search-console") {
      window.location.href = "/api/admin/search-console/oauth";
      return;
    }
    const provider = providerKeys[selectedApp.id];
    if (!provider) return;
    setConnectionBusy(true);
    setConnectionMessage("");
    setConnectionError("");
    try {
      const response = await fetch("/api/admin/integrations/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, metadata: { source: "integrations_workspace" } }) });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Connection could not be completed.");
      setEnabled((current) => ({ ...current, [selectedApp.id]: true }));
      setConnectionMessage(payload.message || "Integration connected.");
      const healthResponse = await fetch("/api/admin/integrations/health", { cache: "no-store" });
      if (healthResponse.ok) {
        const healthPayload = await healthResponse.json() as { providers?: Record<string, { status: string; email?: string | null }> };
        setHealth(healthPayload.providers || null);
      }
    } catch (cause) {
      setConnectionError(cause instanceof Error ? cause.message : "Connection could not be completed.");
    } finally {
      setConnectionBusy(false);
    }
  }

  async function disconnectSelected() {
    if (!selectedApp) return;
    const provider = providerKeys[selectedApp.id];
    if (!provider) return;
    setConnectionBusy(true);
    setConnectionMessage("");
    setConnectionError("");
    try {
      const response = await fetch(`/api/admin/integrations/connect?provider=${provider}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Disconnect could not be completed.");
      setEnabled((current) => ({ ...current, [selectedApp.id]: false }));
      setConnectionMessage("Integration disconnected.");
      const healthResponse = await fetch("/api/admin/integrations/health", { cache: "no-store" });
      if (healthResponse.ok) {
        const healthPayload = await healthResponse.json() as { providers?: Record<string, { status: string; email?: string | null }> };
        setHealth(healthPayload.providers || null);
      }
    } catch (cause) {
      setConnectionError(cause instanceof Error ? cause.message : "Disconnect could not be completed.");
    } finally {
      setConnectionBusy(false);
    }
  }

  const visibleApps = useMemo(() => COMMERCE_APPS.filter((app) => { const matchesTab = activeTab === "all" || app.kind === activeTab || app.category.toLowerCase() === activeTab; const matchesQuery = `${app.name} ${app.description} ${app.category} ${app.capabilities.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()); return matchesTab && matchesQuery; }), [activeTab, query]);
  const enabledModules = COMMERCE_FEATURES.filter((feature) => enabled[feature.key]).length;
  const availableCount = COMMERCE_APPS.filter((app) => enabled[app.id]).length;
  const providerStatus = selectedApp?.id === "search-console" ? health?.searchConsole : selectedApp?.id === "google-business" ? health?.googleBusiness : selectedApp?.id === "analytics" ? health?.ga4 : health?.[selectedApp?.id || ""];

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8"><div className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full bg-primary/10 blur-3xl" /><div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-2xl"><div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"><IconSparkles className="size-4" />Commerce OS / Control plane</div><h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Apps &amp; integrations</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Choose which Commerce modules are available to your team, then connect the external services that power them.</p></div><div className="grid grid-cols-3 gap-2 sm:gap-3">{[[enabledModules, "Modules on"], [availableCount, "Available"], [COMMERCE_APPS.length - availableCount, "Off"]].map(([value, label]) => <div key={label} className="min-w-24 rounded-2xl border bg-background/70 p-3 text-center"><p className="text-xl font-semibold tracking-tight">{value}</p><p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p></div>)}</div></div></section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><Card className="overflow-hidden border-border/80 shadow-none"><CardHeader className="border-b border-border/70 pb-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Workspace controls</CardTitle><CardDescription className="mt-1">Disabled modules disappear from CMS navigation and cannot be opened from the workspace.</CardDescription></div><div className="relative w-full sm:w-64"><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps" className="h-9 pl-9" /></div></div></CardHeader><CardContent className="pt-5"><Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4"><TabsList className="mb-1 flex h-9 w-full justify-start overflow-x-auto rounded-xl border border-border/70 bg-muted/60 p-1 sm:w-fit"><TabsTrigger className="px-3 text-xs" value="all">All apps</TabsTrigger><TabsTrigger className="px-3 text-xs" value="app">Commerce modules</TabsTrigger><TabsTrigger className="px-3 text-xs" value="integration">Connections</TabsTrigger><TabsTrigger className="px-3 text-xs" value="growth">Growth</TabsTrigger></TabsList><TabsContent value={activeTab} className="mt-0"><div className="grid gap-4 md:grid-cols-2">{visibleApps.map((app) => <AppCard key={app.id} app={app} enabled={enabled[app.id] ?? false} saving={saving === app.id} onToggle={() => void toggleApp(app)} onOpenDetails={() => setSelectedApp(app)} />)}</div>{!visibleApps.length && <div className="rounded-2xl border border-dashed p-10 text-center"><IconX className="mx-auto size-5 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No apps found</p><p className="mt-1 text-xs text-muted-foreground">Try a different search or category.</p></div>}</TabsContent></Tabs></CardContent></Card>
      <aside className="space-y-5"><Card className="border-border/80 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><IconActivity className="size-4 text-primary" />Connection health</CardTitle><CardDescription>Live readiness for the Commerce connection layer.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5"><span className="flex items-center gap-2 text-xs font-medium"><span className="size-2 rounded-full bg-emerald-500" />Core workspace</span><Badge variant="outline" className="border-emerald-500/25 text-[10px] text-emerald-700 dark:text-emerald-300">Healthy</Badge></div><div className="flex items-center justify-between rounded-xl bg-blue-500/10 px-3 py-2.5"><span className="flex items-center gap-2 text-xs font-medium"><span className="size-2 rounded-full bg-blue-500" />Feature registry</span><Badge variant="outline" className={`text-[10px] ${registryReady === true ? "border-emerald-500/25 text-emerald-700 dark:text-emerald-300" : registryReady === false ? "border-amber-500/25 text-amber-700 dark:text-amber-300" : ""}`}>{registryReady === true ? "Connected" : registryReady === false ? "Migration needed" : "Checking"}</Badge></div><div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5"><span className="flex items-center gap-2 text-xs font-medium"><span className="size-2 rounded-full bg-muted-foreground/40" />External providers</span><Badge variant="outline" className="text-[10px]">{health ? "Checked" : "Pending"}</Badge></div><Button variant="outline" className="mt-1 w-full" size="sm" onClick={() => window.location.reload()}><IconRefresh />Refresh health</Button></CardContent></Card><Card className="border-border/80 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><IconPlugConnected className="size-4 text-primary" />Next connections</CardTitle><CardDescription>Operational areas connected to this control plane.</CardDescription></CardHeader><CardContent className="space-y-1"><Link href="/system/automations" className="flex items-center justify-between rounded-lg px-2 py-2 text-xs hover:bg-muted"><span>Webhook events &amp; retries</span><IconChevronRight className="size-4 text-muted-foreground" /></Link><Link href="/system/health" className="flex items-center justify-between rounded-lg px-2 py-2 text-xs hover:bg-muted"><span>Delivery monitoring</span><IconChevronRight className="size-4 text-muted-foreground" /></Link><Link href="/system/audit-logs" className="flex items-center justify-between rounded-lg px-2 py-2 text-xs hover:bg-muted"><span>Unified audit timeline</span><IconChevronRight className="size-4 text-muted-foreground" /></Link></CardContent></Card></aside></div>
    <Dialog open={Boolean(selectedApp)} onOpenChange={(open) => { if (!open) { setSelectedApp(null); setConnectionMessage(""); setConnectionError(""); } }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{selectedApp?.name}</DialogTitle><DialogDescription>{selectedApp?.description}</DialogDescription></DialogHeader>{selectedApp && <div className="grid gap-4"><div className="rounded-2xl border bg-muted/40 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capabilities</p><div className="mt-3 flex flex-wrap gap-2">{selectedApp.capabilities.map((capability) => <Badge key={capability} variant="secondary">{capability}</Badge>)}</div></div><div className="grid gap-3 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{providerStatus?.status || (enabled[selectedApp.id] ? "Enabled" : "Disabled")}</Badge></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Workspace access</span><span>{enabled[selectedApp.id] ? "Available in CMS" : "Hidden from CMS"}</span></div></div>{connectionError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{connectionError}</div>}{connectionMessage && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">{connectionMessage}</div>}<div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{selectedApp.feature ? "This is a workspace module. Turning it off hides its navigation and blocks the module route until it is enabled again." : providerKeys[selectedApp.id] ? <>Credentials stay server-side. The connection check uses <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{providerRequirements[selectedApp.id]}</code>. Add it to the CMS environment before connecting.</> : "Provider credentials remain server-side."}</div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setSelectedApp(null)}>Close</Button>{selectedApp.feature === "email" && <Button onClick={() => void connectSelected()} disabled={connectionBusy}>Open Gmail connect</Button>}{providerKeys[selectedApp.id] && providerStatus?.status === "connected" && <Button variant="outline" onClick={() => void disconnectSelected()} disabled={connectionBusy}>{connectionBusy ? "Working…" : "Disconnect"}</Button>}{providerKeys[selectedApp.id] && providerStatus?.status !== "connected" && <Button onClick={() => void connectSelected()} disabled={connectionBusy}>{connectionBusy ? "Connecting…" : "Connect integration"}</Button>}{selectedApp.href && enabled[selectedApp.id] && <Button render={<Link href={selectedApp.href} />}>Open app</Button>}</div></div>}</DialogContent></Dialog>
  </main>;
}
