"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type OrderStatus = "pending" | "confirmed" | "fulfilling" | "shipped" | "completed" | "cancelled";
type PaymentStatus = "unpaid" | "paid" | "refunded";
type StoreOrder = {
  id: string; order_number: string; customer_name: string; customer_email: string; customer_phone: string;
  shipping_address: { street?: string; city?: string; state?: string; postalCode?: string; country?: string };
  items: { productId: string; title: string; quantity: number; price: number; color?: string; size?: string }[];
  status: OrderStatus; payment_status: string; payment_method: string; total: number; currency: string; created_at: string;
};
const statuses: OrderStatus[] = ["pending", "confirmed", "fulfilling", "shipped", "completed", "cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: readError } = await supabase.from("store_orders").select("id,order_number,customer_name,customer_email,customer_phone,shipping_address,items,status,payment_status,payment_method,total,currency,created_at").order("created_at", { ascending: false });
    setError(readError ? "Orders could not be loaded. Check the Supabase connection and apply the admin MVP migration." : null);
    setOrders((data || []) as StoreOrder[]);
    setLoading(false);
  }, []);
  useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);

  const filtered = useMemo(() => orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const text = `${order.order_number} ${order.customer_name} ${order.customer_email}`.toLowerCase();
    return matchesStatus && text.includes(query.trim().toLowerCase());
  }), [orders, query, statusFilter]);

  async function updateStatus(order: StoreOrder, status: OrderStatus) {
    if (order.status === status) return;
    setBusy(order.id);
    const { error: updateError } = await supabase.from("store_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (updateError) setError("Status could not be saved. Please refresh and try again.");
    else { setError(null); setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item)); }
    setBusy(null);
  }
  async function updatePayment(order: StoreOrder, payment_status: PaymentStatus) {
    if (order.payment_status === payment_status) return;
    setBusy(order.id);
    const { error: updateError } = await supabase.from("store_orders").update({ payment_status, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (updateError) setError("Payment status could not be saved. Check your permissions and try again.");
    else { setError(null); setOrders((current) => current.map((item) => item.id === order.id ? { ...item, payment_status } : item)); }
    setBusy(null);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Store / Fulfillment</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Orders</h1><p className="mt-2 text-sm text-muted-foreground">Review persisted requests and manage fulfillment. Payments are not collected by this site.</p></div><button type="button" onClick={() => { setLoading(true); void load(); }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Refresh</button></div>
      <div className="flex flex-wrap gap-3"><label className="sr-only" htmlFor="order-search">Search orders</label><input id="order-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search number, name, or email" className="min-w-64 flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm" /><label className="sr-only" htmlFor="order-status">Filter status</label><select id="order-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-border bg-background px-4 py-2 text-sm"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
      {error && <p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error}</p>}
      {loading ? <p role="status" className="text-sm text-muted-foreground">Loading orders…</p> : filtered.length ? <div className="space-y-3">{filtered.map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-muted-foreground">{order.order_number} · {new Date(order.created_at).toLocaleDateString()}</p><h2 className="mt-2 text-lg font-semibold">{order.customer_name}</h2><p className="text-sm text-muted-foreground">{order.customer_email}</p></div><div className="text-right"><strong className="text-lg">{new Intl.NumberFormat("en", { style: "currency", currency: order.currency }).format(Number(order.total))}</strong><p className="text-xs text-muted-foreground">{order.payment_method.toUpperCase()} · {order.payment_status}</p></div></div><div className="mt-5 flex flex-wrap items-center gap-3"><label className="text-xs font-mono uppercase tracking-wide text-muted-foreground" htmlFor={`status-${order.id}`}>Fulfillment</label><select id={`status-${order.id}`} disabled={busy === order.id} value={order.status} onChange={(event) => void updateStatus(order, event.target.value as OrderStatus)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><label className="text-xs font-mono uppercase tracking-wide text-muted-foreground" htmlFor={`payment-${order.id}`}>Payment</label><select id={`payment-${order.id}`} disabled={busy === order.id} value={order.payment_status} onChange={(event) => void updatePayment(order, event.target.value as PaymentStatus)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize">{(["unpaid", "paid", "refunded"] as const).map((status) => <option key={status} value={status}>{status}</option>)}</select><span role="status" className="text-xs text-muted-foreground">{busy === order.id ? "Saving…" : ""}</span></div><details className="mt-4 border-t border-border pt-4 text-sm"><summary className="cursor-pointer font-medium">Order details</summary><div className="mt-3 grid gap-4 md:grid-cols-2"><div><h3 className="font-semibold">Items</h3><ul className="mt-2 space-y-1 text-muted-foreground">{order.items.map((item, index) => <li key={`${item.productId}-${index}`}>{item.quantity} × {item.title}{item.size ? ` · ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""}</li>)}</ul></div><div><h3 className="font-semibold">Shipping</h3><p className="mt-2 text-muted-foreground">{order.shipping_address.street}, {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postalCode}, {order.shipping_address.country}<br />{order.customer_phone}</p></div></div></details></article>)}</div> : <p className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">No orders match this view.</p>}
    </main>
  );
}
