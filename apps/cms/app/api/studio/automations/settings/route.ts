import { notifyAutomationFailure } from "@/lib/email/automation-failures";
import { automationFailureEmail } from "@/lib/email/templates";
import { sendTrackedEmail } from "@/lib/email/delivery";
import { requireStudioPermission } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB_NAME = "studio-low-stock-alerts";

export async function GET() {
  const access = await requireStudioPermission("automations.read");
  if (!access.ok) return access.response;
  const { data, error } = await access.supabase.from("studio_automation_settings").select("job_name,enabled,email_alerts_enabled,recipient_roles,cooldown_minutes,updated_at").eq("job_name", JOB_NAME).maybeSingle();
  if (error) return Response.json({ error: "Automation alert settings are unavailable." }, { status: 503 });
  return Response.json({ settings: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const access = await requireStudioPermission("automations.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return Response.json({ error: "Only admins can update automation alert settings." }, { status: 403 });
  let body: { enabled?: boolean; emailAlertsEnabled?: boolean; recipientRoles?: string[]; cooldownMinutes?: number };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid settings payload." }, { status: 400 }); }
  const recipientRoles = (body.recipientRoles || ["admin", "manager"]).filter((role) => ["admin", "manager", "staff"].includes(role));
  const cooldownMinutes = Number(body.cooldownMinutes ?? 60);
  if (!Number.isInteger(cooldownMinutes) || cooldownMinutes < 5 || cooldownMinutes > 10080) return Response.json({ error: "Cooldown must be between 5 minutes and 7 days." }, { status: 400 });
  const { data, error } = await access.supabase.from("studio_automation_settings").upsert({ job_name: JOB_NAME, enabled: body.enabled !== false, email_alerts_enabled: body.emailAlertsEnabled !== false, recipient_roles: recipientRoles.length ? recipientRoles : ["admin"], cooldown_minutes: cooldownMinutes, updated_by: access.user.id, updated_at: new Date().toISOString() }).select("job_name,enabled,email_alerts_enabled,recipient_roles,cooldown_minutes,updated_at").single();
  if (error) return Response.json({ error: "Automation alert settings could not be saved." }, { status: 500 });
  return Response.json({ settings: data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const access = await requireStudioPermission("automations.manage");
  if (!access.ok) return access.response;
  if (access.role !== "admin") return Response.json({ error: "Only admins can send a test alert." }, { status: 403 });
  if (!access.user.email) return Response.json({ error: "Your account has no email address for the test alert." }, { status: 400 });
  let mode = "success";
  try { mode = (await request.json()).mode || "success"; } catch { /* Empty body means a normal test alert. */ }
  if (mode === "failure") {
    try {
      await sendTrackedEmail({
        supabase: access.supabase,
        actorId: access.user.id,
        kind: "automation.failure.test",
        message: automationFailureEmail({ recipient: "invalid-test-recipient", jobName: JOB_NAME, trigger: "failure-test", startedAt: new Date().toISOString(), errorMessage: "Controlled SMTP failure simulation." }),
        metadata: { test: true, simulatedFailure: true },
      });
    } catch {
      return Response.json({ ok: false, message: "Controlled failure recorded in Email delivery logs." }, { status: 502 });
    }
    return Response.json({ error: "The controlled failure unexpectedly succeeded." }, { status: 500 });
  }
  try {
    await sendTrackedEmail({
      supabase: access.supabase,
      actorId: access.user.id,
      kind: "automation.failure.test",
      message: automationFailureEmail({ recipient: access.user.email, jobName: JOB_NAME, trigger: "test", startedAt: new Date().toISOString(), errorMessage: "This is a test alert. No automation failed." }),
      metadata: { test: true },
    });
    return Response.json({ ok: true, message: `Test alert sent to ${access.user.email}.` });
  } catch {
    return Response.json({ error: "Test alert could not be sent. Check Email delivery logs." }, { status: 502 });
  }
}
