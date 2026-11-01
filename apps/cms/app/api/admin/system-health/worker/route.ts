import { buildHealth } from "@/app/api/admin/system-health/route";
import { createServiceClient } from "@/lib/supabase-service";
import { recordHealthSnapshot } from "@/lib/system-health-history";
import { evaluateSystemHealthSla } from "@/lib/system-health-sla";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const configured = [process.env.CRON_SECRET, process.env.WEEKLY_REPORT_WORKER_SECRET].filter(Boolean);
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.headers.get("x-cron-secret") || "";
  return configured.length > 0 && configured.some((secret) => secret === header);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized worker request" }, { status: 401 });
  try {
    const service = await createServiceClient();
    const health = await buildHealth(service, true);
    await recordHealthSnapshot({ supabase: service, health, trigger: "scheduled" });
    const sla = await evaluateSystemHealthSla({ supabase: service });
    return Response.json({ ok: true, overall: health.overall, checkedAt: health.summary.checkedAt, sla });
  } catch (error) {
    console.error("System health worker failed", error);
    return Response.json({ error: "System health worker failed" }, { status: 500 });
  }
}
