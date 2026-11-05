import { NextResponse } from "next/server";
import { createStudioSupabaseServerClient } from "@/lib/studio-supabase-server";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function GET() {
  const supabase = await createStudioSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: isMember, error: membershipError } = await supabase.rpc("is_member");
  if (membershipError || isMember !== true) {
    return NextResponse.json({ error: "Active Studio membership required." }, { status: 403 });
  }

  const [{ data: accounts, error: accountsError }, { data: preferences }] = await Promise.all([
    supabase.from("accounts").select("id,email,full_name,role,is_active").order("created_at", { ascending: true }),
    supabase.from("notification_preferences").select("automation_failure_enabled,low_stock_enabled").eq("user_id", user.id).maybeSingle(),
  ]);
  if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 });

  const { data: isAdmin } = await supabase.rpc("is_admin");
  const invites = isAdmin === true
    ? (await supabase.from("staff_invites").select("id,email,role,status,expires_at,created_at").eq("status", "pending").order("created_at", { ascending: false })).data ?? []
    : [];
  const currentAccount = (accounts ?? []).find((account) => account.id === user.id);
  const permissionKeys = ["dashboard.read", "clients.read", "content.read", "reports.read", "settings.manage", "team.manage"];
  const permissionResults = await Promise.all(permissionKeys.map((permission) => supabase.rpc("has_permission", { p_permission: permission })));
  const permissions = Object.fromEntries(permissionKeys.map((permission, index) => [permission, permissionResults[index].data === true]));
  const { data: auditRows } = await supabase.from("audit_logs").select("id,action,entity_type,created_at").order("created_at", { ascending: false }).limit(3);

  return NextResponse.json({
    members: (accounts ?? []).map((account) => ({
      id: account.id,
      initials: initials(account.full_name || account.email || "Member"),
      name: account.full_name || account.email || "Unnamed member",
      email: account.email,
      role: roleLabels[account.role] ?? account.role,
      workload: undefined,
      status: account.is_active ? "Active" : "Inactive",
    })),
    invites: invites.map((invite) => ({
      id: invite.id,
      initials: initials(invite.email),
      name: invite.email,
      email: invite.email,
      role: roleLabels[invite.role] ?? invite.role,
      status: "Invited",
    })),
    notifications: {
      assigned: preferences?.low_stock_enabled ?? true,
      approval: preferences?.automation_failure_enabled ?? true,
      digest: false,
    },
    currentRole: roleLabels[currentAccount?.role ?? ""] ?? currentAccount?.role ?? "Member",
    permissions,
    audit: auditRows ?? [],
    canInvite: permissions["team.manage"] === true,
  });
}

export async function POST(request: Request) {
  const supabase = await createStudioSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: canInvite, error: permissionError } = await supabase.rpc("has_permission", { p_permission: "team.manage" });
  if (permissionError || canInvite !== true) {
    return NextResponse.json({ error: "You do not have permission to invite team members." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { email?: string; role?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const allowedRoles = ["admin", "manager", "staff"];
  const role = body?.role && allowedRoles.includes(body.role) ? body.role : "staff";
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { data: invite, error } = await supabase
    .from("staff_invites")
    .insert({ email, role, invited_by: user.id })
    .select("id,email,role,status,expires_at,created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ invite }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createStudioSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const assigned = body?.assigned === true;
  const approval = body?.approval === true;
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    low_stock_enabled: assigned,
    automation_failure_enabled: approval,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
