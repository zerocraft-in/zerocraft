"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  IconAlertTriangle,
  IconBox,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/components/ui/card";
import { Input } from "@zerocraft/components/ui/input";
import { PageState } from "@/components/commerce/page-state";
import { PageHeader, PageShell } from "@/components/commerce/page-header";

type Location = { id: string; name: string; code: string; is_active: boolean; created_at: string };
type Level = {
  location_id: string;
  variant_id: string;
  on_hand: number;
  reserved: number;
  reorder_point: number;
  updated_at: string;
  location: { id: string; name: string; code: string } | null;
  variant: {
    id: string;
    label: string;
    sku: string;
    price: number | null;
    price_paise: number | null;
    currency_code: string | null;
    product: { id: string; title: string; status: string; product_type: string } | null;
  } | null;
};
type InventoryPayload = { locations: Location[]; levels: Level[] };

const inputClass = "h-9";

export default function InventoryWorkspace() {
  const [payload, setPayload] = useState<InventoryPayload>({ locations: [], levels: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { onHand: string; reorderPoint: string }>>({});

  const requestInventory = useCallback(async () => {
    const response = await fetch("/api/store/inventory", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Inventory could not be loaded.");
    return result as InventoryPayload;
  }, []);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const next = await requestInventory();
      setPayload(next);
      setDrafts(Object.fromEntries(next.levels.map((level) => [`${level.location_id}:${level.variant_id}`, { onHand: String(level.on_hand), reorderPoint: String(level.reorder_point) }])));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inventory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [requestInventory]);

  useEffect(() => {
    let current = true;
    requestInventory().then((next) => {
      if (!current) return;
      setPayload(next);
      setDrafts(Object.fromEntries(next.levels.map((level) => [`${level.location_id}:${level.variant_id}`, { onHand: String(level.on_hand), reorderPoint: String(level.reorder_point) }])));
      setError("");
    }).catch((cause: unknown) => {
      if (current) setError(cause instanceof Error ? cause.message : "Inventory could not be loaded.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [requestInventory]);
  useEffect(() => {
    let current = true;
    void fetch("/api/admin/me", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (current && Array.isArray(result?.permissions)) setPermissions(result.permissions);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, []);

  const canManageInventory = permissions?.includes("inventory.manage") === true;

  const filteredLevels = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return payload.levels;
    return payload.levels.filter((level) => [level.location?.name, level.location?.code, level.variant?.label, level.variant?.sku, level.variant?.product?.title].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [payload.levels, query]);
  const units = payload.levels.reduce((sum, level) => sum + Number(level.on_hand || 0), 0);
  const reserved = payload.levels.reduce((sum, level) => sum + Number(level.reserved || 0), 0);
  const lowStock = payload.levels.filter((level) => Number(level.on_hand) - Number(level.reserved) <= Number(level.reorder_point)).length;

  async function request(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    const response = await fetch("/api/store/inventory", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Inventory update failed.");
    return result;
  }

  async function addLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      await request("POST", { name: locationName, code: locationCode });
      setLocationName(""); setLocationCode(""); await load(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Location could not be created."); }
    finally { setBusy(false); }
  }

  async function saveLevel(level: Level) {
    const key = `${level.location_id}:${level.variant_id}`;
    const draft = drafts[key] || { onHand: String(level.on_hand), reorderPoint: String(level.reorder_point) };
    setBusy(true); setError("");
    try {
      await request("PATCH", { locationId: level.location_id, variantId: level.variant_id, onHand: Number(draft.onHand), reorderPoint: Number(draft.reorderPoint) });
      const alertResponse = await fetch("/api/admin/alerts/low-stock", { method: "POST" });
      const alertResult = await alertResponse.json();
      if (!alertResponse.ok) throw new Error(alertResult.error || "Low-stock alerts could not be synchronized.");
      await load(false);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Stock could not be updated."); }
    finally { setBusy(false); }
  }

  async function toggleLocation(location: Location) {
    setBusy(true); setError("");
    try { await request("PATCH", { locationId: location.id, isActive: !location.is_active }); await load(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Location could not be updated."); }
    finally { setBusy(false); }
  }

  async function deleteLocation(location: Location) {
    if (!window.confirm(`Delete “${location.name}”? Locations with stock cannot be deleted.`)) return;
    setBusy(true); setError("");
    try { await request("DELETE", { locationId: location.id }); await load(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Location could not be deleted."); }
    finally { setBusy(false); }
  }

  return (
    <PageShell className="max-w-screen-xl">
      <PageHeader eyebrow="Store / Operations" title="Inventory" description="Manage stock by location, track reserved units, and keep reorder points accurate." actions={<Button variant="outline" size="icon" aria-label="Refresh inventory" onClick={() => void load()} disabled={loading}><IconRefresh /></Button>} />

      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-4" aria-label="Inventory summary">
        {[['Units on hand', units, 'Across all locations'], ['Reserved', reserved, 'Unavailable for sale'], ['Low stock', lowStock, 'At or below reorder point'], ['Active locations', payload.locations.filter((location) => location.is_active).length, 'Stock holding locations']].map(([label, value, note]) => <Card key={String(label)} size="sm"><CardHeader className="!flex-row items-start justify-between"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-2xl tabular-nums">{loading ? '…' : value}</CardTitle></div><span className="rounded-xl bg-muted p-2.5 text-muted-foreground"><IconBox size={18} /></span></CardHeader><CardContent className="text-xs text-muted-foreground">{note}</CardContent></Card>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Stock levels</CardTitle><CardDescription className="mt-1">Every physical variant and its current location balance.</CardDescription></div><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, SKU, location" className="sm:w-64" /></div></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Product / variant</th><th className="px-5 py-3 font-medium">Location</th><th className="px-5 py-3 font-medium">On hand</th><th className="px-5 py-3 font-medium">Reserved</th><th className="px-5 py-3 font-medium">Reorder point</th><th className="px-5 py-3 font-medium">Status</th><th /></tr></thead><tbody>{filteredLevels.map((level) => { const key = `${level.location_id}:${level.variant_id}`; const draft = drafts[key] || { onHand: String(level.on_hand), reorderPoint: String(level.reorder_point) }; const available = Number(level.on_hand) - Number(level.reserved); const isLow = available <= Number(level.reorder_point); return <tr key={key} className="border-t transition-colors hover:bg-muted/40"><td className="px-5 py-4"><strong className="block">{level.variant?.product?.title || 'Unknown product'}</strong><span className="text-xs text-muted-foreground">{level.variant?.label || 'Default'} · {level.variant?.sku || 'No SKU'}</span></td><td className="px-5 py-4"><span className="block">{level.location?.name || 'Unknown location'}</span><span className="text-xs text-muted-foreground">{level.location?.code}</span></td><td className="px-5 py-4">{canManageInventory ? <Input type="number" min="0" value={draft.onHand} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, onHand: event.target.value } }))} className="w-24" /> : <span className="tabular-nums">{level.on_hand}</span>}</td><td className="px-5 py-4 tabular-nums text-muted-foreground">{level.reserved}</td><td className="px-5 py-4">{canManageInventory ? <Input type="number" min="0" value={draft.reorderPoint} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, reorderPoint: event.target.value } }))} className="w-24" /> : <span className="tabular-nums">{level.reorder_point}</span>}</td><td className="px-5 py-4"><Badge variant={isLow ? 'destructive' : 'default'}>{isLow ? <><IconAlertTriangle /> Low</> : <><IconCheck /> Healthy</>}</Badge></td><td className="px-5 py-4 text-right">{canManageInventory && <Button size="sm" variant="outline" onClick={() => void saveLevel(level)} disabled={busy}>Save</Button>}</td></tr>; })}</tbody></table>{loading ? <PageState kind="loading" title="Loading inventory" description="Fetching stock balances by location." /> : !filteredLevels.length ? <PageState kind="empty" title="No inventory levels" description="No stock levels match the current search." /> : null}</div></CardContent>
        </Card>

        <Card className="h-fit"><CardHeader><CardTitle>Locations</CardTitle><CardDescription>{canManageInventory ? "Create locations for stock tracking. Deactivate locations before removing them from operations." : "View stock locations and their current status."}</CardDescription></CardHeader><CardContent className="grid gap-4">{canManageInventory && <form onSubmit={addLocation} className="grid gap-2 rounded-xl border border-dashed p-3"><Input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="Location name" required maxLength={120} className={inputClass} /><Input value={locationCode} onChange={(event) => setLocationCode(event.target.value.toUpperCase())} placeholder="Code e.g. MAIN" required minLength={2} maxLength={32} className={inputClass} /><Button type="submit" disabled={busy} className="gap-2"><IconPlus /> Add location</Button></form>}<div className="grid gap-2">{payload.locations.map((location) => <div key={location.id} className="flex items-center gap-3 rounded-xl border px-3 py-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><IconBox size={16} /></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{location.name}</strong><span className="text-xs text-muted-foreground">{location.code}</span></div><Badge variant={location.is_active ? 'default' : 'secondary'}>{location.is_active ? 'Active' : 'Inactive'}</Badge>{canManageInventory && <><Button variant="ghost" size="icon-xs" aria-label={`${location.is_active ? 'Deactivate' : 'Activate'} ${location.name}`} onClick={() => void toggleLocation(location)} disabled={busy}><IconRefresh /></Button><Button variant="ghost" size="icon-xs" aria-label={`Delete ${location.name}`} onClick={() => void deleteLocation(location)} disabled={busy}><IconTrash /></Button></>}</div>)}{!loading && !payload.locations.length && <PageState kind="empty" title="No locations yet" description="Add your first stock location above." className="min-h-32 border-0 rounded-none py-5" />}</div></CardContent></Card>
      </section>
    </PageShell>
  );
}


