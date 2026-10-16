import { isSameOrigin } from "@/lib/request-origin";
import { parseCheckoutRequest, CHECKOUT_BODY_MAX_BYTES } from "@/lib/commerce/checkout";
import { CheckoutError, executeTransactionalCheckout } from "@/lib/commerce/checkout-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Send JSON." }, { status: 415 });
  if (Number(request.headers.get("content-length") || 0) > CHECKOUT_BODY_MAX_BYTES) return Response.json({ error: "Checkout is too large." }, { status: 413 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: "Invalid checkout data." }, { status: 400 }); }
  const parsed = parseCheckoutRequest(payload);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const result = await executeTransactionalCheckout(parsed.data);
    return Response.json({ order: {
      id: result.orderId,
      order_number: result.orderNumber,
      status: result.status,
      currency: result.currency,
      total: result.total,
      subtotal: result.subtotal,
      discount: result.discount,
      shipping_fee: result.shippingFee,
      tax: result.tax,
      items: result.items,
      created_at: result.createdAt,
    } }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof CheckoutError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
    return Response.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
  }
}
