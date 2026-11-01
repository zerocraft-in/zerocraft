import { requireCommercePermission } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function denied(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

function validId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCommercePermission("team.read");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can view user details.", 403);
  const { id } = await params;
  if (!validId(id)) return denied("A valid user is required.", 400);
  const { data: member, error } = await access.supabase
    .from("accounts")
    .select("id,email,full_name,avatar_url,role,is_active,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return denied("User details could not be loaded.", 503);
  if (!member) return denied("User not found.", 404);
  return Response.json({ member }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await requireCommercePermission("team.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can manage users.", 403);
  const { id } = await params;
  if (!validId(id)) return denied("A valid user is required.", 400);
  let body: { role?: unknown; isActive?: unknown };
  try { body = await request.json(); } catch { return denied("Invalid user update request."); }
  const role = typeof body.role === "string" && ["admin", "manager", "staff", "client"].includes(body.role) ? body.role : undefined;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
  if (!role && isActive === undefined) return denied("Choose a role or access status to update.");
  const { data: previous, error: previousError } = await access.supabase.from("accounts").select("id,email,role,is_active").eq("id", id).maybeSingle();
  if (previousError || !previous) return denied("User not found.", 404);
  if (id === access.user.id && ((role && role !== "admin") || isActive === false)) return denied("You cannot remove your own administrator access.");
  const updates = { ...(role ? { role } : {}), ...(isActive === undefined ? {} : { is_active: isActive }), updated_at: new Date().toISOString() };
  const { data: member, error } = await access.supabase.from("accounts").update(updates).eq("id", id).select("id,email,full_name,avatar_url,role,is_active,created_at,updated_at").single();
  if (error || !member) return denied("User could not be updated.", 503);
  await access.supabase.from("audit_logs").insert({ actor_id: access.user.id, action: isActive === undefined ? "team.role_changed" : "team.access_changed", entity_type: "profile", entity_id: id, metadata: { email: previous.email, from: { role: previous.role, isActive: previous.is_active }, to: { role: member.role, isActive: member.is_active } } });
  return Response.json({ member }, { headers: { "Cache-Control": "private, no-store" } });
}
