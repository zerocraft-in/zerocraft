"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type Order = { id: string; order_number: string; status: string; payment_status: string; total: number; currency: string; created_at: string };
type Summary = { orders: Order[]; clients: number; appointments: number; works: number; blogs: number; truncated: boolean };

const empty: Summary = { orders: [], clients: 0, appointments: 0, works: 0, blogs: 0, truncated: false };

export default function StudioReportsPage() {
  const [summary, setSummary] = useState<Summary>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [orders, clients, appointments, works, blogs] = await Promise.all([
      supabase.from("store_orders").select("id,order_number,status,payment_status,total,currency,created_at").order("created_at", { ascending: false }).limit(501),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("appointments").select("id", { count: "exact", head: true }),
      supabase.from("works").select("id", { count: "exact", head: true }),
      supabase.from("blogs").select("id", { count: "exact", head: true }),
    ]);
    const failure = [orders, clients, appointments, works, blogs].find((result) => result.error);
    if (failure?.error) {
      setError("Studio data could not be loaded. Check the Supabase connection and apply the admin MVP migration.");
    } else {
      setError(null);
      setSummary({ orders: ((orders.data || []).slice(0, 500)) as Order[], clients: clients.count || 0, appointments: appointments.count || 0, works: works.count || 0, blogs: blogs.count || 0, truncated: (orders.data?.length || 0) > 500 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);

  const byStatus = summary.orders.reduce<Record<string, number>>((totals, order) => {
    totals[order.status] = (totals[order.status] || 0) + 1;
    return totals;
  }, {});
  const paidByCurrency = summary.orders.filter((order) => order.payment_status === "paid" && order.status !== "cancelled").reduce<Record<string, number>>((totals, order) => { totals[order.currency] = (totals[order.currency] || 0) + Number(order.total || 0); return totals; }, {});

  function exportCsv() {
    const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [["Order", "Status", "Total", "Currency", "Created"], ...summary.orders.map((order) => [order.order_number, order.status, order.total, order.currency, order.created_at])];
    const csv = "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "zerocraft-store-orders.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Studio / Analytics</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.06em]">Reports<span className="text-[#a5ce00]">.</span></h1><p className="mt-2 text-sm text-muted-foreground">Live record counts and order activity. Monetary totals include only orders marked paid.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => { setLoading(true); void load(); }} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Refresh</button><button type="button" disabled={!summary.orders.length} onClick={exportCsv} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Export orders CSV</button></div>
      </div>
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading studio records…</p>}
      {error && <p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error}</p>}
      {!loading && !error && <>
        {summary.truncated && <p role="status" className="rounded-lg border border-amber-500/30 p-3 text-sm">Order status, value, and CSV below cover only the latest 500 records. Use a paginated export for complete history.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[["Store orders", summary.orders.length], ["Clients", summary.clients], ["Appointments", summary.appointments], ["Works", summary.works], ["Blogs", summary.blogs]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><strong className="mt-3 block text-3xl font-semibold">{value}</strong></div>)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">Order status</h2><p className="mt-1 text-sm text-muted-foreground">Current state of persisted store orders.</p>{summary.orders.length ? <dl className="mt-5 space-y-3">{Object.entries(byStatus).map(([status, count]) => <div key={status} className="flex justify-between border-b border-border pb-2 text-sm"><dt className="capitalize">{status}</dt><dd>{count}</dd></div>)}</dl> : <p className="mt-5 text-sm text-muted-foreground">No store orders yet.</p>}</section>
          <section className="rounded-xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">Paid order value</h2><p className="mt-1 text-sm text-muted-foreground">Orders explicitly marked paid, excluding cancelled. This is not a processor settlement report.</p>{Object.entries(paidByCurrency).length ? Object.entries(paidByCurrency).map(([currency, amount]) => <strong key={currency} className="mt-5 block text-3xl font-semibold">{new Intl.NumberFormat("en", { style: "currency", currency }).format(amount)}</strong>) : <p className="mt-8 text-sm text-muted-foreground">No paid orders recorded.</p>}</section>
        </div>
      </>}
    </main>
  );
}
