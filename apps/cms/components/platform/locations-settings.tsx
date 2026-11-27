"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { IconCheck, IconDeviceTablet, IconMapPin, IconPlus, IconRefresh } from "@tabler/icons-react";
import { Input } from "@zerocraft/components/ui/input";

type Location = { id: string; name: string; code: string; is_active: boolean; created_at: string };
type Payload = { locations: Location[]; levels: Array<{ location_id: string }> };
const cardClass = "overflow-hidden rounded-2xl border bg-card shadow-sm";

export function LocationsSettings() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/store/inventory", { cache: "no-store" });
      const payload = await response.json() as Payload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Locations could not be loaded.");
      setLocations(payload.locations || []); setState("ready"); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Locations could not be loaded."); setState("error"); }
  }, []);

  useEffect(() => {
    void load();
    let current = true;
    void fetch("/api/admin/me", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => { if (current) setCanManage(Array.isArray(payload?.permissions) && payload.permissions.includes("inventory.manage")); }).catch(() => undefined);
    return () => { current = false; };
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !canManage) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/store/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, code }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Location could not be created.");
      setName(""); setCode(""); setShowForm(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Location could not be created."); }
    finally { setBusy(false); }
  }

  async function toggle(location: Location) {
    if (busy || !canManage) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/store/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: location.id, isActive: !location.is_active }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Location status could not be changed.");
      setLocations((current) => current.map((item) => item.id === location.id ? payload.location as Location : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Location status could not be changed."); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto w-full max-w-[800px] space-y-7 pb-20">
      <h1 className="text-2xl font-medium tracking-tight">Locations</h1>
      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
      <section className="space-y-2.5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-medium">All locations</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{state === "ready" ? `${locations.filter((item) => item.is_active).length} active ${locations.filter((item) => item.is_active).length === 1 ? "location" : "locations"} available for inventory.` : "Inventory and fulfillment locations for this store."}</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={state === "loading"} aria-label="Refresh locations" className="grid size-8 place-items-center rounded-full border bg-card text-muted-foreground hover:bg-muted disabled:opacity-50"><IconRefresh className="size-4" /></button><button type="button" onClick={() => setShowForm((value) => !value)} disabled={!canManage} title={!canManage ? "Inventory manage permission required" : undefined} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50"><IconPlus className="size-3.5" />Location</button></div></div>
        {showForm && <form onSubmit={submit} className={`${cardClass} grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end`}><label className="grid gap-1.5 text-[11px] font-medium">Location name<Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Main store" maxLength={120} required /></label><label className="grid gap-1.5 text-[11px] font-medium">Code<Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="MAIN" minLength={2} maxLength={32} required /></label><button type="submit" disabled={busy} className="h-9 rounded-lg bg-foreground px-4 text-xs font-medium text-background disabled:opacity-50">{busy ? "Adding…" : "Add location"}</button></form>}
        <div className={cardClass}>
          <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-3 bg-muted/40 px-4 py-2.5 text-[10px] font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_130px_120px] sm:px-5"><span>Location</span><span>Inventory</span><span>Status</span></div>
          {state === "loading" ? <p className="px-4 py-7 text-xs text-muted-foreground">Loading locations…</p> : state === "error" ? <p className="px-4 py-7 text-xs text-muted-foreground">Location data is unavailable. Refresh to try again.</p> : locations.length ? locations.map((location) => <div key={location.id} className="grid grid-cols-[minmax(0,1fr)_90px_90px] items-center gap-3 border-t px-4 py-3.5 text-xs sm:grid-cols-[minmax(0,1fr)_130px_120px] sm:px-5"><div className="flex min-w-0 items-center gap-2.5"><IconMapPin className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="truncate font-medium">{location.name}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{location.code}</p></div></div><span className="text-[11px] text-muted-foreground">Inventory</span><button type="button" onClick={() => void toggle(location)} disabled={!canManage || busy} className={`w-fit rounded-md px-2 py-1 text-[10px] font-medium disabled:cursor-default ${location.is_active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`} title={canManage ? `Click to ${location.is_active ? "deactivate" : "activate"} this location` : undefined}>{location.is_active ? <span className="inline-flex items-center gap-1"><IconCheck className="size-3" />Active</span> : "Inactive"}</button></div>) : <div className="px-4 py-10 text-center"><IconMapPin className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-xs font-medium">No locations yet</p><p className="mt-1 text-[11px] text-muted-foreground">Add a location to track inventory and fulfillment.</p></div>}
        </div>
      </section>
      <section className="space-y-2.5"><div><h2 className="text-sm font-medium">Point of Sale</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">In-person selling setup for your active locations.</p></div><div className={`${cardClass} flex min-h-[58px] items-center gap-3 px-4 py-3`}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-700"><IconDeviceTablet className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-medium">ZeroCraft Point of Sale</p><p className="mt-0.5 text-[11px] text-muted-foreground">Point of Sale setup is coming soon.</p></div><span className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">Coming soon</span></div></section>
    </main>
  );
}
