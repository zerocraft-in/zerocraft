import { createServiceClient } from "@/lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const validSecrets = [process.env.CRON_SECRET, process.env.WEEKLY_REPORT_WORKER_SECRET].filter(
    (value): value is string => Boolean(value),
  );
  return Boolean(provided && validSecrets.includes(provided));
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized cleanup request." }, { status: 401 });
  const service = await createServiceClient();
  const now = new Date().toISOString();
  const { data: expired, error } = await service.from("staff_invites").select("id,email,role,auth_user_id,expires_at").eq("status", "pending").lte("expires_at", now).order("expires_at", { ascending: true }).limit(100);
  if (error) return Response.json({ error: "Invitation expiry cleanup could not load pending invites." }, { status: 503 });
  let expiredCount = 0;
  for (const invite of expired || []) {
    if (invite.auth_user_id) {
      await service.auth.admin.updateUserById(invite.auth_user_id, { ban_duration: "876000h" });
      await service.from("accounts").update({ is_active: false, updated_at: now }).eq("id", invite.auth_user_id);
    }
    const { error: updateError } = await service.from("staff_invites").update({ status: "expired" }).eq("id", invite.id).eq("status", "pending");
    if (updateError) continue;
    await service.from("audit_logs").insert({ actor_id: null, action: "team.invite_expired", entity_type: "team_invite", entity_id: invite.id, metadata: { email: invite.email, role: invite.role, expiresAt: invite.expires_at, trigger: "scheduled" } });
    expiredCount += 1;
  }
  await service.from("audit_logs").insert({ actor_id: null, action: "team.invite_expiry_cleanup", entity_type: "team_invite_cleanup", entity_id: null, metadata: { expiredCount, checkedAt: now, trigger: "scheduled" } });
  return Response.json({ ok: true, expiredCount, checkedAt: now }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  return GET(request);
}
