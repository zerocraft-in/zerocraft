import { NextResponse } from "next/server";
import { apiError, audit, requireStudioAccess } from "@/lib/studio-api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStudioAccess("content.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params; const body = await request.json().catch(() => null);
  const scheduledAt = typeof body?.scheduled_at === "string" && body.scheduled_at ? new Date(body.scheduled_at) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) return NextResponse.json({ error: "Choose a future publish time." }, { status: 400 });
  const { data, error } = await access.supabase.from("pages").update({ scheduled_at: scheduledAt.toISOString(), workflow_status: "scheduled", status: "draft", updated_at: new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
  if (error) return apiError(error, 400); if (!data) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  await access.supabase.from("content_workflow_events").insert({ page_id: id, from_status: data.workflow_status, to_status: "scheduled", note: scheduledAt.toISOString(), actor_id: access.user.id });
  await audit(access.supabase, access.user.id, "content.scheduled", "page", id, { scheduled_at: scheduledAt.toISOString() });
  return NextResponse.json({ page: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStudioAccess("content.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params; const { data, error } = await access.supabase.from("pages").update({ scheduled_at: null, workflow_status: "draft", updated_at: new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
  if (error) return apiError(error, 400); if (!data) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  await audit(access.supabase, access.user.id, "content.schedule_cancelled", "page", id); return NextResponse.json({ page: data });
}
