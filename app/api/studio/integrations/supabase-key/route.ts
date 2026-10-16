import { isSameOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";
import { getStoredIntegrationForAdmin } from "@/lib/studio-integration-secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store", Pragma: "no-cache" };
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to Studio first." }, { status: 401, headers });
  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ error: "Only a Studio administrator can reveal these values." }, { status: 403, headers });
  let body: { reveal?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers }); }
  if (body.reveal !== true) return Response.json({ error: "Confirm that you want to reveal the environment values." }, { status: 400, headers });
  try {
    const saved = await getStoredIntegrationForAdmin<{ url?: string; serviceRoleKey?: string }>("supabase");
    const projectUrl = saved?.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = saved?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!projectUrl || !serviceRoleKey) return Response.json({ error: "Supabase connection values are not configured." }, { status: 404, headers });
    return Response.json({ projectUrl, serviceRoleKey, source: saved?.serviceRoleKey ? "vault" : "environment" }, { headers });
  } catch {
    return Response.json({ error: "Could not read the saved Supabase credential." }, { status: 503, headers });
  }
}
