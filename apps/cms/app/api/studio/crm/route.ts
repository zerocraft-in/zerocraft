import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireStudioPermission("clients.read");
  if (!access.ok) return access.response;
  const { supabase } = access;
  const [leads, clients, projects, activities, works, blogs] = await Promise.all([
    supabase.from("studio_leads").select("id,name,email,phone,company,stage,source,service_interest,next_action,updated_at").order("updated_at", { ascending: false }).limit(12),
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("studio_projects").select("id,name,status,deadline,updated_at").order("updated_at", { ascending: false }).limit(6),
    supabase.from("studio_lead_activities").select("id,lead_id,activity_type,detail,created_at,studio_leads(name)").order("created_at", { ascending: false }).limit(8),
    supabase.from("works").select("id", { count: "exact", head: true }),
    supabase.from("blogs").select("id", { count: "exact", head: true }),
  ]);
  const firstError = [leads, clients, projects, activities].find((result) => result.error);
  if (firstError?.error) return Response.json({ error: "CRM workspace data is unavailable. Check the deployed CRM migrations and permissions." }, { status: 503 });
  const stageCounts = Object.fromEntries(["new", "contacted", "qualified", "proposal", "won", "lost"].map((stage) => [stage, (leads.data || []).filter((lead) => lead.stage === stage).length]));
  return Response.json({
    leads: leads.data || [],
    clients: clients.count || 0,
    projects: projects.data || [],
    activities: activities.data || [],
    works: works.error ? null : works.count,
    blogs: blogs.error ? null : blogs.count,
    stageCounts,
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
