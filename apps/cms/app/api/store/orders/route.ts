import { requireCommercePermission } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
const ORDER_STATUSES = ["pending", "confirmed", "fulfilling", "shipped", "completed", "cancelled"] as const;
const PAYMENT_STATUSES = ["pending", "unpaid", "paid", "refunded"] as const;
const UUID = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: PRIVATE_HEADERS });
}

export async function GET() {
  const access = await requireCommercePermission("orders.read");
  if (!access.ok) return access.response;

  const { data, error } = await access.supabase
    .from("orders")
    .select("id,order_number,customer_name,customer_email,customer_phone,items,status,payment_status,payment_method,total,currency,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);

  if (error) {
    return fail("Orders could not be loaded. Check the orders schema and store connection.", 503);
  }

  return Response.json({ orders: data || [], truncated: (data?.length || 0) === 1000 }, { headers: PRIVATE_HEADERS });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return fail("Invalid request origin.", 403);
  const access = await requireCommercePermission("orders.manage");
  if (!access.ok) return access.response;

  let body: { ids?: unknown; values?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid order update request.");
  }

  if (
    !Array.isArray(body.ids) ||
    body.ids.length < 1 ||
    body.ids.length > 100 ||
    new Set(body.ids).size !== body.ids.length ||
    body.ids.some((id) => typeof id !== "string" || !UUID.test(id)) ||
    !body.values || typeof body.values !== "object" || Array.isArray(body.values)
  ) {
    return fail("Choose 1–100 valid orders to update.");
  }

  const values = body.values as Record<string, unknown>;
  const keys = Object.keys(values);
  if (
    keys.length !== 1 ||
    (keys[0] === "status" && !ORDER_STATUSES.includes(values.status as typeof ORDER_STATUSES[number])) ||
    (keys[0] === "payment_status" && !PAYMENT_STATUSES.includes(values.payment_status as typeof PAYMENT_STATUSES[number])) ||
    !["status", "payment_status"].includes(keys[0])
  ) {
    return fail("Choose a valid order status update.");
  }

  const update = keys[0] === "status"
    ? { status: values.status as typeof ORDER_STATUSES[number] }
    : { payment_status: values.payment_status as typeof PAYMENT_STATUSES[number] };
  const { data, error } = await access.supabase
    .from("orders")
    .update({ ...update, updated_at: new Date().toISOString() })
    .in("id", body.ids as string[])
    .select("id,order_number,status,payment_status");

  if (error) return fail("The selected orders could not be updated. Reload and retry.", 400);

  const audit = await access.supabase.from("audit_logs").insert(
    (data || []).map((order) => ({
      actor_id: access.user.id,
      action: keys[0] === "status" ? "order.status_changed" : "order.payment_status_changed",
      entity_type: "order",
      entity_id: order.id,
      metadata: { orderNumber: order.order_number, ...values },
    })),
  );
  if (audit.error) console.error("Order status audit log write failed", { error: audit.error });

  return Response.json({ orders: data || [] }, { headers: PRIVATE_HEADERS });
}
