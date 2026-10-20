import { requireStudioPermission } from "@/lib/studio-auth";
import { isSameOrigin } from "@/lib/request-origin";
import { sendTrackedEmail } from "@/lib/email/delivery";
import { appointmentEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const access = await requireStudioPermission("appointments.manage");
  if (!access.ok) return access.response;
  let body: { appointmentId?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.appointmentId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.appointmentId)) return Response.json({ error: "Invalid appointment ID." }, { status: 400 });
  const { data: appointment, error } = await access.supabase.from("appointments").select("id,client_name,client_email,service,scheduled_at,status,notes").eq("id", body.appointmentId).single();
  if (error || !appointment) return Response.json({ error: "Appointment not found." }, { status: 404 });
  if (!appointment.client_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appointment.client_email)) return Response.json({ error: "This appointment does not have a valid client email." }, { status: 422 });
  try {
    const result = await sendTrackedEmail({ supabase: access.supabase, actorId: access.user.id, kind: "appointment.status", message: appointmentEmail({ recipient: appointment.client_email, clientName: appointment.client_name, service: appointment.service, scheduledAt: appointment.scheduled_at, status: appointment.status, notes: appointment.notes }), metadata: { appointmentId: appointment.id, status: appointment.status } });
    return Response.json({ ok: true, messageId: result.messageId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "Appointment email could not be sent. The failed attempt was recorded." }, { status: 502 }); }
}
