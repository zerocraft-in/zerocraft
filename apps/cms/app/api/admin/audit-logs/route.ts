import { requireCommercePermission } from "@/lib/commerce-auth";
import { isSameOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const access = await requireCommercePermission("audit.read");
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 25)));
  const action = url.searchParams.get("action")?.trim() || "";
  const entityType = url.searchParams.get("entityType")?.trim() || "";
  const from = (page - 1) * pageSize;
  let query = access.supabase
    .from("audit_logs")
    .select("id,actor_id,action,entity_type,entity_id,metadata,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (action) query = query.eq("action", action);
  if (entityType) query = query.eq("entity_type", entityType);
  const { data, count, error } = await query;
  if (error) return errorResponse("Audit logs are unavailable or the migration is not deployed.", 503);
  return Response.json({ logs: data || [], page, pageSize, total: count || 0 }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Invalid request origin.", 403);
  const access = await requireCommercePermission("audit.write");
  if (!access.ok) return access.response;
  let body: { action?: unknown; entityType?: unknown; entityId?: unknown; metadata?: unknown };
  try { body = await request.json(); } catch { return errorResponse("Invalid audit log request."); }
  const action = typeof body.action === "string" ? body.action.trim() : "";
  const entityType = typeof body.entityType === "string" ? body.entityType.trim() : "";
  const entityId = typeof body.entityId === "string" && body.entityId ? body.entityId : null;
  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};
  if (!/^[a-z0-9_.:-]{2,80}$/i.test(action) || !/^[a-z0-9_.:-]{2,80}$/i.test(entityType)) return errorResponse("Audit action and entity type are required.");
  const { data, error } = await access.supabase.from("audit_logs").insert({ actor_id: access.user.id, action, entity_type: entityType, entity_id: entityId, metadata }).select("id,actor_id,action,entity_type,entity_id,metadata,created_at").single();
  if (error) return errorResponse("The audit event could not be recorded.", 400);
  return Response.json({ log: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
