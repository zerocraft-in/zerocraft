import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireStudioPermission("content.manage");
  if (!access.ok) return access.response;
  let body: { project_id?: unknown; title?: unknown; due_date?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const projectId = typeof body.project_id === "string" ? body.project_id : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!projectId || !title) return Response.json({ error: "Project and milestone title are required." }, { status: 400 });
  const { data, error } = await access.supabase.from("studio_project_milestones").insert({ project_id: projectId, title, due_date: typeof body.due_date === "string" && body.due_date ? body.due_date : null }).select("*").single();
  if (error) return Response.json({ error: "Milestone could not be created." }, { status: 503 });
  return Response.json({ milestone: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireStudioPermission("content.manage");
  if (!access.ok) return access.response;
  let body: { id?: unknown; status?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" && ["todo", "in_progress", "blocked", "done"].includes(body.status) ? body.status : "";
  if (!id || !status) return Response.json({ error: "Milestone id and valid status are required." }, { status: 400 });
  const { data, error } = await access.supabase.from("studio_project_milestones").update({ status, completed_at: status === "done" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return Response.json({ error: "Milestone could not be updated." }, { status: 503 });
  return Response.json({ milestone: data });
}
