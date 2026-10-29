import { createServiceClient } from "@/lib/supabase-service";
import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER_ENV: Record<string, string> = {
  whatsapp: "N8N_WHATSAPP_WEBHOOK_URL",
  ga4: "GA4_PROPERTY_ID",
  search_console: "GOOGLE_SEARCH_CONSOLE_SITE_URL",
  instagram: "INSTAGRAM_ACCESS_TOKEN",
  google_business: "GOOGLE_BUSINESS_PROFILE_ACCOUNT_ID",
};

const DISPLAY_NAMES: Record<string, string> = {
  whatsapp: "WhatsApp Business",
  ga4: "Google Analytics",
  search_console: "Google Search Console",
  instagram: "Instagram",
  google_business: "Google Business Profile",
};

function validProvider(value: unknown): value is keyof typeof PROVIDER_ENV {
  return typeof value === "string" && value in PROVIDER_ENV;
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => {
    if (!/^[a-zA-Z0-9_]+$/.test(key) || key.toLowerCase().includes("token") || key.toLowerCase().includes("secret")) return false;
    return typeof item === "string" || typeof item === "number" || typeof item === "boolean";
  }).slice(0, 12));
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin" && access.role !== "manager") return Response.json({ error: "Only admins and managers can connect integrations." }, { status: 403 });

  let body: { provider?: unknown; metadata?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  if (!validProvider(body.provider)) return Response.json({ error: "This provider does not have a workspace connection flow yet." }, { status: 400 });
  if (body.provider === "search_console") return Response.json({ error: "Use the Google OAuth connection flow for Search Console." }, { status: 409 });

  const envName = PROVIDER_ENV[body.provider];
  if (!process.env[envName]) return Response.json({ error: `${DISPLAY_NAMES[body.provider]} is not ready. Add ${envName} to the CMS environment, then try again.` }, { status: 409 });

  try {
    const service = createServiceClient();
    const metadata = { ...safeMetadata(body.metadata), connectedVia: "workspace", configuredAt: new Date().toISOString() };
    const { data, error } = await service.from("studio_integrations").update({ status: "connected", enabled: true, last_verified_at: new Date().toISOString(), last_error: null, metadata, updated_by: access.user.id, updated_at: new Date().toISOString() }).eq("provider", body.provider).select("provider,display_name,status,enabled,last_verified_at,last_error,metadata,updated_at").maybeSingle();
    if (error || !data) throw error || new Error("Provider registry record not found");
    return Response.json({ integration: data, message: `${DISPLAY_NAMES[body.provider]} connected.` }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Studio integration connect failed", error);
    return Response.json({ error: "The provider is ready, but its connection could not be saved." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const access = await requireStudioPermission("settings.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin" && access.role !== "manager") return Response.json({ error: "Only admins and managers can disconnect integrations." }, { status: 403 });
  const provider = new URL(request.url).searchParams.get("provider");
  if (!validProvider(provider)) return Response.json({ error: "This provider does not have a workspace connection flow yet." }, { status: 400 });

  try {
    const service = createServiceClient();
    const { error } = await service.from("studio_integrations").update({ status: "error", enabled: false, last_verified_at: null, last_error: null, metadata: {}, updated_by: access.user.id, updated_at: new Date().toISOString() }).eq("provider", provider);
    if (error) throw error;
    return Response.json({ disconnected: true, provider }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Studio integration disconnect failed", error);
    return Response.json({ error: "The integration could not be disconnected." }, { status: 503 });
  }
}
