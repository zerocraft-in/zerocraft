import { requireStudioPermission } from "@/lib/studio-auth";
import { createServiceClient } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nextCleanupAt(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(2, 30, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export async function GET() {
  const access = await requireStudioPermission("team.read");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return Response.json({ error: "Only administrators can view team invitation health." }, { status: 403 });
  let service;
  try { service = createServiceClient(); } catch { return Response.json({ error: "Team invitation health is not configured." }, { status: 503 }); }
  const [{ data: invites, error: inviteError }, { data: lastCleanup, error: cleanupError }] = await Promise.all([
    service.from("studio_team_invites").select("status"),
    service.from("store_audit_logs").select("created_at,metadata").eq("action", "team.invite_expiry_cleanup").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (inviteError || cleanupError) return Response.json({ error: "Team invitation health could not be loaded." }, { status: 503 });
  const counts = (invites || []).reduce<Record<string, number>>((result, invite) => { result[invite.status] = (result[invite.status] || 0) + 1; return result; }, {});
  return Response.json({ counts, lastCleanup: lastCleanup || null, nextCleanupAt: nextCleanupAt(), schedule: "Daily at 02:30 UTC" }, { headers: { "Cache-Control": "private, no-store" } });
}
