import { requireStudioAccess } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const workspace = url.searchParams.get("workspace") || "studio";
  const resource = url.searchParams.get("resource") || "";
  if (!resource) return Response.json({ error: "Resource is required." }, { status: 400 });
  const { data, error } = await access.supabase.from("studio_saved_views").select("id,name,workspace,resource,view_state,created_at,updated_at").eq("owner_id", access.user.id).eq("workspace", workspace).eq("resource", resource).order("updated_at", { ascending: false });
  if (error) return Response.json({ error: "Saved views are unavailable." }, { status: 503 });
  return Response.json({ views: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const workspace = typeof body.workspace === "string" ? body.workspace.trim() : "studio";
  const resource = typeof body.resource === "string" ? body.resource.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!resource || !name) return Response.json({ error: "Resource and view name are required." }, { status: 400 });
  const { data, error } = await access.supabase.from("studio_saved_views").upsert({ owner_id: access.user.id, workspace, resource, name, view_state: body.view_state && typeof body.view_state === "object" ? body.view_state : {} }, { onConflict: "owner_id,workspace,resource,name" }).select("id,name,workspace,resource,view_state,created_at,updated_at").single();
  if (error) return Response.json({ error: "Saved view could not be stored." }, { status: 503 });
  return Response.json({ view: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "View id is required." }, { status: 400 });
  const { error } = await access.supabase.from("studio_saved_views").delete().eq("id", id).eq("owner_id", access.user.id);
  if (error) return Response.json({ error: "Saved view could not be deleted." }, { status: 503 });
  return Response.json({ ok: true });
}
