import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function studioRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, role: null };
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, role: data?.role || null };
}

export async function GET() {
  const { supabase, role } = await studioRole();
  if (!["admin", "manager", "staff"].includes(role || "")) return Response.json({ error: "Studio access required." }, { status: 403 });
  const [events, pending, failed, delivered] = await Promise.all([
    supabase.from("studio_automation_events").select("id,event_type,entity_id,status,attempts,last_error,created_at,delivered_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("studio_automation_events").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
    supabase.from("studio_automation_events").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("studio_automation_events").select("id", { count: "exact", head: true }).eq("status", "delivered"),
  ]);
  return Response.json({ configured: Boolean(process.env.STUDIO_AUTOMATION_WEBHOOK_URL), schedulerConfigured: Boolean(process.env.CRON_SECRET), aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL), queueAvailable: !events.error, error: events.error ? "Automation queue is unavailable. Apply studio-automation.sql and check access." : null, events: events.data || [], counts: { pending: pending.error ? null : pending.count, failed: failed.error ? null : failed.count, delivered: delivered.error ? null : delivered.count } }, { headers: { "Cache-Control": "private, no-store" } });
}

type QueueEvent = { id: string; event_key: string; event_type: "store_order_created" | "appointment_created"; entity_id: string; attempts: number };

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const fromScheduler = Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
  if (!fromScheduler) {
    if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
    const { role } = await studioRole();
    if (role !== "admin") return Response.json({ error: "Administrator access required." }, { status: 403 });
  }
  const webhook = process.env.STUDIO_AUTOMATION_WEBHOOK_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!webhook || !supabaseUrl || !serviceKey) return Response.json({ error: "Configure STUDIO_AUTOMATION_WEBHOOK_URL and the Supabase service key before dispatching." }, { status: 503 });
  let url: URL;
  try { url = new URL(webhook); } catch { return Response.json({ error: "Invalid automation webhook URL." }, { status: 503 }); }
  if (url.protocol !== "https:") return Response.json({ error: "Automation webhook must use HTTPS." }, { status: 503 });

  const service = createServiceClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await service.rpc("claim_studio_automation_events", { batch_size: 10 });
  if (error) return Response.json({ error: "Could not claim automation events. Check the database migration." }, { status: 503 });
  let delivered = 0;
  let failed = 0;
  for (const event of (data || []) as QueueEvent[]) {
    const source = event.event_type === "store_order_created" ? "store_orders" : "appointments";
    const columns = event.event_type === "store_order_created" ? "id,order_number,status,created_at" : "id,service,status,scheduled_at,created_at";
    const { data: record, error: recordError } = await service.from(source).select(columns).eq("id", event.entity_id).maybeSingle();
    try {
      if (recordError || !record) throw new Error("Source record is unavailable");
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": event.event_key }, body: JSON.stringify({ event: event.event_type, id: event.id, occurredAt: new Date().toISOString(), data: record }), cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
      await service.from("studio_automation_events").update({ status: "delivered", delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", event.id);
      delivered++;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.slice(0, 200) : "Delivery failed";
      await service.from("studio_automation_events").update({ status: "failed", last_error: message, next_attempt_at: new Date(Date.now() + Math.min(60, 2 ** event.attempts) * 60_000).toISOString(), updated_at: new Date().toISOString() }).eq("id", event.id);
      failed++;
    }
  }
  return Response.json({ processed: (data || []).length, delivered, failed }, { headers: { "Cache-Control": "private, no-store" } });
}
