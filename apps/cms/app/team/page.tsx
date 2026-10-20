"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconRefresh, IconShieldCheck, IconUsersGroup } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TeamRole = "admin" | "manager" | "staff" | "client";
type Member = { id: string; email: string; full_name: string; avatar_url: string | null; role: TeamRole; created_at: string; updated_at: string | null };

const roleLabels: Record<TeamRole, string> = { admin: "Admin", manager: "Manager", staff: "Staff", client: "No studio access" };
const roleVariants: Record<TeamRole, "default" | "secondary" | "outline"> = { admin: "default", manager: "secondary", staff: "outline", client: "outline" };
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/studio/team", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Team members could not be loaded.");
      setMembers(payload.members || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Team members could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateRole(member: Member, role: TeamRole) {
    if (role === member.role) return;
    setSaving(member.id); setMessage(""); setError("");
    try {
      const response = await fetch("/api/studio/team", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, role }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Role could not be updated.");
      setMembers((current) => current.map((item) => item.id === member.id ? payload.member : item));
      setMessage(`${member.email} is now ${roleLabels[role]}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Role could not be updated."); }
    finally { setSaving(null); }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => !needle || [member.full_name, member.email, member.role].join(" ").toLowerCase().includes(needle));
  }, [members, query]);

  return <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Staff / Access</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight"><IconUsersGroup className="size-7" />Team access</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage Studio roles for existing team accounts. Every role change is recorded in the audit log.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? "animate-spin" : ""} />Refresh</Button></header>
    {message && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{message}</div>}
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Team accounts</p><p className="mt-2 text-3xl font-semibold tabular-nums">{members.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Studio access</p><p className="mt-2 text-3xl font-semibold tabular-nums">{members.filter((member) => member.role !== "client").length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Administrators</p><p className="mt-2 text-3xl font-semibold tabular-nums">{members.filter((member) => member.role === "admin").length}</p></CardContent></Card></div>
    <Card><CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><IconShieldCheck className="size-5" />Role directory</CardTitle><CardDescription className="mt-1">Only administrators can change access levels.</CardDescription></div><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people or email" className="w-full sm:w-72" /></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Member</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Joined</th><th className="px-5 py-3 text-right font-medium">Change access</th></tr></thead><tbody>{visible.map((member) => <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-5 py-4"><strong className="block">{member.full_name || "Unnamed member"}</strong><span className="text-xs text-muted-foreground">{member.email}</span></td><td className="px-5 py-4"><Badge variant={roleVariants[member.role]}>{roleLabels[member.role]}</Badge></td><td className="px-5 py-4 text-xs text-muted-foreground">{dateLabel(member.created_at)}</td><td className="px-5 py-4 text-right"><select aria-label={`Change role for ${member.email}`} value={member.role} disabled={saving === member.id} onChange={(event) => void updateRole(member, event.target.value as TeamRole)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"><option value="admin">Admin</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="client">No studio access</option></select></td></tr>)}</tbody></table>{loading && <div className="p-6 text-sm text-muted-foreground">Loading team members…</div>}{!loading && !visible.length && <div className="grid min-h-48 place-items-center p-6 text-sm text-muted-foreground">No matching team members.</div>}</div></CardContent></Card>
  </main>;
}
