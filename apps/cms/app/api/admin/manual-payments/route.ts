import { isSameOrigin } from "@/lib/request-origin";
import { requireCommercePermission } from "@/lib/commerce-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function authorized() {
  const access = await requireCommercePermission("orders.manage");
  if (!access.ok) return access;
  if (access.role !== "admin") return { ok: false as const, response: error("Only administrators can review manual payments.", 403) };
  return access;
}

export async function GET() {
  const access = await authorized();
  if (!access.ok) return access.response;
  const { data, error: queryError } = await access.supabase
    .from("payment_submissions")
    .select("id,order_id,payment_attempt_id,utr,amount,status,created_at,note,review_note")
    .order("created_at", { ascending: false })
    .limit(200);
  if (queryError) return error("Payment submissions could not be loaded.", 503);
  return Response.json({ submissions: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return error("Invalid request origin.", 403);
  const access = await authorized();
  if (!access.ok) return access.response;
  let body: { id?: unknown; decision?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return error("Invalid payment review request."); }
  const id = typeof body.id === "string" ? body.id : "";
  const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !decision || note.length > 500) {
    return error("Provide a valid payment submission, decision, and review note.");
  }

  const result = access.platformBridge
    ? await access.supabase.rpc("verify_manual_payment_server", {
        p_submission_id: id,
        p_decision: decision,
        p_note: note,
        p_actor_id: access.user.id,
      })
    : await access.supabase.rpc("verify_manual_payment", {
        p_submission_id: id,
        p_decision: decision,
        p_note: note,
      });
  if (result.error) {
    const code = result.error.code;
    if (code === "P0001" || code === "P0002") return error("This payment submission is no longer pending or was not found.", 409);
    if (code === "42501") return error("Only administrators can review manual payments.", 403);
    return error("The payment review could not be saved.", 503);
  }
  return Response.json({ result: result.data }, { headers: { "Cache-Control": "private, no-store" } });
}
