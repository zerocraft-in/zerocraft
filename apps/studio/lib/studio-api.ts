import { NextResponse } from "next/server";
import { createStudioSupabaseServerClient } from "@/lib/studio-supabase-server";

export type StudioPermission =
  | "dashboard.read"
  | "content.read"
  | "content.manage"
  | "leads.read"
  | "leads.manage"
  | "projects.read"
  | "projects.manage"
  | "media.read"
  | "media.manage"
  | "analytics.read"
  | "audit.read"
  | "audit.write"
  | "team.read"
  | "team.manage"
  | "settings.manage"
  | "integrations.manage";

export async function requireStudioAccess(permission: StudioPermission) {
  const supabase = await createStudioSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) } as const;
  const { data: member, error: memberError } = await supabase.rpc("is_member");
  if (memberError || member !== true) return { response: NextResponse.json({ error: "Active Studio membership required." }, { status: 403 }) } as const;
  const { data: allowed, error: permissionError } = await supabase.rpc("has_permission", { p_permission: permission });
  if (permissionError || allowed !== true) return { response: NextResponse.json({ error: `Permission required: ${permission}.` }, { status: 403 }) } as const;
  return { supabase, user } as const;
}

export function apiError(error: unknown, status = 400) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request could not be completed." }, { status });
}

export async function readJson(request: Request) {
  return request.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

export function text(value: unknown, field: string, max = 500) {
  if (typeof value !== "string") throw new Error(`${field} is required.`);
  const result = value.trim();
  if (!result || result.length > max) throw new Error(`${field} must be between 1 and ${max} characters.`);
  return result;
}

export async function audit(
  supabase: Awaited<ReturnType<typeof createStudioSupabaseServerClient>>,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    metadata: { ...metadata, entity_type: entityType, entity_id: entityId },
  });
  if (error) {
    console.error("Studio audit write failed", {
      action,
      entityType,
      entityId,
      error: error.message,
    });
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}
