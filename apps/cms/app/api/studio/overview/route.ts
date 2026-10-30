import { requireStudioPermission } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sources = [
  { name: "store_orders", label: "Store orders", href: "/store/orders" },
  { name: "appointments", label: "Appointments", href: "/studio/appointments" },
  { name: "clients", label: "Clients", href: "/studio/clients" },
  { name: "works", label: "Works", href: "/works" },
  { name: "blogs", label: "Blogs", href: "/blogs" },
] as const;

export async function GET() {
  const access = await requireStudioPermission("dashboard.read");
  if (!access.ok) return access.response;
  const { supabase } = access;
  const profileResult = await supabase.from("profiles").select("id,email,full_name,avatar_url,role").eq("id", access.user.id).maybeSingle();

  const tables = await Promise.all(sources.map(async ({ name, label, href }) => {
    const [count, latest] = await Promise.all([
      supabase.from(name).select("id", { count: "exact", head: true }),
      supabase.from(name).select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);
    return { name, label, href, count: count.error ? null : count.count, lastActivity: latest.error ? null : (latest.data?.[0]?.created_at || null), available: !count.error && !latest.error, reason: count.error || latest.error ? ([count.error, latest.error].some((error) => error?.code === "42P01" || error?.code === "PGRST205") ? "Table not deployed" : "Unavailable or access denied") : null };
  }));

  const [featuredResult, featuredCountResult, publishedBlogsResult, totalBlogsResult] = await Promise.all([
    supabase.from("works").select("id,title,category,image_url,featured,created_at").eq("featured", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("works").select("id", { count: "exact", head: true }).eq("featured", true),
    supabase.from("blogs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("blogs").select("id", { count: "exact", head: true }),
  ]);

  const [pendingOrders, pendingAppointments, recentOrders, recentAppointments, orderSummary, completedOrders, lowStockResult, unreadNotifications, recentNotifications] = await Promise.all([
    supabase.from("store_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("store_orders").select("id,order_number,status,created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("appointments").select("id,client_name,status,created_at").order("created_at", { ascending: false }).limit(4),
    supabase.rpc("studio_store_order_summary"),
    supabase.from("store_orders").select("id", { count: "exact", head: true }).in("status", ["completed", "shipped"]),
    supabase.from("store_inventory_levels").select("location_id,on_hand,reserved,reorder_point"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
    supabase.from("notifications").select("id,title,message,type,category,read,link,created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const storeOrdersTable = tables.find((table) => table.name === "store_orders");
  if (pendingOrders.error || recentOrders.error) {
    Object.assign(storeOrdersTable!, { available: false, count: null, reason: "Order status schema unavailable" });
  }
  const orderSummaryData = orderSummary.error || !orderSummary.data || typeof orderSummary.data !== "object" ? null : orderSummary.data as { count?: number; pending?: number; paidByCurrency?: Record<string, number> };
  const recent = [
    ...(recentOrders.data || []).map((row) => ({ id: `order-${row.id}`, title: row.order_number, detail: `Order · ${row.status}`, href: "/store/orders", date: row.created_at })),
    ...(recentAppointments.data || []).map((row) => ({ id: `appointment-${row.id}`, title: row.client_name, detail: `Appointment · ${row.status}`, href: "/studio/appointments", date: row.created_at })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return Response.json({
    tables,
    pendingOrders: pendingOrders.error ? null : pendingOrders.count,
    pendingAppointments: pendingAppointments.error ? null : pendingAppointments.count,
    commerce: {
      available: Boolean(orderSummaryData) && !completedOrders.error,
      totalOrders: orderSummaryData?.count ?? null,
      pendingOrders: orderSummaryData?.pending ?? (pendingOrders.error ? null : pendingOrders.count),
      fulfilledOrders: completedOrders.error ? null : completedOrders.count,
      paidByCurrency: orderSummaryData?.paidByCurrency ?? {},
    },
    featuredWork: featuredResult.error ? null : featuredResult.data,
    featuredProjects: featuredCountResult.error ? null : featuredCountResult.count,
    publishedBlogs: publishedBlogsResult.error ? null : publishedBlogsResult.count,
    totalBlogs: totalBlogsResult.error ? null : totalBlogsResult.count,
    workspaceProfile: profileResult.error ? null : profileResult.data,
    lowStock: lowStockResult.error ? null : (lowStockResult.data || []).filter((row) => Number(row.on_hand) - Number(row.reserved) <= Number(row.reorder_point)).length,
    unreadNotifications: unreadNotifications.error ? null : unreadNotifications.count,
    notifications: recentNotifications.error ? [] : recentNotifications.data || [],
    recent,
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
