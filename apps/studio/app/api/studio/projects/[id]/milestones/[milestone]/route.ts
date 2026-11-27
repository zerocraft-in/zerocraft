import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess } from "@/lib/studio-api";

type Context = { params: Promise<{ id: string; milestone: string }> };
const statuses = ["todo", "in_progress", "blocked", "done"];

export async function PATCH(request: Request, context: Context) {
  const access = await requireStudioAccess("projects.manage");
  if ("response" in access) return access.response;
  const { id, milestone } = await context.params;
  const body = await readJson(request); const updates: Record<string, unknown> = {};
  for (const key of ["title", "status", "due_date", "position"]) if (body && key in body) updates[key] = body[key];
  if ("status" in updates && (typeof updates.status !== "string" || !statuses.includes(updates.status))) return NextResponse.json({ error: "Invalid milestone status." }, { status: 400 });
  if (updates.status === "done") updates.completed_at = new Date().toISOString();
  if (updates.status && updates.status !== "done") updates.completed_at = null;
  updates.updated_at = new Date().toISOString();
  const { data, error } = await access.supabase.from("project_milestones").update(updates).eq("id", milestone).eq("project_id", id).select("*").maybeSingle();
  if (error) return apiError(error, 400);
  if (!data) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
  await audit(access.supabase, access.user.id, "project.milestone_updated", "studio_project", id, { milestone_id: milestone, fields: Object.keys(updates) });
  return NextResponse.json({ milestone: data });
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireStudioAccess("projects.manage");
  if ("response" in access) return access.response;
  const { id, milestone } = await context.params;
  const { error } = await access.supabase.from("project_milestones").delete().eq("id", milestone).eq("project_id", id);
  if (error) return apiError(error, 400);
  await audit(access.supabase, access.user.id, "project.milestone_deleted", "studio_project", id, { milestone_id: milestone });
  return NextResponse.json({ ok: true });
}
