import { createServiceClient } from "@/lib/supabase-service";
import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDERS = ["gemini", "supabase", "gmail", "whatsapp", "ga4", "search_console", "instagram", "google_business"] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && PROVIDERS.includes(value as Provider);
}

function safeIntegration(row: Record<string, unknown>) {
  const provider = row.provider as string;
  const environmentConfigured = provider === "gemini" && Boolean(process.env.GEMINI_API_KEY?.trim());
  return {
    provider,
    displayName: row.display_name,
    status: environmentConfigured ? "connected" : row.status,
    enabled: environmentConfigured || Boolean(row.enabled),
    lastVerifiedAt: row.last_verified_at,
    lastError: row.last_error,
    metadata: row.metadata || {},
    hasCredentials: environmentConfigured || Boolean(row.encrypted_credentials),
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return access.response;
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("studio_integrations")
      .select("provider,display_name,status,enabled,last_verified_at,last_error,metadata,encrypted_credentials,updated_at")
      .order("display_name");
    if (error) throw error;
    return Response.json({ integrations: (data || []).map((row) => safeIntegration(row as Record<string, unknown>)) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Studio integration registry read failed", error);
    return Response.json({ error: "Integration registry is unavailable. Apply the integration registry migration first." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function PATCH(request: Request) {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin" && access.role !== "manager") return Response.json({ error: "Only admins and managers can change integrations." }, { status: 403 });
  let body: { provider?: unknown; enabled?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!isProvider(body.provider) || typeof body.enabled !== "boolean") return Response.json({ error: "A valid provider and boolean enabled value are required." }, { status: 400 });
  try {
    const service = createServiceClient();
    const { data, error } = await service.from("studio_integrations").update({ enabled: body.enabled, updated_by: access.user.id, updated_at: new Date().toISOString() }).eq("provider", body.provider).select("provider,display_name,status,enabled,last_verified_at,last_error,metadata,encrypted_credentials,updated_at").maybeSingle();
    if (error || !data) throw error || new Error("Provider not found");
    return Response.json({ integration: safeIntegration(data as Record<string, unknown>) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Studio integration registry update failed", error);
    return Response.json({ error: "Integration setting could not be saved." }, { status: 503 });
  }
}
