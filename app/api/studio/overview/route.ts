import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sources = [
  { name: "store_orders", label: "Store orders", href: "/studio/orders" },
  { name: "appointments", label: "Appointments", href: "/studio/appointments" },
  { name: "clients", label: "Clients", href: "/studio/clients" },
  { name: "works", label: "Works", href: "/studio/works" },
  { name: "blogs", label: "Blogs", href: "/studio/blogs" },
  { name: "reviews", label: "Reviews", href: "/studio/reviews" },
  { name: "profiles", label: "Team profiles", href: "/studio/staff" },
  { name: "notifications", label: "Notifications", href: "/studio" },
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to view studio data." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "manager", "staff"].includes(profile?.role || "")) return Response.json({ error: "Studio access required." }, { status: 403 });

  const tables = await Promise.all(sources.map(async ({ name, label, href }) => {
    const [count, latest] = await Promise.all([
      supabase.from(name).select("id", { count: "exact", head: true }),
      supabase.from(name).select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);
    return { name, label, href, count: count.error ? null : count.count, lastActivity: latest.error ? null : (latest.data?.[0]?.created_at || null), available: !count.error, reason: count.error ? (count.error.code === "42P01" || count.error.code === "PGRST205" ? "Table not deployed" : "Unavailable or access denied") : null };
  }));

  const [pendingOrders, pendingAppointments, recentOrders, recentAppointments] = await Promise.all([
    supabase.from("store_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("store_orders").select("id,order_number,status,created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("appointments").select("id,client_name,status,created_at").order("created_at", { ascending: false }).limit(4),
  ]);
  const recent = [
    ...(recentOrders.data || []).map((row) => ({ id: `order-${row.id}`, title: row.order_number, detail: `Order · ${row.status}`, href: "/studio/orders", date: row.created_at })),
    ...(recentAppointments.data || []).map((row) => ({ id: `appointment-${row.id}`, title: row.client_name, detail: `Appointment · ${row.status}`, href: "/studio/appointments", date: row.created_at })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return Response.json({ tables, pendingOrders: pendingOrders.error ? null : pendingOrders.count, pendingAppointments: pendingAppointments.error ? null : pendingAppointments.count, recent, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
}
