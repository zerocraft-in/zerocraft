import { requireCommercePermission } from "@/lib/commerce-auth";
import { loadHealthHistory } from "@/lib/system-health-history";
import { renderSystemHealthPdf } from "@/lib/system-health-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireCommercePermission("system_health.read");
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";
  const days = Number(url.searchParams.get("days") || 7);
  const history = await loadHealthHistory(access.supabase, Number.isFinite(days) ? days : 7);
  if (format === "csv") {
    const rows = ["type,created_at,status,severity,component,message,trigger,resolved_at", ...history.runs.map((row: any) => `run,${row.created_at},${row.overall},,,,${row.trigger},`), ...history.incidents.map((row: any) => `incident,${row.created_at},${row.status},${row.severity},${JSON.stringify(row.component)},${JSON.stringify(row.latest_message)},,${row.resolved_at || ""}`)];
    return new Response(rows.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="zerocraft-system-health.csv"' } });
  }
  if (format === "pdf") {
    const pdf = await renderSystemHealthPdf(history.runs, history.incidents, `${Math.min(Math.max(days, 1), 90)} day reliability report`);
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="zerocraft-system-health.pdf"' } });
  }
  return Response.json(history, { headers: { "Cache-Control": "private, no-store" } });
}
