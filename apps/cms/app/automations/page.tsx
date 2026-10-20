"use client";

import { useCallback, useEffect, useState } from "react";
import { IconActivity, IconCircleCheck, IconClock, IconRefresh, IconX, IconMail } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type Automation = {
  job_name: string;
  schedule: string;
  active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_message: string | null;
  next_run_at: string | null;
};
type AutomationRun = { id: string; trigger: string; status: string; started_at: string; finished_at: string | null; active_low_stock_count: number | null; error_message: string | null };
type AlertSettings = { job_name: string; enabled: boolean; email_alerts_enabled: boolean; recipient_roles: string[]; cooldown_minutes: number; updated_at: string };
type LastEmailAlert = { status: string; recipient: string; created_at: string; sent_at: string | null; last_error: string | null; run_id: string };
type NotificationPreferences = { automation_failure_enabled: boolean; updated_at: string | null };
type WeeklyReport = {
  settings: { enabled: boolean; weekday: number; send_hour_utc: number; recipient_roles: string[]; updated_at: string } | null;
  latestRun: { status: string; scheduled_for: string; started_at: string | null; finished_at: string | null; recipient_count: number; notification_count: number; error_message: string | null } | null;
  expectedRunAt: string | null;
  health: "healthy" | "needs_attention" | "waiting" | "paused";
  healthMessage: string;
};

const weekdayLabel = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const dateLabel = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Not available";

export default function AutomationsPage() {
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [runMessage, setRunMessage] = useState("");
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [lastEmailAlert, setLastEmailAlert] = useState<LastEmailAlert | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [role, setRole] = useState<"admin" | "manager" | "staff" | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/studio/automations/health", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Automation health could not be loaded.");
      setRole(payload.role || null); setAutomation(payload.automation || null); setRuns(payload.runs || []); setLastEmailAlert(payload.lastEmailAlert || null); setWeeklyReport(payload.weeklyReport || null); setLastRefreshedAt(new Date().toISOString());
      const settingsResponse = await fetch("/api/studio/automations/settings", { cache: "no-store" });
      if (settingsResponse.ok) setSettings((await settingsResponse.json()).settings || null);
      const preferencesResponse = await fetch("/api/studio/notifications/preferences", { cache: "no-store" });
      if (preferencesResponse.ok) setPreferences((await preferencesResponse.json()).preferences || null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Automation health could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function runNow() {
    setRunning(true); setRunMessage(""); setError("");
    try {
      const response = await fetch("/api/studio/automations/health", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Automation run failed.");
      setRunMessage(`Manual sync completed. ${payload.activeLowStockCount ?? 0} active low-stock alerts.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Automation run failed.");
    } finally { setRunning(false); }
  }

  async function saveSettings() {
    if (!settings) return;
    setSettingsSaving(true); setSettingsMessage(""); setError("");
    try {
      const response = await fetch("/api/studio/automations/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: settings.enabled, emailAlertsEnabled: settings.email_alerts_enabled, recipientRoles: settings.recipient_roles, cooldownMinutes: settings.cooldown_minutes }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Settings could not be saved.");
      setSettings(payload.settings); setSettingsMessage("Alert settings saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Settings could not be saved."); }
    finally { setSettingsSaving(false); }
  }

  async function sendTestAlert() {
    setSettingsMessage(""); setError("");
    const response = await fetch("/api/studio/automations/settings", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) setError(payload.error || "Test alert failed."); else setSettingsMessage(payload.message || "Test alert sent.");
  }

  async function savePreferences() {
    if (!preferences) return;
    setPreferencesSaving(true); setError(""); setSettingsMessage("");
    try {
      const response = await fetch("/api/studio/notifications/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ automationFailureEnabled: preferences.automation_failure_enabled }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Notification preferences could not be saved.");
      setPreferences(payload.preferences); setSettingsMessage("Your notification preferences were saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Notification preferences could not be saved."); }
    finally { setPreferencesSaving(false); }
  }

  async function simulateFailure() {
    setSettingsMessage(""); setError("");
    const response = await fetch("/api/studio/automations/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "failure" }) });
    const payload = await response.json();
    if (response.status !== 502) setError(payload.error || "Failure simulation did not behave as expected."); else setSettingsMessage(payload.message || "Controlled failure recorded in Email delivery logs.");
  }

  const healthy = automation?.active && automation.last_run_status !== "failed";
  const canRun = role === "admin" || role === "manager";
  const isAdmin = role === "admin";
  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-muted-foreground">System / Automations</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight"><IconActivity className="size-7" />Automation health</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Monitor scheduled jobs that keep your studio operations healthy in the background.</p></div>
      <div className="flex flex-wrap items-center gap-2">{role && <Badge variant="outline" className="capitalize">{role}</Badge>}{canRun && <Button variant="outline" onClick={() => void runNow()} disabled={running || loading}>Run now</Button>}<Button variant="outline" onClick={() => void load()} disabled={loading || running}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button></div>
    </header>
    {runMessage && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{runMessage}</div>}
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    {!error && !automation && !loading && <Card><CardContent className="p-6 text-sm text-muted-foreground">No scheduled automation was found.</CardContent></Card>}
    {automation && <>
      <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><IconActivity className="size-5" />{automation.job_name}</CardTitle><CardDescription className="mt-1">Schedule: {automation.schedule} · Every 15 minutes</CardDescription></div><Badge variant={healthy ? "default" : "destructive"}>{healthy ? <><IconCircleCheck />Healthy</> : <><IconX />Needs attention</>}</Badge></div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Active</p><p className="mt-2 text-lg font-semibold">{automation.active ? "Enabled" : "Paused"}</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Last run</p><p className="mt-2 text-lg font-semibold">{dateLabel(automation.last_run_at)}</p><p className="mt-1 text-xs text-muted-foreground">{automation.last_run_status || "No run recorded"}</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Next run</p><p className="mt-2 flex items-center gap-2 text-lg font-semibold"><IconClock className="size-4" />{dateLabel(automation.next_run_at)}</p></div></CardContent></Card>
      {automation.last_run_message && <Card><CardHeader><CardTitle className="text-base">Last sync result</CardTitle><CardDescription>Output from the most recent scheduled execution.</CardDescription></CardHeader><CardContent><code className="block overflow-x-auto rounded-lg bg-muted p-4 text-xs">{automation.last_run_message}</code></CardContent></Card>}
      {weeklyReport && <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base">Weekly notification report</CardTitle><CardDescription>Supabase queues the report and the production worker delivers the PDF through SMTP.</CardDescription></div><Badge variant={weeklyReport.health === "needs_attention" ? "destructive" : weeklyReport.health === "healthy" ? "default" : "secondary"}>{weeklyReport.health === "needs_attention" ? "Needs attention" : weeklyReport.health === "healthy" ? "Healthy" : weeklyReport.health === "waiting" ? "Waiting" : "Paused"}</Badge></div></CardHeader><CardContent className="space-y-4"><p className={`rounded-lg border px-3 py-2 text-sm ${weeklyReport.health === "needs_attention" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-muted bg-muted/30 text-muted-foreground"}`}>{weeklyReport.healthMessage}</p><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Schedule</p><p className="mt-2 text-sm font-semibold">{weeklyReport.settings ? `${weekdayLabel[weeklyReport.settings.weekday]} · ${String(weeklyReport.settings.send_hour_utc).padStart(2, "0")}:00 UTC` : "Not configured"}</p><p className="mt-1 text-xs text-muted-foreground">Recipients: {weeklyReport.settings?.recipient_roles?.join(", ") || "—"}</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Latest run</p><p className="mt-2 text-lg font-semibold">{weeklyReport.latestRun?.status || "No run yet"}</p><p className="mt-1 text-xs text-muted-foreground">{weeklyReport.latestRun ? dateLabel(weeklyReport.latestRun.finished_at || weeklyReport.latestRun.scheduled_for) : "Waiting for the first scheduled run"}</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Delivery result</p><p className="mt-2 text-sm font-semibold">{weeklyReport.latestRun ? `${weeklyReport.latestRun.recipient_count} recipient · ${weeklyReport.latestRun.notification_count} notification` : "—"}</p><p className={`mt-1 truncate text-xs ${weeklyReport.latestRun?.error_message ? "text-destructive" : "text-muted-foreground"}`}>{weeklyReport.latestRun?.error_message || "No delivery error recorded"}</p></div></div></CardContent></Card>}
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><IconMail className="size-4" />Last email alert</CardTitle><CardDescription>Most recent automation failure notification claim.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Status</p><p className={`mt-2 text-lg font-semibold ${lastEmailAlert?.status === "sent" ? "text-emerald-700" : lastEmailAlert?.status === "failed" ? "text-destructive" : ""}`}>{lastEmailAlert?.status || "No alerts"}</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Recipient</p><p className="mt-2 truncate text-sm font-semibold">{lastEmailAlert?.recipient || "—"}</p><p className="mt-1 text-xs text-muted-foreground">{lastEmailAlert ? dateLabel(lastEmailAlert.sent_at || lastEmailAlert.created_at) : "No failure notification recorded"}</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Details</p><p className="mt-2 truncate text-sm">{lastEmailAlert?.last_error || (lastEmailAlert ? "Delivered through SMTP or waiting for delivery." : "The next automation failure will appear here.")}</p></div></CardContent></Card>
      {preferences && <Card><CardHeader><CardTitle className="text-base">My notification preferences</CardTitle><CardDescription>Choose whether you receive automation failure alerts in-app and by email.</CardDescription></CardHeader><CardContent className="space-y-4"><label className="flex items-center gap-3 text-sm"><Checkbox checked={preferences.automation_failure_enabled} onCheckedChange={(checked) => setPreferences({ ...preferences, automation_failure_enabled: checked === true })} />Automation failure alerts</label><Button onClick={() => void savePreferences()} disabled={preferencesSaving}>{preferencesSaving ? "Saving…" : "Save my preferences"}</Button></CardContent></Card>}
      {settings && isAdmin && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><IconMail className="size-4" />Failure alert settings</CardTitle><CardDescription>Control who receives SMTP alerts when this automation fails.</CardDescription></CardHeader><CardContent className="space-y-5"><label className="flex items-center gap-3 text-sm"><Checkbox checked={settings.enabled} onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked === true })} />Failure monitoring enabled</label><label className="flex items-center gap-3 text-sm"><Checkbox checked={settings.email_alerts_enabled} onCheckedChange={(checked) => setSettings({ ...settings, email_alerts_enabled: checked === true })} />Send failure emails</label><div><p className="mb-2 text-sm font-medium">Recipient roles</p><div className="flex flex-wrap gap-4">{["admin", "manager", "staff"].map((role) => <label key={role} className="flex items-center gap-2 text-sm capitalize"><Checkbox checked={settings.recipient_roles.includes(role)} onCheckedChange={(checked) => setSettings({ ...settings, recipient_roles: checked === true ? [...new Set([...settings.recipient_roles, role])] : settings.recipient_roles.filter((item) => item !== role) })} />{role}</label>)}</div></div><div className="max-w-xs"><label className="text-sm font-medium">Cooldown (minutes)</label><Input className="mt-2" type="number" min={5} max={10080} value={settings.cooldown_minutes} onChange={(event) => setSettings({ ...settings, cooldown_minutes: Number(event.target.value) })} /><p className="mt-1 text-xs text-muted-foreground">Minimum 5 minutes, maximum 7 days.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => void saveSettings()} disabled={settingsSaving}>{settingsSaving ? "Saving…" : "Save settings"}</Button><Button variant="outline" onClick={() => void sendTestAlert()}>Send test alert</Button><Button variant="outline" onClick={() => void simulateFailure()}>Simulate failed alert</Button></div>{settingsMessage && <p role="status" className="text-sm text-emerald-700">{settingsMessage}</p>}</CardContent></Card>}
      <Card><CardHeader><CardTitle className="text-base">Run history</CardTitle><CardDescription>Latest scheduled and manual executions.</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Trigger</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Started</th><th className="px-5 py-3 font-medium">Finished</th><th className="px-5 py-3 font-medium">Alerts</th><th className="px-5 py-3 font-medium">Error</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} className="border-b last:border-0"><td className="px-5 py-4 capitalize">{run.trigger}</td><td className="px-5 py-4"><Badge variant={run.status === "succeeded" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>{run.status}</Badge></td><td className="px-5 py-4 whitespace-nowrap text-xs">{dateLabel(run.started_at)}</td><td className="px-5 py-4 whitespace-nowrap text-xs">{dateLabel(run.finished_at)}</td><td className="px-5 py-4 tabular-nums">{run.active_low_stock_count ?? "—"}</td><td className="max-w-[260px] truncate px-5 py-4 text-xs text-destructive">{run.error_message || "—"}</td></tr>)}</tbody></table>{!runs.length && <div className="p-6 text-sm text-muted-foreground">No automation runs recorded yet.</div>}</div></CardContent></Card>
    </>}
    <p className="text-center text-xs text-muted-foreground">Auto-refreshes every 60 seconds{lastRefreshedAt ? ` · Last checked ${dateLabel(lastRefreshedAt)}` : ""}</p>
  </main>;
}
