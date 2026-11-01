import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@zerocraft/supabase/server";
import { studioSessionIsRevoked } from "@/lib/commerce-sessions";

export const COMMERCE_ROLES = ["admin", "manager", "staff"] as const;
export type CommerceRole = (typeof COMMERCE_ROLES)[number];
export const COMMERCE_PERMISSIONS = [
  "dashboard.read", "content.read", "content.manage", "customers.read", "customers.manage",
  "catalog.read", "catalog.manage",
  "inventory.read", "inventory.manage", "orders.read", "orders.manage", "reports.read",
  "notifications.read", "notifications.manage", "automations.read", "automations.manage",
  "audit.read", "audit.write", "team.read", "team.manage", "settings.manage",
  "billing.read", "billing.manage", "system_health.read", "system_health.manage",
  "email.read", "email.manage",
] as const;
export type CommercePermission = (typeof COMMERCE_PERMISSIONS)[number];

type CommerceAccess = {
  ok: true;
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  role: CommerceRole;
};

type CommerceDenied = { ok: false; response: Response };

export async function requireCommerceAccess(): Promise<CommerceAccess | CommerceDenied> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: Response.json({ error: "Sign in to use Commerce." }, { status: 401, headers: { "Cache-Control": "private, no-store" } }) };
  }

  const { data: profile, error } = await supabase.from("accounts").select("role,is_active").eq("id", user.id).maybeSingle();
  const role = profile?.role as CommerceRole | undefined;
  if (error || !role || !COMMERCE_ROLES.includes(role) || profile?.is_active === false) {
    return { ok: false, response: Response.json({ error: "Commerce access required." }, { status: 403, headers: { "Cache-Control": "private, no-store" } }) };
  }
  if (await studioSessionIsRevoked(user.id)) {
    return { ok: false, response: Response.json({ error: "This CMS session was revoked. Sign in again." }, { status: 401, headers: { "Cache-Control": "private, no-store" } }) };
  }

  return { ok: true, supabase, user, role };
}

export async function requireCommercePermission(permission: CommercePermission): Promise<CommerceAccess | CommerceDenied> {
  const access = await requireCommerceAccess();
  if (!access.ok) return access;
  const { data, error } = await access.supabase.rpc("has_permission", { p_permission: permission });
  if (error) {
    return { ok: false, response: Response.json({ error: "Permission service is unavailable. Apply the permissions migration first." }, { status: 503, headers: { "Cache-Control": "private, no-store" } }) };
  }
  if (data !== true) {
    return { ok: false, response: Response.json({ error: "You do not have permission to perform this action." }, { status: 403, headers: { "Cache-Control": "private, no-store" } }) };
  }
  return access;
}

export async function getCommercePermissions(access: CommerceAccess): Promise<CommercePermission[]> {
  const { data, error } = await access.supabase.rpc("permissions_for_current_user");
  if (error || !Array.isArray(data)) return [];
  return data.map((item: { permission_key?: unknown }) => item.permission_key).filter((value): value is CommercePermission => typeof value === "string" && COMMERCE_PERMISSIONS.includes(value as CommercePermission));
}
