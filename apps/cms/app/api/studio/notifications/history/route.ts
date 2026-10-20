import { requireStudioAccess } from "@/lib/studio-auth";
import { renderNotificationReportPdf } from "@/lib/notifications/report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  const requestUrl = new URL(request.url);
  const type = requestUrl.searchParams.get("type") || "";
  const read = requestUrl.searchParams.get("read") || "";
  const from = requestUrl.searchParams.get("from") || "";
  const to = requestUrl.searchParams.get("to") || "";
  const search = (requestUrl.searchParams.get("search") || "").trim().replace(/[(),]/g, " ").slice(0, 80);
  let query = access.supabase.from("notifications").select("id,title,message,category,type,read,link,created_at").eq("recipient_id", access.user.id).order("created_at", { ascending: false }).limit(100);
  if (["info", "success", "warning", "error"].includes(type)) query = query.eq("type", type);
  if (read === "read") query = query.eq("read", true);
  if (read === "unread") query = query.eq("read", false);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  if (search) query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
  const { data: notifications, error } = await query;
  if (error) return Response.json({ error: "Notification history is unavailable." }, { status: 503 });
  const rows = notifications || [];
  if (requestUrl.searchParams.get("format") === "csv") {
    const csvEscape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      ["Created at", "Title", "Message", "Type", "Read", "Link"].map(csvEscape).join(","),
      ...rows.map((item) => [item.created_at, item.title, item.message, item.type, item.read ? "Yes" : "No", item.link || ""].map(csvEscape).join(",")),
    ].join("\r\n");
    return new Response(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="zerocraft-notifications-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
  }
  if (requestUrl.searchParams.get("format") === "pdf") {
    const pdf = await renderNotificationReportPdf(rows, search ? `Search: ${search}` : "Filtered notifications");
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="zerocraft-notifications-${new Date().toISOString().slice(0, 10)}.pdf"`, "Cache-Control": "private, no-store" } });
  }
  const analytics = access.role === "admin" ? await access.supabase.rpc("studio_get_notification_analytics") : { data: null };
  return Response.json({ notifications: rows, summary: { total: rows.length, unread: rows.filter((item) => !item.read).length, read: rows.filter((item) => item.read).length }, analytics: analytics.data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  let body: { id?: unknown; all?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid notification request." }, { status: 400 }); }
  const query = access.supabase.from("notifications").update({ read: true });
  const result = body.all === true ? await query.eq("recipient_id", access.user.id).eq("read", false) : typeof body.id === "string" ? await query.eq("id", body.id).eq("recipient_id", access.user.id) : null;
  if (!result) return Response.json({ error: "Provide a notification id or all=true." }, { status: 400 });
  if (result.error) return Response.json({ error: "Notification could not be marked as read." }, { status: 500 });
  return Response.json({ ok: true });
}
