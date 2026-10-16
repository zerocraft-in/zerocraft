"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { IconArrowLeft, IconFileInvoice, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Supplier = { id: string; name: string; email: string; phone: string; is_active: boolean };
type Location = { id: string; name: string; code: string; is_active: boolean };
type Variant = { id: string; label: string; sku: string; product: { id: string; title: string; product_type: string } | null };
type Item = { id: string; variant_id: string; quantity_ordered: number; quantity_received: number; unit_cost_paise: number; variant: Variant | null };
type Order = { id: string; order_number: string; supplier_id: string; location_id: string; status: string; expected_at: string | null; notes: string; supplier: { id: string; name: string } | null; location: { id: string; name: string; code: string } | null; items: Item[] };
type Payload = { suppliers: Supplier[]; locations: Location[]; variants: Variant[]; orders: Order[] };
type DraftLine = { variantId: string; quantity: string; unitCost: string };

const statusOptions = ["draft", "ordered", "partial", "received", "cancelled"];
const statusVariant = (status: string) => status === "received" ? "default" : status === "cancelled" ? "destructive" : "secondary";

export default function PurchaseOrdersWorkspace() {
  const [data, setData] = useState<Payload>({ suppliers: [], locations: [], variants: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [line, setLine] = useState<DraftLine>({ variantId: "", quantity: "1", unitCost: "0" });

  const requestData = useCallback(async () => {
    const response = await fetch("/api/studio/store/purchase-orders", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Purchase orders could not be loaded.");
    return result as Payload;
  }, []);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const next = await requestData();
      setData(next);
      setSupplierId((current) => current || next.suppliers.find((supplier) => supplier.is_active)?.id || "");
      setLocationId((current) => current || next.locations.find((location) => location.is_active)?.id || "");
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Purchase orders could not be loaded."); }
    finally { setLoading(false); }
  }, [requestData]);

  useEffect(() => {
    let current = true;
    requestData().then((next) => {
      if (!current) return;
      setData(next);
      setSupplierId((value) => value || next.suppliers.find((supplier) => supplier.is_active)?.id || "");
      setLocationId((value) => value || next.locations.find((location) => location.is_active)?.id || "");
      setError("");
    }).catch((cause: unknown) => {
      if (current) setError(cause instanceof Error ? cause.message : "Purchase orders could not be loaded.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [requestData]);

  async function request(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    const response = await fetch("/api/studio/store/purchase-orders", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Purchase order action failed.");
    return result;
  }

  async function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await request("POST", { entity: "supplier", name: supplierName, email: supplierEmail, phone: supplierPhone }); setSupplierId(result.supplier.id); setSupplierName(""); setSupplierEmail(""); setSupplierPhone(""); await load(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Supplier could not be created."); }
    finally { setBusy(false); }
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await request("POST", { supplierId, locationId, expectedAt, notes, items: [{ variantId: line.variantId, quantity: Number(line.quantity), unitCostPaise: Math.round(Number(line.unitCost || 0) * 100) }] }); setNotes(""); setExpectedAt(""); setLine({ variantId: "", quantity: "1", unitCost: "0" }); await load(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Purchase order could not be created."); }
    finally { setBusy(false); }
  }

  async function updateOrder(order: Order, status: string) {
    setBusy(true); setError("");
    try { await request("PATCH", { id: order.id, status, expectedAt: order.expected_at || "", notes: order.notes }); await load(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Purchase order could not be updated."); }
    finally { setBusy(false); }
  }

  async function receiveOrder(order: Order) {
    const receipts = order.items.filter((item) => item.quantity_ordered > item.quantity_received).map((item) => ({ item_id: item.id, quantity: item.quantity_ordered - item.quantity_received }));
    if (!receipts.length || !window.confirm(`Receive all remaining stock for ${order.order_number}?`)) return;
    setBusy(true); setError("");
    try { await request("PATCH", { id: order.id, action: "receive", receipts }); await load(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The stock receipt could not be recorded."); }
    finally { setBusy(false); }
  }

  async function deleteOrder(order: Order) {
    if (!window.confirm(`Delete ${order.order_number}? Only draft orders can be deleted.`)) return;
    setBusy(true); setError("");
    try { await request("DELETE", { id: order.id }); await load(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Purchase order could not be deleted."); }
    finally { setBusy(false); }
  }

  const openCount = data.orders.filter((order) => ["draft", "ordered", "partial"].includes(order.status)).length;
  const incomingUnits = data.orders.filter((order) => ["ordered", "partial"].includes(order.status)).reduce((sum, order) => sum + order.items.reduce((inner, item) => inner + item.quantity_ordered - item.quantity_received, 0), 0);

  return <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-screen-xl flex-col gap-6 pb-14">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><Button variant="ghost" size="sm" className="mb-3 -ml-2 gap-2" render={<Link href="/studio/store" />} nativeButton={false}><IconArrowLeft /> Store overview</Button><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operations / Suppliers</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em]">Purchase orders</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Create supplier orders and track what is expected into each inventory location.</p></div><Button variant="outline" size="icon" aria-label="Refresh purchase orders" onClick={() => void load()} disabled={loading}><IconRefresh /></Button></header>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-3">{[["Open orders", openCount, "Draft, ordered, or partial"], ["Units incoming", incomingUnits, "Not yet received"], ["Suppliers", data.suppliers.filter((supplier) => supplier.is_active).length, "Active suppliers"]].map(([label, value, note]) => <Card key={String(label)} size="sm"><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-2xl tabular-nums">{loading ? "…" : value}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{note}</CardContent></Card>)}</section>
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <Card className="overflow-hidden"><CardHeader className="border-b"><CardTitle>Purchase orders</CardTitle><CardDescription className="mt-1">Move each order from draft to received as stock arrives.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Order</th><th className="px-5 py-3 font-medium">Supplier</th><th className="px-5 py-3 font-medium">Destination</th><th className="px-5 py-3 font-medium">Units</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Actions</th></tr></thead><tbody>{data.orders.map((order) => <tr key={order.id} className="border-t transition-colors hover:bg-muted/40"><td className="px-5 py-4"><strong className="block">{order.order_number}</strong><span className="text-xs text-muted-foreground">{order.expected_at ? `Due ${order.expected_at}` : "No due date"}</span></td><td className="px-5 py-4">{order.supplier?.name || "Unknown supplier"}</td><td className="px-5 py-4">{order.location?.name || "Unknown location"}</td><td className="px-5 py-4 tabular-nums">{order.items.reduce((sum, item) => sum + item.quantity_ordered, 0)} <span className="text-xs text-muted-foreground">({order.items.reduce((sum, item) => sum + item.quantity_received, 0)} received)</span></td><td className="px-5 py-4"><select value={order.status} onChange={(event) => void updateOrder(order, event.target.value)} disabled={busy} className="h-7 rounded-lg border border-input bg-background px-2 text-xs capitalize"><option value="draft">Draft</option><option value="ordered">Ordered</option><option value="partial">Partial</option><option value="received">Received</option><option value="cancelled">Cancelled</option></select><Badge variant={statusVariant(order.status)} className="ml-2 capitalize">{order.status}</Badge></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => void receiveOrder(order)} disabled={busy || order.status === "cancelled" || order.status === "received"}>Receive</Button><Button variant="ghost" size="icon-xs" aria-label={`Delete ${order.order_number}`} onClick={() => void deleteOrder(order)} disabled={busy || order.status !== "draft"}><IconTrash /></Button></div></td></tr>)}</tbody></table>{!loading && !data.orders.length && <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">No purchase orders yet.</div>}</div></CardContent></Card>
      <div className="grid content-start gap-4"><Card><CardHeader><CardTitle>Create purchase order</CardTitle><CardDescription>Add an incoming stock commitment for one variant.</CardDescription></CardHeader><CardContent><form onSubmit={createOrder} className="grid gap-3"><select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="">Select supplier</option>{data.suppliers.filter((supplier) => supplier.is_active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><select value={locationId} onChange={(event) => setLocationId(event.target.value)} required className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="">Receiving location</option>{data.locations.filter((location) => location.is_active).map((location) => <option key={location.id} value={location.id}>{location.name} ({location.code})</option>)}</select><select value={line.variantId} onChange={(event) => setLine({ ...line, variantId: event.target.value })} required className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="">Select product variant</option>{data.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.product?.title} · {variant.label} · {variant.sku}</option>)}</select><div className="grid grid-cols-2 gap-2"><Input type="number" min="1" value={line.quantity} onChange={(event) => setLine({ ...line, quantity: event.target.value })} placeholder="Quantity" required /><Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => setLine({ ...line, unitCost: event.target.value })} placeholder="Unit cost" required /></div><Input type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} /><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes (optional)" maxLength={500} /><Button type="submit" disabled={busy} className="gap-2"><IconPlus /> Create draft</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Add supplier</CardTitle><CardDescription>Keep supplier details available for future orders.</CardDescription></CardHeader><CardContent><form onSubmit={addSupplier} className="grid gap-2"><Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Supplier name" required maxLength={160} /><Input type="email" value={supplierEmail} onChange={(event) => setSupplierEmail(event.target.value)} placeholder="Email (optional)" /><Input value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} placeholder="Phone (optional)" /><Button type="submit" variant="outline" disabled={busy} className="gap-2"><IconFileInvoice /> Add supplier</Button></form></CardContent></Card></div>
    </section>
  </main>;
}
