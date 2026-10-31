"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconArrowLeft, IconCalendarEvent, IconClock } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAppointmentsFromSupabase } from "@/lib/supabase-client";

type Appointment = { id: string; client_name: string; service: string; scheduled_at: string; status: string; notes?: string };

export function AppointmentsCalendarView() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchAppointmentsFromSupabase(true).then((data) => setItems((data || []) as Appointment[])).finally(() => setLoading(false)); }, []);
  const grouped = useMemo(() => items.reduce<Record<string, Appointment[]>>((groups, item) => { const key = new Date(item.scheduled_at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); (groups[key] ||= []).push(item); return groups; }, {}), [items]);
  return <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 pb-12"><header className="flex flex-wrap items-end justify-between gap-4"><div><Button variant="ghost" size="sm" render={<Link href="/appointments" />}><IconArrowLeft /> Appointments</Button><p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Studio scheduling</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold"><IconCalendarEvent />Calendar</h1><p className="mt-2 text-sm text-muted-foreground">Review confirmed, pending, and completed sessions in date order.</p></div><Button render={<Link href="/appointments" />}>Manage appointments</Button></header>{loading ? <Card><CardContent className="p-8 text-sm text-muted-foreground">Loading appointments…</CardContent></Card> : <div className="space-y-4">{Object.entries(grouped).map(([date, appointments]) => <Card key={date}><CardHeader className="border-b"><CardTitle className="text-base">{date}</CardTitle></CardHeader><CardContent className="divide-y p-0">{appointments.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)).map((appointment) => <div key={appointment.id} className="flex flex-wrap items-center gap-4 p-4"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><IconClock className="size-5" /></div><div className="min-w-0 flex-1"><p className="font-medium">{appointment.client_name}</p><p className="text-xs text-muted-foreground">{appointment.service}{appointment.notes ? ` · ${appointment.notes}` : ""}</p></div><span className="text-sm tabular-nums text-muted-foreground">{new Date(appointment.scheduled_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span><Badge variant={appointment.status === "confirmed" ? "default" : "outline"} className="capitalize">{appointment.status}</Badge></div>)}</CardContent></Card>)}{!Object.keys(grouped).length && <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No appointments scheduled yet.</CardContent></Card>}</div>}</main>;
}
