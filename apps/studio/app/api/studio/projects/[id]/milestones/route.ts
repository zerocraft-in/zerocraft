import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess, text } from "@/lib/studio-api";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStudioAccess("projects.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  try {
    const body = await readJson(request);
    const title = text(body?.title, "Milestone title", 180);
    const { data: project } = await access.supabase.from("projects").select("id").eq("id", id).maybeSingle();
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const { count } = await access.supabase.from("project_milestones").select("id", { count: "exact", head: true }).eq("project_id", id);
    const { data, error } = await access.supabase.from("project_milestones").insert({ project_id: id, title, due_date: typeof body?.due_date === "string" && body.due_date ? body.due_date : null, position: count ?? 0 }).select("*").single();
    if (error) return apiError(error, 400);
    await audit(access.supabase, access.user.id, "project.milestone_created", "studio_project", id, { milestone_id: data.id });
    return NextResponse.json({ milestone: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
