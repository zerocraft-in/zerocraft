"use client";

import { useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconBrandChrome, IconDeviceDesktop, IconDeviceMobile, IconDeviceTablet, IconRefresh, IconShieldCheck, IconX } from "@tabler/icons-react";
import { PageHeader, PageShell } from "@/components/commerce/page-header";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@zerocraft/components/ui/dialog";
import { createClient } from "@/utils/supabase/client";

type Session = { id: string; device_label: string; device_type: "desktop" | "mobile" | "tablet" | "unknown"; browser: string; operating_system: string; ip_address: string | null; first_seen_at: string; last_seen_at: string; revoked_at: string | null; isCurrent: boolean };

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });

function DeviceIcon({ type }: { type: Session["device_type"] }) {
  if (type === "mobile") return <IconDeviceMobile className="size-5" />;
  if (type === "tablet") return <IconDeviceTablet className="size-5" />;
  return <IconDeviceDesktop className="size-5" />;
}

function SessionCard({ session, onRevoke }: { session: Session; onRevoke: (session: Session) => void }) {
  return <Card className={`border-border/80 shadow-none ${session.isCurrent ? "border-primary/40 bg-primary/[0.03]" : ""}`}><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${session.isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><DeviceIcon type={session.device_type} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{session.device_label}</p>{session.isCurrent && <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">This device</Badge>}{session.revoked_at && <Badge variant="outline" className="border-destructive/30 text-destructive">Revoked</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{session.browser} · {session.operating_system}{session.ip_address ? ` · ${session.ip_address}` : ""}</p><p className="mt-2 text-xs text-muted-foreground">Last active {dateFormatter.format(new Date(session.last_seen_at))} · First seen {dateFormatter.format(new Date(session.first_seen_at))}</p></div><Button variant={session.isCurrent ? "outline" : "ghost"} size="sm" onClick={() => onRevoke(session)} disabled={Boolean(session.revoked_at)}>{session.isCurrent ? "Sign out" : "Revoke"}</Button></CardContent></Card>;
}

export default function DevicesPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<Session | "others" | null>(null);
  const activeSessions = useMemo(() => sessions.filter((session) => !session.revoked_at), [sessions]);
  const currentSession = sessions.find((session) => session.isCurrent);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/sessions", { cache: "no-store" });
      const payload = await response.json() as { sessions?: Session[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Sessions could not be loaded.");
      setSessions(payload.sessions || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sessions could not be loaded."); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function revoke(target: Session | "others") {
    setConfirmTarget(null); setError(""); setNotice("");
    try {
      const response = target === "others" ? await fetch("/api/admin/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke_others" }) }) : await fetch(`/api/admin/sessions?id=${encodeURIComponent(target.id)}`, { method: "DELETE" });
      const payload = await response.json() as { current?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "Session could not be revoked.");
      if (target !== "others" && payload.current) { await createClient().auth.signOut(); window.location.href = "/login"; return; }
      setNotice(target === "others" ? "All other sessions were signed out." : "Session revoked.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Session could not be revoked."); }
  }

  return <PageShell className="mx-auto w-full max-w-[1080px] pb-14"><PageHeader eyebrow="System / Security" title="Device management" description="Review the browsers signed in to your workspace and revoke access you no longer recognize." actions={<Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button>} />
    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><IconAlertTriangle className="mt-0.5 size-4 shrink-0" />{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}
    <section className="grid gap-3 sm:grid-cols-3"><Card className="border-border/80 shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{activeSessions.length}</p><p className="mt-1 text-xs text-muted-foreground">Active sessions</p></CardContent></Card><Card className="border-border/80 shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{new Set(activeSessions.map((session) => session.device_label)).size}</p><p className="mt-1 text-xs text-muted-foreground">Recognized devices</p></CardContent></Card><Card className="border-border/80 shadow-none"><CardContent className="p-4"><p className="text-2xl font-semibold">{currentSession ? "Protected" : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Current access</p></CardContent></Card></section>
    <Card className="border-border/80 shadow-none"><CardHeader className="border-b border-border/70"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><IconShieldCheck className="size-5 text-primary" />Signed-in devices</CardTitle><CardDescription className="mt-1">Sessions are refreshed whenever this browser opens a protected CMS page.</CardDescription></div><Button variant="outline" size="sm" onClick={() => setConfirmTarget("others")} disabled={activeSessions.length <= 1}>Sign out other sessions</Button></div></CardHeader><CardContent className="space-y-3 p-4">{loading && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Loading secure sessions…</div>}{!loading && !sessions.length && <div className="rounded-xl border border-dashed p-8 text-center"><IconBrandChrome className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No session has been registered yet</p><p className="mt-1 text-xs text-muted-foreground">Refresh this page to create the current browser session.</p></div>}{!loading && sessions.map((session) => <SessionCard key={session.id} session={session} onRevoke={setConfirmTarget} />)}</CardContent></Card>
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground"><IconX className="mt-0.5 size-4 shrink-0" />Revoking a session removes it from the CMS session registry and clears its device cookie. The browser must sign in again before it can create a new session.</div>
    <Dialog open={Boolean(confirmTarget)} onOpenChange={(open) => !open && setConfirmTarget(null)}><DialogContent><DialogHeader><DialogTitle>{confirmTarget === "others" ? "Sign out other sessions?" : confirmTarget?.isCurrent ? "Sign out this device?" : "Revoke this session?"}</DialogTitle><DialogDescription>{confirmTarget === "others" ? "Every other active browser session for your account will be revoked. This browser will stay signed in." : "This browser session will lose CMS access and must sign in again."}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmTarget(null)}>Cancel</Button><Button variant="destructive" onClick={() => confirmTarget && void revoke(confirmTarget)}>Confirm</Button></DialogFooter></DialogContent></Dialog>
  </PageShell>;
}
