import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses = ["planning", "active", "review", "completed", "on_hold", "cancelled"] as const;

export async function GET() {
  const access = await requireStudioPermission("content.read");
  if (!access.ok) return access.response;
  const { data, error } = await access.supabase.from("studio_projects").select("id,client_id,work_id,name,status,description,deadline,budget,created_at,updated_at,studio_project_milestones(id,title,status,due_date,position,completed_at)").order("updated_at", { ascending: false }).limit(200);
  if (error) return Response.json({ error: "Projects are unavailable. Apply the projects migration first." }, { status: 503 });
  return Response.json({ projects: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("content.manage");
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return Response.json({ error: "Project name is required." }, { status: 400 });
  const status = typeof body.status === "string" && statuses.includes(body.status as (typeof statuses)[number]) ? body.status : "planning";
  const { data, error } = await access.supabase.from("studio_projects").insert({ name, status, description: typeof body.description === "string" ? body.description.trim() : "", client_id: typeof body.client_id === "string" && body.client_id ? body.client_id : null, work_id: typeof body.work_id === "string" && body.work_id ? body.work_id : null, deadline: typeof body.deadline === "string" && body.deadline ? body.deadline : null, budget: typeof body.budget === "number" ? body.budget : null }).select("*").single();
  if (error) return Response.json({ error: "Project could not be created." }, { status: 503 });
  return Response.json({ project: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await requireStudioPermission("content.manage");
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Project id is required." }, { status: 400 });
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["name", "description", "deadline", "budget", "client_id", "work_id"]) if (key in body) update[key] = body[key] || null;
  if (typeof body.status === "string" && statuses.includes(body.status as (typeof statuses)[number])) update.status = body.status;
  const { data, error } = await access.supabase.from("studio_projects").update(update).eq("id", id).select("*").single();
  if (error) return Response.json({ error: "Project could not be updated." }, { status: 503 });
  return Response.json({ project: data });
}
