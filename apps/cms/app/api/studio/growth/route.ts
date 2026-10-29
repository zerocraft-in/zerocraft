import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireStudioPermission("reports.read");
  if (!access.ok) return access.response;
  const [{ data: leads, error: leadsError }, { data: projects, error: projectsError }] = await Promise.all([
    access.supabase.from("studio_leads").select("source,stage,utm_source,utm_medium,utm_campaign,created_at"),
    access.supabase.from("studio_projects").select("status,created_at,updated_at"),
  ]);
  if (leadsError || projectsError) return Response.json({ error: "Growth reporting is unavailable. Apply the leads and projects migration first." }, { status: 503 });
  const sourceMap = new Map<string, number>();
  const campaignMap = new Map<string, number>();
  for (const lead of leads || []) { const source = lead.source || "unknown"; sourceMap.set(source, (sourceMap.get(source) || 0) + 1); const campaign = lead.utm_campaign || "Unattributed"; campaignMap.set(campaign, (campaignMap.get(campaign) || 0) + 1); }
  return Response.json({ checkedAt: new Date().toISOString(), providers: { ga4: { status: process.env.GA4_PROPERTY_ID ? "configured" : "not_configured", propertyId: process.env.GA4_PROPERTY_ID || null }, searchConsole: { status: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ? "configured" : "not_configured", siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || null } }, leads: { total: leads?.length || 0, byStage: Object.fromEntries(stages.reduce((map, stage) => { map.set(stage, (leads || []).filter((lead) => lead.stage === stage).length); return map; }, new Map<string, number>())), bySource: Object.fromEntries([...sourceMap.entries()].sort((a, b) => b[1] - a[1])), byCampaign: Object.fromEntries([...campaignMap.entries()].sort((a, b) => b[1] - a[1])) }, projects: { total: projects?.length || 0, byStatus: Object.fromEntries(projectStatuses.reduce((map, status) => { map.set(status, (projects || []).filter((project) => project.status === status).length); return map; }, new Map<string, number>())) } }, { headers: { "Cache-Control": "private, no-store" } });
}

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const projectStatuses = ["planning", "active", "review", "completed", "on_hold", "cancelled"];
