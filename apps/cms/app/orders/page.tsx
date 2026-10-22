"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconRefresh, IconShoppingBag, IconClock, IconTruckDelivery, IconCircleCheck } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase-client";
import { OrdersDataTable, type OrderStatus, type StoreOrder } from "@/components/studio/orders-data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OrdersView = "all" | "pending" | "fulfillment" | "completed";
export default function OrdersPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [activeTab, setActiveTab] = useState<OrdersView>("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: readError } = await supabase.from("store_orders").select("id,order_number,customer_name,customer_email,customer_phone,items,status,payment_status,payment_method,total,currency,created_at").order("created_at", { ascending: false });
    setError(readError ? "Orders could not be loaded. Check the Supabase connection and apply the admin MVP migration." : null);
    setOrders((data || []) as StoreOrder[]);
    setLoading(false);
  }, []);
  useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);

  async function updateOrders(ids: string[], values: Partial<Pick<StoreOrder, "status" | "payment_status">>) {
    if (!ids.length) return;
    setBusy(true);
    const { error: updateError } = await supabase.from("store_orders").update(values).in("id", ids);
    if (updateError) setError("The selected orders could not be updated. Please try again.");
    else {
      setError(null);
      setOrders((current) => current.map((order) => ids.includes(order.id) ? { ...order, ...values } : order));
    }
    setBusy(false);
  }

  const filtered = useMemo(() => orders.filter((order) => {
    if (activeTab === "pending") return order.status === "pending";
    if (activeTab === "fulfillment") return ["confirmed", "fulfilling", "shipped"].includes(order.status);
    if (activeTab === "completed") return order.status === "completed";
    return true;
  }), [orders, activeTab]);
  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((order) => order.status === "pending").length,
    fulfillment: orders.filter((order) => ["confirmed", "fulfilling", "shipped"].includes(order.status)).length,
    completed: orders.filter((order) => order.status === "completed").length,
  }), [orders]);
  const metrics = [
    { label: "All orders", value: counts.all, icon: IconShoppingBag, note: "Across every status" },
    { label: "Awaiting action", value: counts.pending, icon: IconClock, note: "Need a first review" },
    { label: "In fulfillment", value: counts.fulfillment, icon: IconTruckDelivery, note: "Confirmed through shipping" },
    { label: "Completed", value: counts.completed, icon: IconCircleCheck, note: "Successfully fulfilled" },
  ];
  return <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight">Orders</h1><p className="mt-2 text-sm text-muted-foreground">Review customer requests and manage fulfillment. Payments are not collected by this site.</p></div>
        <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Refresh orders" title="Refresh orders"><IconRefresh className={loading ? "animate-spin" : ""} /></Button>
    </header>
    {error && <Alert variant="destructive"><AlertTitle>Order update needs attention</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Order summary">
      {metrics.map(({ label, value, icon: Icon, note }) => <Card key={label} size="sm"><CardHeader className="!flex items-start justify-between"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 text-3xl tabular-nums">{loading ? "—" : value}</CardTitle></div><span className="rounded-lg bg-muted p-2 text-muted-foreground"><Icon size={18} /></span></CardHeader><CardContent className="text-xs text-muted-foreground">{note}</CardContent></Card>)}
    </section>
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Orders</CardTitle><CardDescription className="mt-1">Search, sort, filter, and manage customer orders.</CardDescription></div><Badge variant="secondary">{filtered.length} {filtered.length === 1 ? "order" : "orders"}</Badge></div></CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrdersView)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b bg-transparent p-0 pb-2 xl:w-fit">
            <TabsTrigger value="all" className="flex-none rounded-md px-3">All orders <span className="ml-1 text-xs text-muted-foreground">{counts.all}</span></TabsTrigger>
            <TabsTrigger value="pending" className="flex-none rounded-md px-3">Awaiting action <span className="ml-1 text-xs text-muted-foreground">{counts.pending}</span></TabsTrigger>
            <TabsTrigger value="fulfillment" className="flex-none rounded-md px-3">In fulfillment <span className="ml-1 text-xs text-muted-foreground">{counts.fulfillment}</span></TabsTrigger>
            <TabsTrigger value="completed" className="flex-none rounded-md px-3">Completed <span className="ml-1 text-xs text-muted-foreground">{counts.completed}</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex min-h-0 flex-1 flex-col"><OrdersDataTable data={filtered} loading={loading} onStatusChange={(order, status) => void updateOrders([order.id], { status })} onBulkStatusChange={(ids, status: OrderStatus) => void updateOrders(ids, { status })} /></div>
        {busy && <p className="sr-only" role="status">Saving order changes…</p>}
      </CardContent>
    </Card>
  </main>;
}
