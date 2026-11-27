import { NextResponse } from "next/server";
import { apiError, requireStudioAccess } from "@/lib/studio-api";
import { listStudioObjects } from "@/lib/studio-r2-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const leadStages = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const dataPermissions = ["leads.read", "projects.read", "media.read", "content.read"] as const;

export async function GET() {
  const access = await requireStudioAccess("dashboard.read");
  if ("response" in access) return access.response;

  const permissionResults = await Promise.all(
    dataPermissions.map((permission) =>
      access.supabase.rpc("has_permission", { p_permission: permission }),
    ),
  );
  const permissionError = permissionResults.find((result) => result.error)?.error;
  if (permissionError) return apiError(permissionError, 503);

  const [leadsAllowed, projectsAllowed, mediaAllowed, contentAllowed] =
    permissionResults.map((result) => result.data === true);

  try {
    const [
      leadActionsResult,
      leadCountsResult,
      activeProjectsResult,
      projectsResult,
      mediaResult,
      contentResult,
    ] = await Promise.all([
      leadsAllowed
        ? access.supabase
            .from("leads")
            .select("id,name,stage,next_action,next_action_at")
            .not("next_action", "is", null)
            .neq("next_action", "")
            .order("next_action_at", { ascending: true, nullsFirst: false })
            .limit(6)
        : Promise.resolve({ data: null, error: null }),
      leadsAllowed
        ? Promise.all(
            leadStages.map((stage) =>
              access.supabase
                .from("leads")
                .select("id", { count: "exact", head: true })
                .eq("stage", stage),
            ),
          )
        : Promise.resolve(null),
      projectsAllowed
        ? access.supabase
                .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("status", "active")
        : Promise.resolve({ count: null, error: null }),
      projectsAllowed
        ? access.supabase
                .from("projects")
            .select("id,name,status,progress,deadline")
            .order("updated_at", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: null, error: null }),
      mediaAllowed ? listStudioObjects() : Promise.resolve(null),
      contentAllowed
        ? access.supabase
            .from("pages")
            .select("id", { count: "exact", head: true })
            .eq("status", "published")
        : Promise.resolve({ count: null, error: null }),
    ]);

    const queryError =
      leadActionsResult.error ??
      leadCountsResult?.find((result) => result.error)?.error ??
      activeProjectsResult.error ??
      projectsResult.error ??
      contentResult.error;
    if (queryError) return apiError(queryError, 503);

    const leadCounts = leadCountsResult
      ? Object.fromEntries(
          leadStages.map((stage, index) => [
            stage,
            leadCountsResult[index].count ?? 0,
          ]),
        )
      : null;
    const actionItems = (leadActionsResult.data ?? []).map((lead) => ({
      id: lead.id,
      title: lead.next_action,
      context: lead.name,
      dueAt: lead.next_action_at,
    }));

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        permissions: {
          leads: leadsAllowed,
          projects: projectsAllowed,
          media: mediaAllowed,
          content: contentAllowed,
        },
        leadCounts,
        activeProjects: projectsAllowed ? activeProjectsResult.count ?? 0 : null,
        projects: (projectsResult.data ?? []).map((project) => ({
          id: project.id,
          name: project.name,
          status: project.status,
          progress: project.progress ?? 0,
          deadline: project.deadline,
        })),
        mediaAssets: mediaAllowed
          ? mediaResult?.objects.filter((object) => !object.key.endsWith("/.keep")).length ?? 0
          : null,
        publishedContent: contentAllowed ? contentResult.count ?? 0 : null,
        actions: actionItems,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, 503);
  }
}
