import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess, text } from "@/lib/studio-api";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStudioAccess("leads.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  try {
    const body = await readJson(request);
    const detail = text(body?.detail, "Note", 4000);
    const activityType = typeof body?.activity_type === "string" && ["note", "email", "whatsapp", "call", "appointment"].includes(body.activity_type) ? body.activity_type : "note";
    const { data: lead } = await access.supabase.from("leads").select("id").eq("id", id).maybeSingle();
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    const { data, error } = await access.supabase.from("lead_activities").insert({ lead_id: id, actor_id: access.user.id, activity_type: activityType, detail }).select("*").single();
    if (error) return apiError(error, 400);
    await access.supabase.from("leads").update({ updated_at: new Date().toISOString() }).eq("id", id);
    await audit(access.supabase, access.user.id, "lead.activity_created", "studio_lead", id, { activity_type: activityType });
    return NextResponse.json({ activity: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
