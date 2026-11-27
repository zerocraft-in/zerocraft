import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  requireOrganization,
  NO_ACTIVE_MEMBERSHIP_ERROR,
  type SessionContext,
} from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zerocraft/ui/card";

import { DataTable } from "./data-table";
import { type AuditLogRow } from "./columns";
import { AuditLogFiltersBar } from "./audit-log-filters-bar";
import { AuditLogPagination } from "./audit-log-pagination";
import {
  buildAuditLogsHref,
  parseAuditLogFilters,
  type AuditLogFilters,
} from "./audit-log-filters";

const PAGE_SIZE = 25;

// Hard upper bound for the `page` query parameter. Together with PAGE_SIZE it
// keeps the PostgREST offset inside a safe integer range.
const MAX_PAGE = 10_000;

const AUDIT_LOG_COLUMNS =
  "id, organization_id, actor_user_id, action, entity_type, entity_id, metadata, created_at";

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Parses the `page` query parameter strictly.
 *
 * Only a single value made of ASCII digits is accepted, starting at 1. Query
 * arrays (`?page=1&page=2`), signs, whitespace, decimals, leading zeros and
 * values above MAX_PAGE all fall back to page 1 instead of reaching PostgREST.
 */
function parsePageParam(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) {
    return 1;
  }

  const page = Number(value);
  if (!Number.isSafeInteger(page) || page > MAX_PAGE) {
    return 1;
  }

  return page;
}

/**
 * Resolves the verified session context for the active organization.
 *
 * Only the "no active membership" case is turned into a redirect to
 * onboarding. Authentication and database failures are re-thrown so they are
 * never masked as a missing membership.
 */
async function requireOrganizationOrRedirect(): Promise<SessionContext> {
  try {
    return await requireOrganization();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === NO_ACTIVE_MEMBERSHIP_ERROR
    ) {
      redirect("/onboarding");
    }
    throw error;
  }
}

async function fetchAuditLogs(
  supabase: SupabaseClient,
  organizationId: string,
  page: number,
  filters: AuditLogFilters,
): Promise<{
  logs: AuditLogRow[];
  totalCount: number;
}> {
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("audit_logs")
    .select(AUDIT_LOG_COLUMNS, { count: "exact" })
    .eq("organization_id", organizationId);

  if (filters.query) {
    const term = `%${filters.query}%`;
    query = query.or(`action.ilike.${term},entity_type.ilike.${term}`);
  }

  if (filters.entity !== "all") {
    query = query.eq("entity_type", filters.entity);
  }

  if (filters.sort === "oldest") {
    query = query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
  } else {
    query = query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }

  const { data, error, count } = await query.range(
    offset,
    offset + PAGE_SIZE - 1,
  );

  if (error) throw error;

  return {
    logs: (data ?? []) as unknown as AuditLogRow[],
    totalCount: count ?? 0,
  };
}

async function fetchActorNames(
  supabase: SupabaseClient,
  actorIds: string[],
): Promise<Map<string, string | null>> {
  const names = new Map<string, string | null>();
  const uniqueIds = Array.from(new Set(actorIds.filter((id) => Boolean(id))));
  if (uniqueIds.length === 0) return names;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueIds);

  if (error) {
    console.error("Actor profile lookup failed.", {
      code: error.code,
      message: error.message,
    });
    return names;
  }

  const rows = (data ?? []) as unknown as ProfileRow[];
  for (const row of rows) {
    names.set(row.id, row.full_name ?? null);
  }

  return names;
}

/**
 * Returns the organization's IANA timezone when it is readable and valid.
 *
 * The page is still usable without it, so any failure (RLS, network, invalid
 * stored value) logs and returns undefined rather than failing the request.
 */
async function fetchOrganizationTimeZone(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("organizations")
    .select("timezone")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("Organization timezone lookup failed.", {
      code: error.code,
      message: error.message,
    });
    return undefined;
  }

  const timezone = (data as { timezone?: unknown } | null)?.timezone;
  if (typeof timezone !== "string" || timezone.trim() === "") {
    return undefined;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return timezone;
  } catch {
    return undefined;
  }
}

export default async function AuditLogsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const filters = parseAuditLogFilters(params);

  const context = await requireOrganizationOrRedirect();

  const organizationId = context.activeOrganization?.id;
  if (!organizationId) {
    redirect("/onboarding");
  }

  if (!context.permissions.has("audit_logs.view")) {
    redirect("/overview");
  }

  const supabase: SupabaseClient = await createServerSupabaseClient();

  let logs: AuditLogRow[] = [];
  let totalCount = 0;
  let timeZone: string | undefined;
  let errorMessage: string | null = null;

  try {
    const [result, organizationTimeZone] = await Promise.all([
      fetchAuditLogs(supabase, organizationId, page, filters),
      fetchOrganizationTimeZone(supabase, organizationId),
    ]);
    logs = result.logs;
    totalCount = result.totalCount;
    timeZone = organizationTimeZone;
  } catch (error) {
    const err = error as { code?: string; message?: string } | undefined;
    console.error("Audit logs load failed.", {
      code: err?.code,
      message: err?.message ?? String(error),
    });
    errorMessage = "Unable to load audit logs. Please try again.";
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Keep out-of-range URLs (for example after narrowing a filter) useful by
  // redirecting to the last page that actually exists.
  if (!errorMessage && page > totalPages) {
    redirect(buildAuditLogsHref(totalPages, filters));
  }

  const actorIds = logs
    .map((row) => row.actor_user_id)
    .filter((id): id is string => Boolean(id));
  const actorNamesMap = await fetchActorNames(supabase, actorIds);

  const displayRows = logs.map((row) => {
    const actorName = !row.actor_user_id
      ? "System"
      : (actorNamesMap.get(row.actor_user_id) ?? "Unknown user");
    return {
      ...row,
      actor_name: actorName,
      actor_initial: (actorName.charAt(0) || "?").toUpperCase(),
    };
  });

  const actorNames = Object.fromEntries(actorNamesMap);

  const narrowingFiltersActive =
    filters.query !== "" || filters.entity !== "all";

  const countLabel =
    totalCount === 0
      ? narrowingFiltersActive
        ? "No matching events"
        : "No events"
      : `${totalCount} ${totalCount === 1 ? "event" : "events"}`;
  const descriptionParts = [countLabel, `Page ${page} of ${totalPages}`];
  if (timeZone) {
    descriptionParts.push(`Times in ${timeZone}`);
  }

  const emptyState = narrowingFiltersActive
    ? "No audit log events match these filters."
    : page > 1
      ? "No audit log entries on this page."
      : "No audit log entries yet.";

  return (
    <div className="mx-auto flex flex-col px-5 py-6 sm:px-8 sm:py-10">
      {errorMessage ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-body">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gap-4 border-b">
            <div className="min-w-0">
              <CardTitle>Activity</CardTitle>
              <CardDescription>{descriptionParts.join(" · ")}</CardDescription>
            </div>

            <AuditLogFiltersBar key={filters.query} filters={filters} />
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <DataTable
                data={displayRows}
                timeZone={timeZone}
                actorNames={actorNames}
                enableSorting={false}
                emptyState={emptyState}
              />
            </div>
          </CardContent>

          <AuditLogPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            filters={filters}
          />
        </Card>
      )}
    </div>
  );
}
