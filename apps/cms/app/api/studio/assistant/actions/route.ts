import { requireStudioPermission } from "@/lib/studio-auth";
import { sendEmail } from "@/lib/email/smtp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionTypes = ["archive_product", "update_order_status", "send_invoice", "prepare_discount"] as const;
type ActionType = (typeof actionTypes)[number];
const orderStatuses = ["pending", "confirmed", "fulfilling", "shipped", "completed", "cancelled"] as const;

function response(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value).slice(0, 12_000)) as Record<string, unknown>;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

async function notify(access: { supabase: any }, input: { title: string; message: string; link: string; type?: string; eventKey?: string; read?: boolean }) {
  const recipientId = (access as { user?: { id?: string } }).user?.id;
  const eventKey = input.eventKey && recipientId ? `${input.eventKey}:${recipientId}` : input.eventKey || null;
  const payload = {
    title: input.title,
    message: input.message,
    category: "automation",
    type: input.type || "info",
    read: input.read ?? false,
    link: input.link,
    recipient_id: recipientId,
    event_key: eventKey,
    dedupe_key: eventKey,
    metadata: { source: "ai_action_queue" },
  };
  if (input.eventKey) {
    await access.supabase.from("notifications").upsert(payload, { onConflict: "event_key" });
  } else {
    await access.supabase.from("notifications").insert(payload);
  }
}

async function executeAction(access: { supabase: any; user: { id: string } }, action: { action_type: ActionType; payload: Record<string, unknown> }) {
  if (action.action_type === "prepare_discount") {
    return {
      kind: "discount_prepared",
      percent: action.payload.percent,
      productFilter: action.payload.productFilter,
      estimatedProductCount: action.payload.estimatedProductCount,
      note: "This approval records the prepared discount only. Applying it requires a dedicated discount publishing workflow.",
    };
  }
  if (action.action_type === "archive_product") {
    if (!isUuid(action.payload.productId)) throw new Error("A valid product id is required.");
    const { data, error } = await access.supabase.from("store_products").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", action.payload.productId).select("id,title,status").single();
    if (error || !data) throw new Error("The product could not be archived.");
    return { kind: "product_archived", product: data };
  }

  if (action.action_type === "update_order_status") {
    if (!isUuid(action.payload.orderId) || !orderStatuses.includes(action.payload.status as (typeof orderStatuses)[number])) throw new Error("A valid order id and status are required.");
    const { data, error } = await access.supabase.from("store_orders").update({ status: action.payload.status, updated_at: new Date().toISOString() }).eq("id", action.payload.orderId).select("id,order_number,status").single();
    if (error || !data) throw new Error("The order status could not be updated.");
    return { kind: "order_status_updated", order: data };
  }

  const recipient = typeof action.payload.recipient === "string" ? action.payload.recipient.trim() : "";
  const paymentLink = typeof action.payload.paymentLink === "string" ? action.payload.paymentLink.trim() : "";
  if (!recipient || !/^\S+@\S+\.\S+$/.test(recipient) || !paymentLink || !/^https?:\/\//i.test(paymentLink)) throw new Error("A valid recipient email and payment link are required.");
  const clientName = typeof action.payload.clientName === "string" ? action.payload.clientName : "there";
  const invoiceNumber = typeof action.payload.invoiceNumber === "string" ? action.payload.invoiceNumber : "ZeroCraft invoice";
  const amount = typeof action.payload.amount === "string" || typeof action.payload.amount === "number" ? String(action.payload.amount) : "";
  const subject = `Payment link: ${invoiceNumber}`;
  const result = await sendEmail({
    to: recipient,
    subject,
    text: `Hi ${clientName},\n\nYour ${invoiceNumber} is ready${amount ? ` for ${amount}` : ""}. Pay securely here: ${paymentLink}\n\nRegards,\nZeroCraft Studio`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b"><h2>ZeroCraft payment request</h2><p>Hi ${escapeHtml(clientName)},</p><p>Your <strong>${escapeHtml(invoiceNumber)}</strong> is ready${amount ? ` for <strong>${escapeHtml(amount)}</strong>` : ""}.</p><p><a href="${escapeHtml(paymentLink)}">Open secure payment link</a></p><p>Regards,<br/>ZeroCraft Studio</p></div>`,
  });
  return { kind: "invoice_sent", recipient, messageId: result.messageId };
}

export async function GET(request: Request) {
  const access = await requireStudioPermission("automations.read");
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  let query = access.supabase.from("studio_ai_action_requests").select("*").order("requested_at", { ascending: false }).limit(100);
  if (status && ["pending", "approved", "rejected", "executing", "executed", "failed", "cancelled"].includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return response({ error: "AI action queue is unavailable. Apply the approval migration first." }, 503);
  return response({ actions: data || [] });
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("automations.read");
  if (!access.ok) return access.response;
  let body: { actionType?: unknown; title?: unknown; description?: unknown; riskLevel?: unknown; payload?: unknown; idempotencyKey?: unknown };
  try { body = await request.json(); } catch { return response({ error: "Invalid JSON body." }, 400); }
  const actionType = body.actionType as ActionType;
  if (!actionTypes.includes(actionType)) return response({ error: "Unsupported AI action." }, 400);
  const idempotencyKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.length <= 160 ? body.idempotencyKey : crypto.randomUUID();
  const { data, error } = await access.supabase.from("studio_ai_action_requests").insert({
    action_type: actionType,
    title: typeof body.title === "string" ? body.title.slice(0, 180) : actionType,
    description: typeof body.description === "string" ? body.description.slice(0, 1000) : "",
    risk_level: body.riskLevel === "high" || body.riskLevel === "low" ? body.riskLevel : "medium",
    payload: cleanPayload(body.payload),
    requested_by: access.user.id,
    idempotency_key: idempotencyKey,
  }).select("*").single();
  if (error) return response({ error: error.code === "23505" ? "This action is already queued." : "Could not create the approval request." }, error.code === "23505" ? 409 : 500);
  return response({ action: data }, 201);
}

export async function PATCH(request: Request) {
  const access = await requireStudioPermission("automations.manage");
  if (!access.ok) return access.response;
  let body: { id?: unknown; decision?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return response({ error: "Invalid JSON body." }, 400); }
  if (!isUuid(body.id) || !["approve", "reject", "execute"].includes(String(body.decision))) return response({ error: "Provide a valid action id and decision." }, 400);
  const { data: action, error: readError } = await access.supabase.from("studio_ai_action_requests").select("*").eq("id", body.id).single();
  if (readError || !action) return response({ error: "Approval request not found." }, 404);
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
  if (body.decision === "approve" || body.decision === "reject") {
    if (action.status !== "pending") return response({ error: `This action is already ${action.status}.` }, 409);
    const nextStatus = body.decision === "approve" ? "approved" : "rejected";
    const { data, error } = await access.supabase.from("studio_ai_action_requests").update({ status: nextStatus, reviewed_by: access.user.id, reviewed_at: new Date().toISOString(), review_note: note, updated_at: new Date().toISOString() }).eq("id", action.id).eq("status", "pending").select("*").single();
    if (error || !data) return response({ error: "The approval state could not be updated." }, 409);
    await access.supabase.from("store_audit_logs").insert({ actor_id: access.user.id, action: `ai_action.${nextStatus}`, entity_type: "ai_action_request", entity_id: action.id, metadata: { actionType: action.action_type, note } });
    await notify(access, { title: nextStatus === "approved" ? "AI approval confirmed" : "AI action rejected", message: `${action.title} was ${nextStatus}.`, link: "/automations/approvals", type: nextStatus === "approved" ? "info" : "warning", eventKey: `ai-action:${action.id}`, read: false });
    return response({ action: data });
  }
  if (action.status !== "approved") return response({ error: "Only approved actions can execute." }, 409);
  const { data: claimed, error: claimError } = await access.supabase.from("studio_ai_action_requests").update({ status: "executing", updated_at: new Date().toISOString() }).eq("id", action.id).eq("status", "approved").select("*").single();
  if (claimError || !claimed) return response({ error: "This action is already being processed." }, 409);
  try {
    const result = await executeAction(access, { action_type: claimed.action_type as ActionType, payload: claimed.payload as Record<string, unknown> });
    const { data } = await access.supabase.from("studio_ai_action_requests").update({ status: "executed", result, executed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", action.id).select("*").single();
    await access.supabase.from("store_audit_logs").insert({ actor_id: access.user.id, action: "ai_action.executed", entity_type: "ai_action_request", entity_id: action.id, metadata: { actionType: action.action_type, result } });
    await notify(access, { title: "AI action completed", message: `${action.title} completed successfully.`, link: "/automations/approvals", type: "success", eventKey: `ai-action:${action.id}`, read: true });
    return response({ action: data, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The action failed.";
    const { data } = await access.supabase.from("studio_ai_action_requests").update({ status: "failed", result: { error: message }, executed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", action.id).select("*").single();
    await access.supabase.from("store_audit_logs").insert({ actor_id: access.user.id, action: "ai_action.failed", entity_type: "ai_action_request", entity_id: action.id, metadata: { actionType: action.action_type, error: message } });
    return response({ error: message, action: data }, 422);
  }
}
