import { createStudioSupabaseServerClient } from "@/lib/studio-supabase-server";

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type ProjectStatus = "planning" | "active" | "review" | "completed" | "on_hold" | "cancelled";

export type DashboardLead = {
  id: string;
  name: string;
  company: string;
  service: string;
  stage: LeadStage;
  value: string;
  nextAction: string;
  initials: string;
};

export type DashboardProject = {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  deadline: string;
  budget: string;
  color: string;
};

export type StudioDashboardData = {
  source: "live" | "demo";
  leads: DashboardLead[];
  projects: DashboardProject[];
};

const demoLeads: DashboardLead[] = [
  { id: "demo-lead-1", name: "Alex Vance", company: "Aesthetic Labs", service: "Brand + Commerce", stage: "new", value: "$24,000", nextAction: "Review brief", initials: "AV" },
  { id: "demo-lead-2", name: "Maya Chen", company: "Northstar Health", service: "Digital product", stage: "contacted", value: "$18,500", nextAction: "Send availability", initials: "MC" },
  { id: "demo-lead-3", name: "Marcus Aurel", company: "Kinetix Studio", service: "Spatial showroom", stage: "qualified", value: "$42,000", nextAction: "Book discovery", initials: "MA" },
  { id: "demo-lead-4", name: "Priya Nair", company: "Field Notes Co.", service: "Campaign system", stage: "proposal", value: "$12,800", nextAction: "Follow up Friday", initials: "PN" },
];

const demoProjects: DashboardProject[] = [
  { id: "demo-project-1", name: "Cinder / Brand launch", client: "Cinder Coffee Co.", status: "active", progress: 72, deadline: "Nov 14", budget: "$18.4k", color: "from-orange-400 to-rose-500" },
  { id: "demo-project-2", name: "Aster digital platform", client: "Aster Financial", status: "review", progress: 91, deadline: "Nov 08", budget: "$32.0k", color: "from-cyan-400 to-blue-500" },
  { id: "demo-project-3", name: "Kinetix spatial system", client: "Kinetix Studio", status: "planning", progress: 24, deadline: "Dec 02", budget: "$42.0k", color: "from-violet-400 to-fuchsia-500" },
];

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function money(value: number | null | undefined) {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export async function getStudioDashboardData(): Promise<StudioDashboardData> {
  try {
    const supabase = await createStudioSupabaseServerClient();
    // The store-only transition renamed the original studio tables to commerce_*.
    // Read the current studio names first, then remain compatible with that deployed schema.
    const readWithCompatibility = async (studioTable: string, commerceTable: string, columns: string, limit: number) => {
      const primary = await supabase.from(studioTable).select(columns).order("updated_at", { ascending: false }).limit(limit);
      if (!primary.error) return primary;
      return supabase.from(commerceTable).select(columns).order("updated_at", { ascending: false }).limit(limit);
    };
    const [{ data: leadRows, error: leadsError }, { data: projectRows, error: projectsError }] = await Promise.all([
      readWithCompatibility("studio_leads", "commerce_leads", "id,name,company,service_interest,stage,next_action", 8),
      readWithCompatibility("studio_projects", "commerce_projects", "id,name,status,deadline,budget,description", 6),
    ]);

    if (leadsError || projectsError || (!leadRows?.length && !projectRows?.length)) {
      return { source: "demo", leads: demoLeads, projects: demoProjects };
    }

    const leads = ((leadRows ?? []) as Array<Record<string, any>>).map((lead) => ({
      id: String(lead.id),
      name: String(lead.name ?? "Unnamed lead"),
      company: String(lead.company ?? "Unassigned company"),
      service: String(lead.service_interest ?? "General enquiry"),
      stage: (lead.stage as LeadStage) ?? "new",
      value: "Discovery",
      nextAction: String(lead.next_action ?? "Review lead"),
      initials: initials(String(lead.name ?? "Lead")),
    }));

    const projects = ((projectRows ?? []) as Array<Record<string, any>>).map((project, index) => ({
      id: String(project.id),
      name: String(project.name),
      client: String(project.description || "Studio delivery"),
      status: (project.status as ProjectStatus) ?? "planning",
      progress: project.status === "completed" ? 100 : project.status === "review" ? 90 : project.status === "active" ? 64 : 22,
      deadline: project.deadline ? new Date(String(project.deadline)).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No deadline",
      budget: money(Number(project.budget ?? 0)),
      color: ["from-orange-400 to-rose-500", "from-cyan-400 to-blue-500", "from-violet-400 to-fuchsia-500"][index % 3],
    }));

    return { source: "live", leads: leads.length ? leads : demoLeads, projects: projects.length ? projects : demoProjects };
  } catch {
    return { source: "demo", leads: demoLeads, projects: demoProjects };
  }
}
