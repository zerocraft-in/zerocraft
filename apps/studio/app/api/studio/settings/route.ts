import { NextResponse } from "next/server";
import { audit } from "@/lib/studio-api";
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

  const [
    { data: accounts, error: accountsError },
    { data: preferences, error: preferencesError },
    { data: workspace, error: workspaceError },
  ] = await Promise.all([
    supabase.from("accounts").select("id,display_name,status").order("created_at", { ascending: true }),
    supabase.from("notification_preferences").select("lead_assigned_enabled,approval_needed_enabled,weekly_digest_enabled").eq("user_id", user.id).maybeSingle(),
    supabase.from("workspace_settings").select("workspace_name,currency,timezone,brand_name,accent_color,logo_url,favicon_url,font_family,theme_mode").eq("id", 1).maybeSingle(),
  ]);
  const queryError = accountsError ?? preferencesError ?? workspaceError;
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 503 });

  const currentAccount = (accounts ?? []).find((account) => account.id === user.id);
  const permissionKeys = [
    "dashboard.read", "leads.read", "projects.read", "content.read",
    "analytics.read", "media.read", "settings.manage", "integrations.manage", "team.manage",
  ];
  const permissionResults = await Promise.all(permissionKeys.map((permission) => supabase.rpc("has_permission", { p_permission: permission })));
  const permissionError = permissionResults.find((result) => result.error)?.error;
  if (permissionError) return NextResponse.json({ error: permissionError.message }, { status: 503 });
  const permissions = Object.fromEntries(permissionKeys.map((permission, index) => [permission, permissionResults[index].data === true]));
  const [{ data: invites, error: invitesError }, { data: auditRows, error: auditError }] = await Promise.all([
    permissions["team.manage"]
      ? supabase.from("staff_invites").select("id,email,role,status,expires_at,created_at").eq("status", "pending").order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("audit_logs").select("id,action,metadata,created_at").order("created_at", { ascending: false }).limit(50),
  ]);
  if (invitesError ?? auditError) return NextResponse.json({ error: (invitesError ?? auditError)?.message }, { status: 503 });
  const { data: integrations, error: integrationsError } = permissions["integrations.manage"]
    ? await supabase.rpc("studio_integration_statuses")
    : { data: [], error: null };
  if (integrationsError) return NextResponse.json({ error: integrationsError.message }, { status: 503 });

  const integrationRows = [...(integrations ?? [])];
  if (!integrationRows.some((item) => item.provider === "cloudflare_r2") && process.env.CLOUDFLARE_R2_ACCOUNT_ID && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
    integrationRows.unshift({ provider: "cloudflare_r2", display_name: "Cloudflare R2 media", status: "connected", enabled: true, last_verified_at: new Date().toISOString() });
  }

  return NextResponse.json({
    members: (accounts ?? []).map((account) => ({
      id: account.id,
      initials: initials(account.display_name || "Member"),
      name: account.display_name || "Unnamed member",
      email: account.display_name || "",
      role: "Member",
      workload: undefined,
      status: account.status || "Active",
    })),
    invites: (invites ?? []).map((invite) => ({
      id: invite.id,
      initials: initials(invite.email),
      name: invite.email,
      email: invite.email,
      role: roleLabels[invite.role] ?? invite.role,
      status: "Invited",
    })),
    notifications: {
      assigned: preferences?.lead_assigned_enabled ?? true,
      approval: preferences?.approval_needed_enabled ?? true,
      digest: preferences?.weekly_digest_enabled ?? false,
    },
    workspace: {
      name: workspace?.workspace_name ?? "ZeroCraft Studio",
      currency: workspace?.currency ?? "USD",
      timezone: workspace?.timezone ?? "Asia/Kolkata",
    },
    brand: {
      name: workspace?.brand_name ?? "ZeroCraft Studio",
      accentColor: workspace?.accent_color ?? "#ff6a2b",
      logoUrl: workspace?.logo_url ?? "",
      faviconUrl: workspace?.favicon_url ?? "",
      fontFamily: workspace?.font_family ?? "Inter",
      themeMode: workspace?.theme_mode ?? "dark",
    },
    integrations: integrationRows,
    currentRole: "Member",
    permissions,
    audit: (auditRows ?? []).map((row) => ({
      ...row,
      entity_type: typeof row.metadata?.entity_type === "string" ? row.metadata.entity_type : "workspace",
    })),
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
  if (!body || typeof body !== "object") return NextResponse.json({ error: "A settings object is required." }, { status: 400 });

  const notificationKeys = ["assigned", "approval", "digest"] as const;
  const isNotificationUpdate = notificationKeys.some((key) => Object.hasOwn(body, key));
  if (isNotificationUpdate) {
    if (notificationKeys.some((key) => Object.hasOwn(body, key) && typeof body[key] !== "boolean")) {
      return NextResponse.json({ error: "Notification preferences must be boolean values." }, { status: 400 });
    }
    const values: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (Object.hasOwn(body, "assigned")) values.lead_assigned_enabled = body.assigned;
    if (Object.hasOwn(body, "approval")) values.approval_needed_enabled = body.approval;
    if (Object.hasOwn(body, "digest")) values.weekly_digest_enabled = body.digest;
    const { error } = await supabase.from("notification_preferences").upsert(values);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await audit(supabase, user.id, "settings.notifications_updated", "notification_preferences", user.id);
    return NextResponse.json({ ok: true });
  }

  const { data: canManage, error: permissionError } = await supabase.rpc("has_permission", { p_permission: "settings.manage" });
  if (permissionError || canManage !== true) {
    return NextResponse.json({ error: "You do not have permission to change workspace settings." }, { status: 403 });
  }

  const values: Record<string, unknown> = { id: 1, updated_by: user.id, updated_at: new Date().toISOString() };
  if (Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120) {
      return NextResponse.json({ error: "Workspace name must be between 1 and 120 characters." }, { status: 400 });
    }
    values.workspace_name = body.name.trim();
  }
  if (Object.hasOwn(body, "currency")) {
    if (typeof body.currency !== "string" || !/^[A-Z]{3}$/.test(body.currency)) {
      return NextResponse.json({ error: "Currency must be a three-letter ISO code." }, { status: 400 });
    }
    values.currency = body.currency;
  }
  if (Object.hasOwn(body, "timezone")) {
    if (typeof body.timezone !== "string" || body.timezone.length > 100) {
      return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 });
    }
    try { new Intl.DateTimeFormat("en", { timeZone: body.timezone }); }
    catch { return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 }); }
    values.timezone = body.timezone;
  }
  if (Object.hasOwn(body, "brandName")) {
    if (typeof body.brandName !== "string" || !body.brandName.trim() || body.brandName.trim().length > 120) {
      return NextResponse.json({ error: "Brand name must be between 1 and 120 characters." }, { status: 400 });
    }
    values.brand_name = body.brandName.trim();
  }
  if (Object.hasOwn(body, "accentColor")) {
    if (typeof body.accentColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(body.accentColor)) {
      return NextResponse.json({ error: "Accent color must be a six-digit hex color." }, { status: 400 });
    }
    values.accent_color = body.accentColor.toLowerCase();
  }
  for (const [input, column, label] of [["logoUrl", "logo_url", "Logo URL"], ["faviconUrl", "favicon_url", "Favicon URL"]] as const) {
    if (Object.hasOwn(body, input)) {
      if (typeof body[input] !== "string" || body[input].length > 500 || (body[input] && !/^https:\/\//i.test(body[input]))) return NextResponse.json({ error: `${label} must be an HTTPS URL.` }, { status: 400 });
      values[column] = body[input].trim();
    }
  }
  if (Object.hasOwn(body, "fontFamily")) {
    if (typeof body.fontFamily !== "string" || !["Inter", "DM Sans", "Manrope", "Space Grotesk", "Plus Jakarta Sans"].includes(body.fontFamily)) return NextResponse.json({ error: "Choose a supported font family." }, { status: 400 });
    values.font_family = body.fontFamily;
  }
  if (Object.hasOwn(body, "themeMode")) {
    if (typeof body.themeMode !== "string" || !["dark", "light", "system"].includes(body.themeMode)) return NextResponse.json({ error: "Choose dark, light, or system appearance." }, { status: 400 });
    values.theme_mode = body.themeMode;
  }
  if (Object.keys(values).length === 3) return NextResponse.json({ error: "No supported settings were provided." }, { status: 400 });

  const { data: settings, error } = await supabase.from("workspace_settings")
    .upsert(values, { onConflict: "id" })
    .select("workspace_name,currency,timezone,brand_name,accent_color,logo_url,favicon_url,font_family,theme_mode")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit(supabase, user.id, "settings.workspace_updated", "workspace_settings", null, { fields: Object.keys(values).filter((key) => key !== "id" && key !== "updated_by" && key !== "updated_at") });

  return NextResponse.json({ settings });
}
