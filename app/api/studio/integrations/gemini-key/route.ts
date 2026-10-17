import { isSameOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }

  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return Response.json({ error: "Sign in to Studio first." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ error: "Only a Studio administrator can reveal this key." }, { status: 403, headers: { "Cache-Control": "private, no-store" } });

  let body: { reveal?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers: { "Cache-Control": "private, no-store" } }); }
  if (body.reveal !== true) return Response.json({ error: "Confirm that you want to check the connection status." }, { status: 400, headers: { "Cache-Control": "private, no-store" } });
  return Response.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    source: "server-managed",
    credentials: "never returned",
  }, { headers: { "Cache-Control": "private, no-store", "Pragma": "no-cache" } });
}
