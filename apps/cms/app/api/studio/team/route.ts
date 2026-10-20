import { requireStudioAccess } from "@/lib/studio-auth";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roles = ["admin", "manager", "staff", "client"] as const;
type ManagedRole = (typeof roles)[number];

function denied(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can manage team access.", 403);

  const { data, error } = await access.supabase
    .from("profiles")
    .select("id,email,full_name,avatar_url,role,created_at,updated_at")
    .order("created_at", { ascending: true });
  if (error) return denied("Team members could not be loaded.", 503);

  return Response.json({ members: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can manage team access.", 403);

  let body: { id?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return denied("Invalid team update request."); }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const roleValue = typeof body.role === "string" ? body.role.trim() : "";
  if (!id || !roles.includes(roleValue as ManagedRole)) return denied("A valid member and role are required.");
  const role = roleValue as ManagedRole;
  if (id === access.user.id && role !== "admin") return denied("You cannot remove your own administrator access.", 400);

  const { data: previous, error: previousError } = await access.supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", id)
    .maybeSingle();
  if (previousError || !previous) return denied("Team member not found.", 404);

  const { data, error } = await access.supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,email,full_name,avatar_url,role,created_at,updated_at")
    .single();
  if (error) return denied("The team member role could not be updated.", 400);

  const { error: auditError } = await access.supabase.from("store_audit_logs").insert({
    actor_id: access.user.id,
    action: "team.role_changed",
    entity_type: "profile",
    entity_id: id,
    metadata: { email: previous.email, from: previous.role, to: role },
  });
  if (auditError) console.error("Team role audit failed", auditError);

  return Response.json({ member: data }, { headers: { "Cache-Control": "private, no-store" } });
}
