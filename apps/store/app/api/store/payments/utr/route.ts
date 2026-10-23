import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/apps/studio/utils/supabase/server";
import { isSameOrigin } from "@/lib/request-origin";
import { isUuid } from "@/lib/commerce/cart";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ error: "Send JSON." }, { status: 415 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid payment proof." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return Response.json({ error: "Invalid payment proof." }, { status: 400 });
  const value = payload as Record<string, unknown>;
  const attemptId =
    typeof value.paymentAttemptId === "string" ? value.paymentAttemptId : "";
  const orderId = typeof value.orderId === "string" ? value.orderId : "";
  const utr =
    typeof value.utr === "string" ? value.utr.trim().toUpperCase() : "";
  const amount =
    typeof value.amount === "number" ? value.amount : Number(value.amount);
  const note =
    typeof value.note === "string" ? value.note.trim().slice(0, 500) : "";
  const paidAt =
    value.paidAt == null || value.paidAt === ""
      ? null
      : new Date(String(value.paidAt));
  if (
    !isUuid(attemptId) ||
    !isUuid(orderId) ||
    !/^[A-Z0-9][A-Z0-9._-]{5,63}$/.test(utr) ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    (paidAt && Number.isNaN(paidAt.getTime()))
  ) {
    return Response.json(
      { error: "Enter a valid order, amount, UTR and payment date." },
      { status: 400 },
    );
  }
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in before submitting payment proof." },
      { status: 401 },
    );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return Response.json(
      { error: "Payment proof is not configured." },
      { status: 503 },
    );
  const service = createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await service.rpc("submit_manual_payment_utr", {
    p_attempt_id: attemptId,
    p_order_id: orderId,
    p_customer_id: user.id,
    p_utr: utr,
    p_amount: Math.round(amount * 100) / 100,
    p_paid_at: paidAt?.toISOString() ?? null,
    p_note: note,
  });
  if (error || !data)
    return Response.json(
      { error: "Payment proof could not be submitted." },
      { status: error?.message.includes("PAYMENT_INVALID") ? 400 : 503 },
    );
  return Response.json(
    { submission: data },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
