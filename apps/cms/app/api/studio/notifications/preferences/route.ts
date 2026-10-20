import { requireStudioAccess } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  const { data, error } = await access.supabase.from("studio_notification_preferences").select("automation_failure_enabled,low_stock_enabled,updated_at").eq("user_id", access.user.id).maybeSingle();
  if (error) return Response.json({ error: "Notification preferences are unavailable." }, { status: 503 });
  return Response.json({ preferences: data || { automation_failure_enabled: true, low_stock_enabled: true, updated_at: null } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const access = await requireStudioAccess();
  if (!access.ok) return access.response;
  let body: { automationFailureEnabled?: boolean; lowStockEnabled?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid preferences payload." }, { status: 400 }); }
  const { data, error } = await access.supabase.from("studio_notification_preferences").upsert({ user_id: access.user.id, automation_failure_enabled: body.automationFailureEnabled !== false, low_stock_enabled: body.lowStockEnabled !== false, updated_at: new Date().toISOString() }).select("automation_failure_enabled,low_stock_enabled,updated_at").single();
  if (error) return Response.json({ error: "Notification preferences could not be saved." }, { status: 500 });
  return Response.json({ preferences: data }, { headers: { "Cache-Control": "private, no-store" } });
}
