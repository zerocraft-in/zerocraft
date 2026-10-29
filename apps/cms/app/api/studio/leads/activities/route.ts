import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const activityTypes = ["note", "email", "whatsapp", "call", "appointment", "stage_change"] as const;

export async function GET(request: Request) {
  const access = await requireStudioPermission("clients.read");
  if (!access.ok) return access.response;
  const leadId = new URL(request.url).searchParams.get("leadId");
  if (!leadId) return Response.json({ error: "leadId is required." }, { status: 400 });
  const { data, error } = await access.supabase.from("studio_lead_activities").select("id,lead_id,activity_type,detail,created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(100);
  if (error) return Response.json({ error: "Lead activity could not be loaded." }, { status: 503 });
  return Response.json({ activities: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("clients.manage");
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const detail = typeof body.detail === "string" ? body.detail.trim() : "";
  const activityType = typeof body.activityType === "string" && activityTypes.includes(body.activityType as (typeof activityTypes)[number]) ? body.activityType : "note";
  if (!leadId || !detail) return Response.json({ error: "Lead and activity detail are required." }, { status: 400 });
  const { data, error } = await access.supabase.from("studio_lead_activities").insert({ lead_id: leadId, actor_id: access.user.id, activity_type: activityType, detail }).select("id,lead_id,activity_type,detail,created_at").single();
  if (error) return Response.json({ error: "Lead activity could not be saved." }, { status: 503 });
  await access.supabase.from("studio_leads").update({ updated_at: new Date().toISOString() }).eq("id", leadId);
  return Response.json({ activity: data }, { status: 201 });
}
