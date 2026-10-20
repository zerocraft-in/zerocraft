import { NextResponse } from "next/server";
import { isSafeReturnPath } from "@/lib/domains";
import { createClient } from "@zerocraft/supabase/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = isSafeReturnPath(searchParams.get("next"), "/");
  const safeDestination = new URL(next, origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        try {
          const service = createServiceClient();
          const { data: invite } = await service.from("studio_team_invites").select("id,email,role").eq("auth_user_id", userData.user.id).eq("status", "pending").maybeSingle();
          if (invite) {
            await service.from("studio_team_invites").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invite.id);
            await service.from("store_audit_logs").insert({ actor_id: userData.user.id, action: "team.invite_accepted", entity_type: "team_invite", entity_id: invite.id, metadata: { email: invite.email, role: invite.role } });
          }
        } catch (acceptError) {
          console.error("Team invitation acceptance sync failed", acceptError);
        }
      }
      return NextResponse.redirect(safeDestination);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
