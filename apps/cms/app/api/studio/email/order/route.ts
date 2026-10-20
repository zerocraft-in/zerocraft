import { requireStudioPermission } from "@/lib/studio-auth";
import { isSameOrigin } from "@/lib/request-origin";
import { sendTrackedEmail } from "@/lib/email/delivery";
import { orderEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const access = await requireStudioPermission("orders.manage");
  if (!access.ok) return access.response;
  let body: { orderId?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.orderId)) return Response.json({ error: "Invalid order ID." }, { status: 400 });
  const { data: order, error } = await access.supabase.from("store_orders").select("id,order_number,customer_name,customer_email,status,payment_status,total,currency").eq("id", body.orderId).single();
  if (error || !order) return Response.json({ error: "Order not found." }, { status: 404 });
  if (!order.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer_email)) return Response.json({ error: "This order does not have a valid customer email." }, { status: 422 });
  try {
    const result = await sendTrackedEmail({ supabase: access.supabase, actorId: access.user.id, kind: "order.status", message: orderEmail({ recipient: order.customer_email, customerName: order.customer_name, orderNumber: order.order_number, status: order.status, paymentStatus: order.payment_status, total: Number(order.total), currency: order.currency }), metadata: { orderId: order.id, orderNumber: order.order_number, status: order.status } });
    return Response.json({ ok: true, messageId: result.messageId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "Order email could not be sent. The failed attempt was recorded." }, { status: 502 }); }
}
