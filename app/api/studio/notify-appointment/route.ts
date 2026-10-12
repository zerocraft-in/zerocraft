import { createClient } from "@/utils/supabase/server";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to use studio automation." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!["admin", "manager", "staff"].includes(profile?.role || "")) return Response.json({ error: "Studio access required." }, { status: 403 });
  const webhook = process.env.N8N_WHATSAPP_WEBHOOK_URL;
  if (!webhook) return Response.json({ error: "WhatsApp automation is not configured. Set N8N_WHATSAPP_WEBHOOK_URL." }, { status: 503 });
  let url: URL;
  try { url = new URL(webhook); } catch { return Response.json({ error: "Invalid automation URL." }, { status: 503 }); }
  if (url.protocol !== "https:") return Response.json({ error: "Automation URL must use HTTPS." }, { status: 503 });
  let body: { appointmentId?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.appointmentId || !/^[0-9a-f-]{36}$/i.test(body.appointmentId)) return Response.json({ error: "Invalid appointment ID." }, { status: 400 });
  const { data: appointment, error } = await supabase.from("appointments").select("id,client_name,client_phone,client_email,service,scheduled_at,status,notes").eq("id", body.appointmentId).single();
  if (error || !appointment) return Response.json({ error: "Appointment not found." }, { status: 404 });
  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "studio_appointment_update", timestamp: new Date().toISOString(), data: appointment }),
      signal: AbortSignal.timeout(10_000), cache: "no-store",
    });
    if (!response.ok) return Response.json({ error: "The automation service did not accept this request." }, { status: 502 });
    await supabase.from("appointments").update({ whatsapp_sent: true }).eq("id", appointment.id);
    return Response.json({ message: "WhatsApp workflow triggered. Delivery depends on the configured provider." });
  } catch { return Response.json({ error: "Automation service is unavailable." }, { status: 502 }); }
}
