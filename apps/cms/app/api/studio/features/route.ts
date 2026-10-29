import { createServiceClient } from "@/lib/supabase-service";
import { requireStudioPermission } from "@/lib/studio-auth";
import { isStudioFeatureKey } from "@/lib/studio-features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return access.response;
  try {
    const { data, error } = await createServiceClient()
      .from("studio_features")
      .select("feature_key,display_name,description,enabled,updated_at")
      .order("display_name");
    if (error) throw error;
    return Response.json({ features: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Studio feature registry read failed", error);
    return Response.json({ error: "Feature registry is unavailable. Apply the feature registry migration first." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin" && access.role !== "manager") {
    return Response.json({ error: "Only admins and managers can manage features." }, { status: 403 });
  }
  let body: { featureKey?: unknown; enabled?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!isStudioFeatureKey(body.featureKey) || typeof body.enabled !== "boolean") {
    return Response.json({ error: "A valid feature key and boolean enabled value are required." }, { status: 400 });
  }
  try {
    const { data, error } = await createServiceClient()
      .from("studio_features")
      .update({ enabled: body.enabled, updated_by: access.user.id, updated_at: new Date().toISOString() })
      .eq("feature_key", body.featureKey)
      .select("feature_key,display_name,description,enabled,updated_at")
      .maybeSingle();
    if (error || !data) throw error || new Error("Feature not found");
    return Response.json({ feature: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Studio feature registry update failed", error);
    return Response.json({ error: "Feature setting could not be saved." }, { status: 503 });
  }
}
