import { NextResponse } from "next/server";
import { apiError, requireStudioAccess } from "@/lib/studio-api";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStudioAccess("leads.manage");
  if ("response" in access) return access.response;
  const { id } = await context.params;
  const { data: canManageProjects, error: permissionError } = await access.supabase.rpc("has_permission", { p_permission: "projects.manage" });
  if (permissionError || canManageProjects !== true) return NextResponse.json({ error: "Permission required: projects.manage." }, { status: 403 });
  const { data: projectId, error } = await access.supabase.rpc("convert_lead_to_project", { p_lead_id: id });
  if (error) return apiError(error, error.code === "P0002" ? 404 : 400);
  return NextResponse.json({ projectId });
}
