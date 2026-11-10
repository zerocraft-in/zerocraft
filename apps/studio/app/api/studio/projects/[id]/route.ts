import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess } from "@/lib/studio-api";

type Context = { params: Promise<{ id: string }> };
const statuses = ["planning", "active", "review", "completed", "on_hold", "cancelled"];

export async function GET(_request: Request, context: Context) {
  const access = await requireStudioAccess("projects.read");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const [{ data: project, error }, { data: milestones, error: milestoneError }] = await Promise.all([
    access.supabase.from("projects").select("id,name,description,status,deadline,budget,progress,owner_id,updated_at").eq("id", id).maybeSingle(),
    access.supabase.from("project_milestones").select("id,project_id,title,status,due_date,position").eq("project_id", id).order("position"),
  ]);
  if (error || milestoneError) return apiError(error ?? milestoneError, 503);
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json({ project: { ...project, milestones: milestones ?? [] } });
}

export async function PATCH(request: Request, context: Context) {
  const access = await requireStudioAccess("projects.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const body = await readJson(request);
  const updates: Record<string, unknown> = {};
  for (const key of ["name", "description", "deadline", "budget", "progress", "owner_id", "status"]) if (body && key in body) updates[key] = body[key];
  if (typeof updates.name === "string") updates.name = updates.name.trim().slice(0, 180);
  if (updates.deadline === "") updates.deadline = null;
  if (updates.budget === "") updates.budget = null;
  if (!updates.name && "name" in updates) return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  if ("status" in updates && (typeof updates.status !== "string" || !statuses.includes(updates.status))) return NextResponse.json({ error: "Invalid project status." }, { status: 400 });
  if ("progress" in updates && (typeof updates.progress !== "number" || updates.progress < 0 || updates.progress > 100)) return NextResponse.json({ error: "Progress must be between 0 and 100." }, { status: 400 });
  updates.updated_at = new Date().toISOString();
  const { data, error } = await access.supabase.from("projects").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) return apiError(error, 400);
  if (!data) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  await audit(access.supabase, access.user.id, "project.updated", "studio_project", id, { fields: Object.keys(updates) });
  return NextResponse.json({ project: data });
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireStudioAccess("projects.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const { data: existing } = await access.supabase.from("projects").select("id,name").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { error } = await access.supabase.from("projects").delete().eq("id", id);
  if (error) return apiError(error, 400);
  await audit(access.supabase, access.user.id, "project.deleted", "studio_project", id, { name: existing.name });
  return NextResponse.json({ ok: true });
}
