import { NextResponse } from "next/server";
import { apiError, audit, readJson, requireStudioAccess, text } from "@/lib/studio-api";

const statuses = ["planning", "active", "review", "completed", "on_hold", "cancelled"] as const;
type ProjectStatus = (typeof statuses)[number];

function clean(body: Record<string, unknown>) {
  const name = text(body.name, "Project name", 180);
  const progress = typeof body.progress === "number" ? Math.max(0, Math.min(100, Math.round(body.progress))) : 0;
  const status = typeof body.status === "string" && statuses.includes(body.status as ProjectStatus) ? body.status : "planning";
  return {
    name,
    status,
    description: typeof body.description === "string" ? body.description.trim().slice(0, 8000) : "",
    deadline: typeof body.deadline === "string" && body.deadline ? body.deadline : null,
    budget: typeof body.budget === "number" && Number.isFinite(body.budget) ? Math.max(0, body.budget) : null,
    progress,
    owner_id: typeof body.owner_id === "string" && body.owner_id ? body.owner_id : null,
  };
}

async function loadProjects(supabase: Awaited<ReturnType<typeof import("@/lib/studio-supabase-server").createStudioSupabaseServerClient>>) {
  const [{ data: projects, error }, { data: members, error: memberError }] = await Promise.all([
    supabase.from("projects").select("id,name,description,status,deadline,budget,progress,owner_id,updated_at,milestones:project_milestones(id,project_id,title,status,due_date,position)").order("updated_at", { ascending: false }).limit(250),
    supabase.from("accounts").select("id,display_name").order("display_name"),
  ]);
  if (error || memberError) throw error ?? memberError;
  const normalizedMembers = (members ?? []).map((member) => ({ ...member, full_name: member.display_name, email: member.display_name, avatar_url: null }));
  const memberMap = new Map(normalizedMembers.map((member) => [member.id, member]));
  return {
    projects: (projects ?? []).map((project) => ({
      ...project,
      progress: project.progress ?? 0,
      owner_id: project.owner_id ?? null,
      owner: project.owner_id ? memberMap.get(project.owner_id) ?? null : null,
      milestones: [...(project.milestones ?? [])].sort((a, b) => a.position - b.position),
    })),
    members: normalizedMembers,
  };
}

export async function GET() {
  const access = await requireStudioAccess("projects.read");
  if ("response" in access) return access.response;
  try { return NextResponse.json(await loadProjects(access.supabase), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return apiError(error, 503); }
}

export async function POST(request: Request) {
  const access = await requireStudioAccess("projects.manage");
  if ("response" in access) return access.response;
  try {
    const body = await readJson(request);
    const values = clean(body ?? {});
    const { data, error } = await access.supabase.from("projects").insert(values).select("*").single();
    if (error) return apiError(error, 400);
    await audit(access.supabase, access.user.id, "project.created", "studio_project", data.id, { name: data.name });
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
