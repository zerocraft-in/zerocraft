"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconBell, IconCheck, IconDownload, IconFileTypePdf, IconRefresh } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { PageState } from "@/components/studio/page-state";

type Notice = { id: string; title: string; message: string; category: string; type: string; read: boolean; link: string | null; created_at: string };
type Analytics = { user_id: string; email: string; full_name: string | null; total_count: number; unread_count: number; read_count: number; last_notification_at: string | null };
type Filters = { search: string; category: string; type: string; read: string; from: string; to: string };
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notice[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [summary, setSummary] = useState<{ total: number; unread: number; read: number; categories?: Record<string, number> }>({ total: 0, unread: 0, read: 0 });
  const [filters, setFilters] = useState<Filters>({ search: "", category: "all", type: "all", read: "all", from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextFilters?: Filters) => {
    setLoading(true);
    try {
      const active = nextFilters || filters;
      const params = new URLSearchParams();
      if (active.search.trim()) params.set("search", active.search.trim());
      if (active.category !== "all") params.set("category", active.category);
      if (active.type !== "all") params.set("type", active.type);
      if (active.read !== "all") params.set("read", active.read);
      if (active.from) params.set("from", active.from);
      if (active.to) params.set("to", active.to);
      const response = await fetch(`/api/studio/notifications/history?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Notification history could not be loaded.");
      setNotifications(payload.notifications || []); setAnalytics(payload.analytics || []); setSummary(payload.summary || { total: 0, unread: 0, read: 0 }); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Notification history could not be loaded."); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id?: string) {
    await fetch("/api/studio/notifications/history", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : { all: true }) });
    await load();
  }

  function updateFilter(key: keyof Filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }

  function exportCsv() {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.type !== "all") params.set("type", filters.type);
    if (filters.read !== "all") params.set("read", filters.read);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("format", "csv");
    const link = document.createElement("a");
    link.href = `/api/studio/notifications/history?${params.toString()}`;
    link.download = "zerocraft-notifications.csv";
    document.body.appendChild(link); link.click(); link.remove();
  }

  function exportPdf() {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.type !== "all") params.set("type", filters.type);
    if (filters.read !== "all") params.set("read", filters.read);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("format", "pdf");
    const link = document.createElement("a"); link.href = `/api/studio/notifications/history?${params.toString()}`; link.download = "zerocraft-notifications.pdf"; document.body.appendChild(link); link.click(); link.remove();
  }

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><IconBell className="size-7" />Notification history</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review your operational alerts and see how the team is engaging with notifications.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={exportCsv} disabled={loading}><IconDownload />CSV</Button><Button variant="outline" onClick={exportPdf} disabled={loading}><IconFileTypePdf />PDF</Button><Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button></div></header>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    <Card><CardHeader><CardTitle>Filter notifications</CardTitle><CardDescription>Search by title or message, then narrow by category, type, read status, or date range.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-7" onSubmit={(event) => { event.preventDefault(); void load(); }}><input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search notifications" aria-label="Search notifications" className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm xl:col-span-2" /><SelectField value={filters.category} onValueChange={(value) => updateFilter("category", value)} aria-label="Notification category" options={[{ value: "all", label: "All categories" }, { value: "system", label: "System" }, { value: "inventory", label: "Inventory" }, { value: "automation", label: "Automation" }, { value: "reports", label: "Reports" }]} /><SelectField value={filters.type} onValueChange={(value) => updateFilter("type", value)} aria-label="Notification type" options={[{ value: "all", label: "All types" }, { value: "info", label: "Info" }, { value: "success", label: "Success" }, { value: "warning", label: "Warning" }, { value: "error", label: "Error" }]} /><SelectField value={filters.read} onValueChange={(value) => updateFilter("read", value)} aria-label="Read status" options={[{ value: "all", label: "All statuses" }, { value: "unread", label: "Unread" }, { value: "read", label: "Read" }]} /><input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} aria-label="From date" className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm" /><input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} aria-label="To date" className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm" /><div className="flex gap-2 xl:col-span-7"><Button type="submit">Apply filters</Button><Button type="button" variant="outline" onClick={() => { const reset = { search: "", category: "all", type: "all", read: "all", from: "", to: "" }; setFilters(reset); void load(reset); }}>Reset</Button></div></form></CardContent></Card>
    <section className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6"><Card><CardHeader><CardDescription>Filtered</CardDescription><CardTitle>{summary.total}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Unread</CardDescription><CardTitle className="text-amber-700">{summary.unread}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Read rate</CardDescription><CardTitle>{summary.total ? `${Math.round((summary.read / summary.total) * 100)}%` : "—"}</CardTitle></CardHeader></Card>{["system", "inventory", "automation"].map((category) => <Card key={category}><CardHeader><CardDescription className="capitalize">{category}</CardDescription><CardTitle>{summary.categories?.[category] || 0}</CardTitle></CardHeader></Card>)}</section>
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Your notification history</CardTitle><CardDescription>Showing up to 100 notifications matching the active filters.</CardDescription></div><Button variant="outline" size="sm" onClick={() => void markRead()} disabled={!summary.unread}><IconCheck />Mark all read</Button></div></CardHeader><CardContent className="space-y-2">{loading ? <PageState kind="loading" title="Loading notifications" description="Fetching notification history for the selected filters." /> : notifications.length ? notifications.map((item) => <div key={item.id} className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${item.read ? "bg-background" : "bg-primary/5"}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{item.title}</p><Badge variant="outline" className="capitalize">{item.category}</Badge>{!item.read && <Badge variant="secondary">Unread</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">{dateLabel(item.created_at)}</p></div><div className="flex shrink-0 gap-2">{!item.read && <Button size="sm" variant="outline" onClick={() => void markRead(item.id)}>Mark read</Button>}{item.link && <Button size="sm" variant="outline" render={<Link href={item.link} />}>Open</Button>}</div></div>) : <PageState kind="empty" title="No notifications" description="No notifications match the current filters." />}</CardContent></Card>
    {analytics.length > 0 && <Card><CardHeader><CardTitle>Team read/unread analytics</CardTitle><CardDescription>Admin-only view of recipient engagement for targeted notifications.</CardDescription></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[720px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Team member</th><th className="px-5 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Unread</th><th className="px-5 py-3 font-medium">Read</th><th className="px-5 py-3 font-medium">Read rate</th><th className="px-5 py-3 font-medium">Last alert</th></tr></thead><tbody>{analytics.map((row) => <tr key={row.user_id} className="border-b last:border-0"><td className="px-5 py-4"><p className="font-medium">{row.full_name || "Unnamed user"}</p><p className="text-xs text-muted-foreground">{row.email}</p></td><td className="px-5 py-4">{row.total_count}</td><td className="px-5 py-4 text-amber-700">{row.unread_count}</td><td className="px-5 py-4 text-emerald-700">{row.read_count}</td><td className="px-5 py-4">{row.total_count ? `${Math.round((row.read_count / row.total_count) * 100)}%` : "—"}</td><td className="px-5 py-4 text-xs text-muted-foreground">{dateLabel(row.last_notification_at)}</td></tr>)}</tbody></table></CardContent></Card>}
  </main>;
}
