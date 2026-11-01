import { requireCommercePermission } from "@/lib/commerce-auth";
import { analyticsRealtimeReport, AnalyticsError } from "@/lib/analytics/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireCommercePermission("reports.read"); if (!access.ok) return access.response;
  try { return Response.json(await analyticsRealtimeReport(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { const typed = error instanceof AnalyticsError ? error : new AnalyticsError("Google Analytics realtime data is unavailable.", 503, "realtime_unavailable"); return Response.json({ connected: false, error: typed.message, code: typed.code }, { status: typed.status, headers: { "Cache-Control": "private, no-store" } }); }
}
