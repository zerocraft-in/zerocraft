import { NextResponse } from "next/server";
import { apiError, requireStudioAccess } from "@/lib/studio-api";

export const dynamic = "force-dynamic";

const leadStages = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const projectStages = ["planning", "active", "review", "completed", "on_hold", "cancelled"] as const;
const periods = { "3m": 3, "6m": 6, "12m": 12 } as const;

type Period = keyof typeof periods;
type PublishedContentRow = {
  id: string;
  title: string;
  content_type: string | null;
  published_at: string | null;
};

function isPeriod(value: string | null): value is Period {
  return value !== null && Object.hasOwn(periods, value);
}

function periodStart(months: number) {
  const date = new Date();
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString();
}

function contentTypeUnavailable(error: { code?: string; message?: string }) {
  return (
    (error.code === "42703" || error.code === "PGRST204" ||
      /schema cache|column .* does not exist/i.test(error.message ?? "")) &&
    /content_type/i.test(error.message ?? "")
  );
}

export async function GET(request: Request) {
  const access = await requireStudioAccess("analytics.read");
  if ("response" in access) return access.response;

  const requestedPeriod = new URL(request.url).searchParams.get("period") ?? "3m";
  if (!isPeriod(requestedPeriod)) {
    return NextResponse.json({ error: "Period must be 3m, 6m, or 12m." }, { status: 400 });
  }

  const permissionNames = ["leads.read", "projects.read", "content.read"] as const;
  const permissionResults = await Promise.all(
    permissionNames.map((permission) =>
      access.supabase.rpc("has_permission", { p_permission: permission }),
    ),
  );
  const permissionError = permissionResults.find((result) => result.error)?.error;
  if (permissionError) return apiError(permissionError, 503);

  const [leadsAllowed, projectsAllowed, contentAllowed] = permissionResults.map(
    (result) => result.data === true,
  );
  const startsAt = periodStart(periods[requestedPeriod]);

  try {
    const [leadCounts, projectCounts, initialContentResult] = await Promise.all([
      leadsAllowed
        ? Promise.all(
            leadStages.map(async (stage) => {
              const { count, error } = await access.supabase
                .from("leads")
                .select("id", { count: "exact", head: true })
                .eq("stage", stage)
                .gte("created_at", startsAt);
              return { stage, count: count ?? 0, error };
            }),
          )
        : Promise.resolve(null),
      projectsAllowed
        ? Promise.all(
            projectStages.map(async (stage) => {
              const { count, error } = await access.supabase
                .from("projects")
                .select("id", { count: "exact", head: true })
                .eq("status", stage);
              return { stage, count: count ?? 0, error };
            }),
          )
        : Promise.resolve(null),
      contentAllowed
        ? access.supabase
            .from("pages")
            .select("id,title,content_type,published_at", { count: "exact" })
            .eq("status", "published")
            .gte("published_at", startsAt)
            .order("published_at", { ascending: false })
            .limit(8)
        : Promise.resolve({ data: null, count: null, error: null }),
    ]);

    let contentResult: {
      data: PublishedContentRow[] | null;
      count: number | null;
      error: typeof initialContentResult.error;
    } = {
      data: initialContentResult.data?.map((item) => ({
        id: item.id,
        title: item.title,
        content_type: item.content_type ?? null,
        published_at: item.published_at,
      })) ?? null,
      count: initialContentResult.count,
      error: initialContentResult.error,
    };
    if (contentAllowed && contentResult.error && contentTypeUnavailable(contentResult.error)) {
      const legacyContent = await access.supabase
        .from("pages")
        .select("id,title,published_at", { count: "exact" })
        .eq("status", "published")
        .gte("published_at", startsAt)
        .order("published_at", { ascending: false })
        .limit(8);
      contentResult = {
        ...legacyContent,
        data: legacyContent.data?.map((item) => ({ ...item, content_type: "page" })) ?? null,
      };
    }

    const queryError =
      leadCounts?.find((result) => result.error)?.error ??
      projectCounts?.find((result) => result.error)?.error ??
      contentResult.error;
    if (queryError) return apiError(queryError, 503);

    const leads = leadCounts
      ? Object.fromEntries(leadCounts.map(({ stage, count }) => [stage, count]))
      : null;
    const projects = projectCounts
      ? Object.fromEntries(projectCounts.map(({ stage, count }) => [stage, count]))
      : null;
    const totalLeads = leadCounts?.reduce((total, result) => total + result.count, 0) ?? 0;
    const qualifiedLeads = leadCounts
      ?.filter(({ stage }) => stage === "qualified" || stage === "proposal" || stage === "won")
      .reduce((total, result) => total + result.count, 0) ?? 0;
    const openLeads = leadCounts
      ?.filter(({ stage }) => stage !== "won" && stage !== "lost")
      .reduce((total, result) => total + result.count, 0) ?? 0;

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        period: requestedPeriod,
        startsAt,
        permissions: {
          leads: leadsAllowed,
          projects: projectsAllowed,
          content: contentAllowed,
        },
        leads: leads ? {
          total: totalLeads,
          stages: leads,
          qualified: qualifiedLeads,
          open: openLeads,
          qualificationRate: totalLeads ? Math.round((qualifiedLeads / totalLeads) * 100) : null,
        } : null,
        projects: projects ? {
          total: Object.values(projects).reduce((total, count) => total + count, 0),
          active: projects.active,
          stages: projects,
        } : null,
        content: contentAllowed ? {
          published: contentResult.count ?? 0,
          recentPublished: contentResult.data ?? [],
        } : null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, 503);
  }
}
