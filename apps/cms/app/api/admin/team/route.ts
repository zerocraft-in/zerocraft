import { requireCommercePermission } from "@/lib/commerce-auth";
import { createServiceClient } from "@/lib/supabase-service";
import { sendEmail } from "@/lib/email/smtp";
import { teamInvitationEmail } from "@/lib/email/templates";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roles = ["admin", "manager", "staff", "client"] as const;
type ManagedRole = (typeof roles)[number];

function denied(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function serviceClient() {
  try { return await createServiceClient(); } catch { return null; }
}

export async function GET() {
  const access = await requireCommercePermission("team.read");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can manage team access.", 403);
  const { data, error } = await access.supabase.from("accounts").select("id,email,full_name,avatar_url,role,is_active,created_at,updated_at").order("created_at", { ascending: true });
  if (error) return denied("Team members could not be loaded.", 503);
  let invites: unknown[] = [];
  const service = await serviceClient();
  if (service) {
    const result = await service.from("staff_invites").select("id,email,role,status,expires_at,created_at").order("created_at", { ascending: false }).limit(25);
    invites = result.data || [];
  }
  return Response.json({ members: data || [], invites }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await requireCommercePermission("team.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can invite team members.", 403);
  let body: { action?: unknown; inviteId?: unknown; email?: unknown; fullName?: unknown; role?: unknown; secureSignIn?: unknown };
  try { body = await request.json(); } catch { return denied("Invalid invitation request."); }
  const service = await serviceClient();
  if (body.action === "resend") {
    const inviteId = typeof body.inviteId === "string" ? body.inviteId.trim() : "";
    if (!inviteId) return denied("A valid invitation is required.");
    if (!service) return denied("Resending invitations requires SUPABASE_SERVICE_ROLE_KEY on the server.", 503);
    const { data: previousInvite, error: previousInviteError } = await service.from("staff_invites").select("id,email,role,status,expires_at,auth_user_id").eq("id", inviteId).maybeSingle();
    if (previousInviteError || !previousInvite) return denied("Invitation not found.", 404);
    const expiredPending = previousInvite.status === "pending" && new Date(previousInvite.expires_at).getTime() <= Date.now();
    if (!(previousInvite.status === "expired" || previousInvite.status === "email_failed" || expiredPending)) return denied("Only expired or failed invitations can be resent.", 409);
    if (!previousInvite.auth_user_id) return denied("This invitation has no account to reactivate.", 409);
    const { data: profile } = await service.from("accounts").select("full_name").eq("id", previousInvite.auth_user_id).maybeSingle();
    const { error: activateError } = await service.auth.admin.updateUserById(previousInvite.auth_user_id, { ban_duration: "none" });
    if (activateError) return denied("The invitation account could not be reactivated.", 503);
    await service.from("accounts").update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", previousInvite.auth_user_id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const redirectTo = `${new URL(request.url).origin}/auth/callback?next=/`;
    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({ type: "invite", email: previousInvite.email, options: { redirectTo, data: { full_name: profile?.full_name || previousInvite.email.split("@")[0], invited_role: previousInvite.role } } });
    if (linkError || !linkData.properties?.action_link) return denied("The replacement invitation link could not be generated.", 503);
    await service.from("staff_invites").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", previousInvite.id);
    const { data: invite, error: inviteError } = await service.from("staff_invites").insert({ email: previousInvite.email, role: previousInvite.role, auth_user_id: previousInvite.auth_user_id, invited_by: access.user.id, expires_at: expiresAt }).select("id,email,role,status,expires_at,created_at").single();
    if (inviteError) return denied("The replacement invitation could not be recorded.", 503);
    try {
      await sendEmail(teamInvitationEmail({ recipient: previousInvite.email, role: previousInvite.role, inviteUrl: linkData.properties.action_link, inviterName: access.user.email || "A ZeroCraft administrator", expiresAt }));
    } catch (error) {
      await service.from("staff_invites").update({ status: "email_failed" }).eq("id", invite.id);
      console.error("Team invitation resend failed", error);
      return denied("The replacement invitation was created, but email delivery failed.", 502);
    }
    await service.from("audit_logs").insert({ actor_id: access.user.id, action: "team.invite_resent", entity_type: "team_invite", entity_id: invite.id, metadata: { email: previousInvite.email, role: previousInvite.role, previousInviteId: previousInvite.id } });
    return Response.json({ invite }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
  const roleValue = typeof body.role === "string" ? body.role.trim() : "staff";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !roles.includes(roleValue as ManagedRole) || roleValue === "client") return denied("Enter a valid email and a Commerce role.");
  if (!service) return denied("Invitations are not configured yet. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.", 503);
  const role = roleValue as Exclude<ManagedRole, "client">;
  const { data: existing } = await service.from("accounts").select("id,email,role,is_active").eq("email", email).maybeSingle();
  if (existing) return denied("This email already has a ZeroCraft account. Change its role from the team directory instead.", 409);
  const { data: created, error: createError } = await service.auth.admin.createUser({ email, email_confirm: false, user_metadata: { full_name: fullName || email.split("@")[0], invited_role: role } });
  if (createError || !created.user) return denied("The invitation account could not be created. Check whether this email is already registered.", 409);
  const userId = created.user.id;
  const { error: profileError } = await service.from("accounts").upsert({ id: userId, email, full_name: fullName || email.split("@")[0], role, is_active: true, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (profileError) return denied("The invitation profile could not be prepared.", 503);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const redirectTo = `${new URL(request.url).origin}/auth/callback?next=/`;
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({ type: "invite", email, options: { redirectTo, data: { full_name: fullName || email.split("@")[0], invited_role: role } } });
  if (linkError || !linkData.properties?.action_link) return denied("The invitation link could not be generated.", 503);
  const { data: invite, error: inviteError } = await service.from("staff_invites").insert({ email, role, auth_user_id: userId, invited_by: access.user.id, expires_at: expiresAt }).select("id,email,role,status,expires_at,created_at").single();
  if (inviteError) return denied("The invitation could not be recorded. Apply the team invitation migration first.", 503);
  try {
    await sendEmail(teamInvitationEmail({ recipient: email, role, inviteUrl: linkData.properties.action_link, inviterName: access.user.email || "A ZeroCraft administrator", expiresAt }));
  } catch (error) {
    await service.from("staff_invites").update({ status: "email_failed" }).eq("id", invite.id);
    console.error("Team invitation email failed", error);
    return denied("The account was created, but the invitation email could not be delivered. Check SMTP delivery logs.", 502);
  }
  await service.from("audit_logs").insert({ actor_id: access.user.id, action: "team.invited", entity_type: "profile", entity_id: userId, metadata: { email, role, inviteId: invite.id } });
  return Response.json({ invite }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await requireCommercePermission("team.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can manage team access.", 403);
  let body: { id?: unknown; role?: unknown; isActive?: unknown };
  try { body = await request.json(); } catch { return denied("Invalid team update request."); }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const roleValue = typeof body.role === "string" ? body.role.trim() : "";
  const role = roleValue ? roleValue as ManagedRole : undefined;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
  if (!id || (role && !roles.includes(role))) return denied("A valid member and role are required.");
  if (id === access.user.id && ((role && role !== "admin") || isActive === false)) return denied("You cannot remove your own administrator access.", 400);
  const { data: previous, error: previousError } = await access.supabase.from("accounts").select("id,email,full_name,role,is_active").eq("id", id).maybeSingle();
  if (previousError || !previous) return denied("Team member not found.", 404);
  const service = isActive === undefined ? null : await serviceClient();
  if (isActive !== undefined && !service) return denied("Suspension controls require SUPABASE_SERVICE_ROLE_KEY on the server.", 503);
  if (isActive !== undefined) {
    const { error: authError } = await service!.auth.admin.updateUserById(id, { ban_duration: isActive ? "none" : "876000h" });
    if (authError) return denied("The authentication account could not be updated.", 503);
  }
  const updates = { ...(role ? { role } : {}), ...(isActive === undefined ? {} : { is_active: isActive }), updated_at: new Date().toISOString() };
  const { data, error } = await access.supabase.from("accounts").update(updates).eq("id", id).select("id,email,full_name,avatar_url,role,is_active,created_at,updated_at").single();
  if (error) {
    if (isActive !== undefined) await service!.auth.admin.updateUserById(id, { ban_duration: previous.is_active ? "none" : "876000h" });
    return denied("The team member access could not be updated.", 400);
  }
  await access.supabase.from("audit_logs").insert({ actor_id: access.user.id, action: isActive === undefined ? "team.role_changed" : "team.access_changed", entity_type: "profile", entity_id: id, metadata: { email: previous.email, from: { role: previous.role, isActive: previous.is_active }, to: { role: data.role, isActive: data.is_active } } });
  return Response.json({ member: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return denied("Invalid request origin.", 403);
  const access = await requireCommercePermission("team.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return denied("Only administrators can remove team access.", 403);
  let body: { kind?: unknown; id?: unknown; confirm?: unknown };
  try { body = await request.json(); } catch { return denied("Invalid removal request."); }
  const kind = body.kind === "invite" || body.kind === "member" ? body.kind : "";
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!kind || !id || body.confirm !== true) return denied("Removal confirmation is required.");
  const service = await serviceClient();
  if (!service) return denied("Removal controls require SUPABASE_SERVICE_ROLE_KEY on the server.", 503);

  if (kind === "invite") {
    const { data: invite, error } = await service.from("staff_invites").select("id,email,role,status,auth_user_id").eq("id", id).maybeSingle();
    if (error || !invite) return denied("Invitation not found.", 404);
    if (invite.status !== "pending") return denied("Only pending invitations can be revoked.", 409);
    if (invite.auth_user_id) {
      const { error: authError } = await service.auth.admin.updateUserById(invite.auth_user_id, { ban_duration: "876000h" });
      if (authError) return denied("The invitation account could not be disabled.", 503);
      await service.from("accounts").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", invite.auth_user_id);
    }
    const { error: revokeError } = await service.from("staff_invites").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", id);
    if (revokeError) return denied("The invitation could not be revoked.", 503);
    await service.from("audit_logs").insert({ actor_id: access.user.id, action: "team.invite_revoked", entity_type: "team_invite", entity_id: id, metadata: { email: invite.email, role: invite.role } });
    return Response.json({ revoked: true }, { headers: { "Cache-Control": "private, no-store" } });
  }

  if (id === access.user.id) return denied("You cannot remove your own administrator account.", 400);
  const { data: member, error: memberError } = await service.from("accounts").select("id,email,full_name,role,is_active").eq("id", id).maybeSingle();
  if (memberError || !member) return denied("Team member not found.", 404);
  const { error: deleteError } = await service.auth.admin.deleteUser(id);
  if (deleteError) return denied("The team member could not be removed.", 503);
  await service.from("audit_logs").insert({ actor_id: access.user.id, action: "team.member_removed", entity_type: "profile", entity_id: id, metadata: { email: member.email, role: member.role, isActive: member.is_active } });
  return Response.json({ removed: true }, { headers: { "Cache-Control": "private, no-store" } });
}
