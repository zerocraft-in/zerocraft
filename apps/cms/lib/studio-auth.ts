import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@zerocraft/supabase/server";

export const STUDIO_ROLES = ["admin", "manager", "staff"] as const;
export type StudioRole = (typeof STUDIO_ROLES)[number];

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

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role as StudioRole | undefined;
  if (error || !role || !STUDIO_ROLES.includes(role)) {
    return { ok: false, response: Response.json({ error: "Studio access required." }, { status: 403, headers: { "Cache-Control": "private, no-store" } }) };
  }

  return { ok: true, supabase, user, role };
}
