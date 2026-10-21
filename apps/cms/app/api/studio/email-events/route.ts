import { requireStudioPermission } from "@/lib/studio-auth";
import { isSameOrigin } from "@/lib/request-origin";
import { sendTrackedEmail } from "@/lib/email/delivery";
import { appointmentEmail, automationFailureEmail, orderEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const access = await requireStudioPermission("notifications.read");
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() || "";
  let query = access.supabase.from("studio_email_events").select("id,provider,kind,recipient,subject,status,attempts,message_id,last_error,next_attempt_at,sent_at,metadata,is_test,created_at,updated_at").order("created_at", { ascending: false }).limit(100);
  if (status && ["queued", "sending", "sent", "failed", "dead_letter"].includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return errorResponse("Email delivery logs are unavailable. Apply the observability migration first.", 503);
  return Response.json({ events: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  const access = await requireStudioPermission("notifications.manage");
  if (!access.ok) return access.response;
  let body: { eventId?: unknown };
  try { body = await request.json(); } catch { return errorResponse("Invalid retry request."); }
  if (typeof body.eventId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.eventId)) return errorResponse("Invalid email event ID.");
  const { data: event, error } = await access.supabase.from("studio_email_events").select("id,kind,status,metadata").eq("id", body.eventId).single();
  if (error || !event) return errorResponse("Email event not found.", 404);
  if (event.status !== "failed") return errorResponse("Only failed email events can be retried.", 409);
  const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata as Record<string, unknown> : {};
  try {
    let message;
    if (event.kind === "appointment.status" && typeof metadata.appointmentId === "string") {
      const { data: appointment } = await access.supabase.from("appointments").select("id,client_name,client_email,service,scheduled_at,status,notes").eq("id", metadata.appointmentId).single();
      if (!appointment?.client_email) return errorResponse("Appointment no longer has a valid email address.", 422);
      message = appointmentEmail({ recipient: appointment.client_email, clientName: appointment.client_name, service: appointment.service, scheduledAt: appointment.scheduled_at, status: appointment.status, notes: appointment.notes });
    } else if (event.kind === "order.status" && typeof metadata.orderId === "string") {
      const { data: order } = await access.supabase.from("store_orders").select("id,order_number,customer_name,customer_email,status,payment_status,total,currency").eq("id", metadata.orderId).single();
      if (!order?.customer_email) return errorResponse("Order no longer has a valid customer email address.", 422);
      message = orderEmail({ recipient: order.customer_email, customerName: order.customer_name, orderNumber: order.order_number, status: order.status, paymentStatus: order.payment_status, total: Number(order.total), currency: order.currency });
    } else if (event.kind === "automation.failure.test" && metadata.simulatedFailure === true) {
      message = automationFailureEmail({ recipient: "invalid-test-recipient", jobName: "studio-low-stock-alerts", trigger: "failure-retry-test", startedAt: new Date().toISOString(), errorMessage: "Controlled SMTP retry simulation." });
    } else return errorResponse("This email event cannot be retried automatically.", 422);
    const result = await sendTrackedEmail({ supabase: access.supabase, actorId: access.user.id, kind: event.kind, message, metadata: { ...metadata, retryOf: event.id } });
    await access.supabase.from("studio_email_events").update({ status: "dead_letter", last_error: `Retried as ${result.eventId || "a new event"}`, updated_at: new Date().toISOString() }).eq("id", event.id);
    return Response.json({ ok: true, eventId: result.eventId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return errorResponse("Retry failed. The new attempt has been recorded if SMTP was reached.", 502); }
}
