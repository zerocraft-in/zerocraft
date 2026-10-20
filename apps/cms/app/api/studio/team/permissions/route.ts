import { requireStudioAccess } from "@/lib/studio-auth";
import { createServiceClient } from "@/lib/supabase-service";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function denied(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function serviceClient() {
  try { return createServiceClient(); } catch { return null; }
}

export async function GET() {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can manage permissions.", 403);
  const service = serviceClient();
  if (!service) return denied("Permission management requires SUPABASE_SERVICE_ROLE_KEY on the server.", 503);
  const [permissions, roleDefaults, overrides] = await Promise.all([
    service.from("studio_permissions").select("key,label,description,group_name,sort_order").order("sort_order"),
    service.from("studio_role_permissions").select("role,permission_key,allowed"),
    service.from("studio_user_permissions").select("user_id,permission_key,allowed,updated_at"),
  ]);
  if (permissions.error || roleDefaults.error || overrides.error) return denied("Permission settings could not be loaded. Apply the RBAC migration first.", 503);
  return Response.json({ permissions: permissions.data || [], roleDefaults: roleDefaults.data || [], overrides: overrides.data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can manage permissions.", 403);
  let body: { userId?: unknown; permissions?: unknown };
  try { body = await request.json(); } catch { return denied("Invalid permission update request."); }
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId || !Array.isArray(body.permissions)) return denied("A team member and permission list are required.");
  const requested = body.permissions.filter((item): item is { key: string; allowed: boolean } => Boolean(item) && typeof item === "object" && typeof (item as { key?: unknown }).key === "string" && typeof (item as { allowed?: unknown }).allowed === "boolean");
  const service = serviceClient();
  if (!service) return denied("Permission management requires SUPABASE_SERVICE_ROLE_KEY on the server.", 503);
  const [{ data: member }, { data: catalog, error: catalogError }] = await Promise.all([
    service.from("profiles").select("id,email,role").eq("id", userId).maybeSingle(),
    service.from("studio_permissions").select("key"),
  ]);
  if (!member) return denied("Team member not found.", 404);
  if (catalogError) return denied("Permission catalog is unavailable.", 503);
  const allowedKeys = new Set((catalog || []).map((item) => item.key));
  const clean = requested.filter((item) => allowedKeys.has(item.key));
  const { error: deleteError } = await service.from("studio_user_permissions").delete().eq("user_id", userId);
  if (deleteError) return denied("Existing permission overrides could not be cleared.", 503);
  if (clean.length) {
    const { error } = await service.from("studio_user_permissions").insert(clean.map((item) => ({ user_id: userId, permission_key: item.key, allowed: item.allowed, updated_by: access.user.id })));
    if (error) return denied("Permission overrides could not be saved.", 503);
  }
  await service.from("store_audit_logs").insert({ actor_id: access.user.id, action: "team.permissions_changed", entity_type: "profile", entity_id: userId, metadata: { email: member.email, role: member.role, overrideCount: clean.length } });
  return Response.json({ saved: true, userId, overrideCount: clean.length }, { headers: { "Cache-Control": "private, no-store" } });
}
