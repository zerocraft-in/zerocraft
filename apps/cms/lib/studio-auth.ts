import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@zerocraft/supabase/server";
import { studioSessionIsRevoked } from "@/lib/studio-sessions";

export const STUDIO_ROLES = ["admin", "manager", "staff"] as const;
export type StudioRole = (typeof STUDIO_ROLES)[number];
export const STUDIO_PERMISSIONS = [
  "dashboard.read", "content.read", "content.manage", "clients.read", "clients.manage",
  "appointments.read", "appointments.manage", "catalog.read", "catalog.manage",
  "inventory.read", "inventory.manage", "orders.read", "orders.manage", "reports.read",
  "notifications.read", "notifications.manage", "automations.read", "automations.manage",
  "audit.read", "audit.write", "team.read", "team.manage", "settings.manage",
  "billing.read", "billing.manage", "system_health.read", "system_health.manage",
  "email.read", "email.manage",
] as const;
export type StudioPermission = (typeof STUDIO_PERMISSIONS)[number];

type StudioAccess = {
  ok: true;
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  role: StudioRole;
};

type StudioDenied = { ok: false; response: Response };

export async function requireStudioAccess(): Promise<StudioAccess | StudioDenied> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: Response.json({ error: "Sign in to use Studio." }, { status: 401, headers: { "Cache-Control": "private, no-store" } }) };
  }

  const { data: profile, error } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  const role = profile?.role as StudioRole | undefined;
  if (error || !role || !STUDIO_ROLES.includes(role) || profile?.is_active === false) {
    return { ok: false, response: Response.json({ error: "Studio access required." }, { status: 403, headers: { "Cache-Control": "private, no-store" } }) };
  }
  if (await studioSessionIsRevoked(user.id)) {
    return { ok: false, response: Response.json({ error: "This CMS session was revoked. Sign in again." }, { status: 401, headers: { "Cache-Control": "private, no-store" } }) };
  }

  return { ok: true, supabase, user, role };
}

export async function requireStudioPermission(permission: StudioPermission): Promise<StudioAccess | StudioDenied> {
  const access = await requireStudioAccess();
  if (!access.ok) return access;
  const { data, error } = await access.supabase.rpc("studio_has_permission", { p_permission: permission });
  if (error) {
    return { ok: false, response: Response.json({ error: "Permission service is unavailable. Apply the permissions migration first." }, { status: 503, headers: { "Cache-Control": "private, no-store" } }) };
  }
  if (data !== true) {
    return { ok: false, response: Response.json({ error: "You do not have permission to perform this action." }, { status: 403, headers: { "Cache-Control": "private, no-store" } }) };
  }
  return access;
}

export async function getStudioPermissions(access: StudioAccess): Promise<StudioPermission[]> {
  const { data, error } = await access.supabase.rpc("studio_permissions_for_current_user");
  if (error || !Array.isArray(data)) return [];
  return data.map((item: { permission_key?: unknown }) => item.permission_key).filter((value): value is StudioPermission => typeof value === "string" && STUDIO_PERMISSIONS.includes(value as StudioPermission));
}
