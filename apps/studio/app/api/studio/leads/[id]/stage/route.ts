import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess } from "@/lib/studio-api";

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStudioAccess("leads.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const body = await readJson(request);
  if (typeof body?.stage !== "string" || !stages.includes(body.stage)) return NextResponse.json({ error: "Invalid lead stage." }, { status: 400 });
  const { data: current } = await access.supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  if (current.stage === body.stage) return NextResponse.json({ lead: { ...current, id } });
  const { data, error } = await access.supabase.from("leads").update({ stage: body.stage, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return apiError(error, 400);
  await access.supabase.from("lead_activities").insert({ lead_id: id, actor_id: access.user.id, activity_type: "stage_change", detail: `Stage changed from ${current.stage} to ${body.stage}.` });
  await audit(access.supabase, access.user.id, "lead.stage_changed", "studio_lead", id, { from: current.stage, to: body.stage });
  return NextResponse.json({ lead: data });
}
