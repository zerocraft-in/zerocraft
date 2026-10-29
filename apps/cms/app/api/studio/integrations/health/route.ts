import { createServiceClient } from "@/lib/supabase-service";
import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return access.response;
  try {
    const service = createServiceClient();
    const { data: registry, error: registryError } = await service
      .from("studio_integrations")
      .select("provider,status,enabled,last_verified_at,last_error,metadata,encrypted_credentials")
      .order("provider");
    if (registryError) throw registryError;
    let gmail: { email_address?: string | null; connected_at?: string | null } | null = null;
    let gmailError = false;
    try {
      const result = await service.from("studio_gmail_connections").select("email_address,connected_at").eq("connection_id", "workspace").maybeSingle();
      gmail = result.data;
      gmailError = Boolean(result.error);
    } catch {
      gmailError = true;
    }
    const rows = registry || [];
    const byProvider = new Map(rows.map((row) => [row.provider, row]));
    const connected = (provider: string, fallback: boolean) => {
      const row = byProvider.get(provider);
      return row?.status === "connected" && row.enabled ? "connected" : fallback ? "ready" : "not_configured";
    };
    return Response.json({
      checkedAt: new Date().toISOString(),
      registry: { status: "healthy", providerCount: rows.length },
      providers: {
        gmail: { status: gmailError ? "unavailable" : gmail ? "connected" : "not_connected", email: gmail?.email_address || null, connectedAt: gmail?.connected_at || null },
        whatsapp: { status: connected("whatsapp", Boolean(process.env.N8N_WHATSAPP_WEBHOOK_URL)) },
        ga4: { status: connected("ga4", Boolean(process.env.GA4_PROPERTY_ID)) },
        searchConsole: { status: connected("search_console", Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL)) },
        instagram: { status: connected("instagram", Boolean(process.env.INSTAGRAM_ACCESS_TOKEN)) },
        googleBusiness: { status: connected("google_business", Boolean(process.env.GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID)) },
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Studio integration health check failed", error);
    return Response.json({ error: "Integration health is unavailable. Apply the integration registry migration first." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
