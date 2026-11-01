"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconDownload, IconFilter, IconPlus, IconSearch, IconUpload, IconUsers } from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent } from "@zerocraft/components/ui/card";
import { Input } from "@zerocraft/components/ui/input";
import { PageState } from "@/components/commerce/page-state";
import { formatDate, roleLabels, type UserRole, type UserMember } from "./user-types";

function statusBadge(active: boolean) {
  return <Badge variant="outline" className={active ? "border-emerald-500/35 text-emerald-700 dark:text-emerald-300" : "border-amber-500/35 text-amber-700 dark:text-amber-300"}><span className={`mr-1.5 inline-block size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`} />{active ? "Active" : "Suspended"}</Badge>;
}

function downloadCsv(members: UserMember[]) {
  const rows = [["Name", "Email", "Status", "Role", "Created"], ...members.map((member) => [member.full_name, member.email, member.is_active ? "Active" : "Suspended", roleLabels[member.role], member.created_at])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "zerocraft-users.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function UsersWorkspace() {
  const [members, setMembers] = useState<UserMember[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/team", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Users could not be loaded.");
      setMembers(payload.members || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Users could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function importUsers(file: File) {
    setMessage("");
    setError("");
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { setError("CSV must include a header row and at least one user."); return; }
    const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
    const emailIndex = headers.indexOf("email");
    const nameIndex = headers.indexOf("name") >= 0 ? headers.indexOf("name") : headers.indexOf("full_name");
    const roleIndex = headers.indexOf("role");
    if (emailIndex < 0) { setError("CSV must include an email column."); return; }
    let imported = 0;
    const failures: string[] = [];
    for (const line of lines.slice(1)) {
      const columns = line.split(",").map((item) => item.trim().replace(/^"|"$/g, ""));
      const email = columns[emailIndex] || "";
      const fullName = columns[nameIndex] || "";
      const selectedRole = columns[roleIndex] && ["admin", "manager", "staff"].includes(columns[roleIndex]) ? columns[roleIndex] : "staff";
      const response = await fetch("/api/admin/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, fullName, role: selectedRole }) });
      if (response.ok) imported += 1; else failures.push(email || "unknown email");
    }
    await load();
    setMessage(`${imported} invitation${imported === 1 ? "" : "s"} imported${failures.length ? `; ${failures.length} failed` : ""}.`);
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => (role === "all" || member.role === role) && (!needle || [member.full_name, member.email, member.role].join(" ").toLowerCase().includes(needle)));
  }, [members, query, role]);

  return <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 pb-20">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-6">
      <div className="flex items-start gap-3"><span className="mt-0.5 grid size-9 place-items-center rounded-lg border border-border bg-muted/50"><IconUsers className="size-4 text-muted-foreground" /></span><div><p className="text-xs text-muted-foreground">Settings</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Users</h1><p className="mt-1 text-sm text-muted-foreground">Manage users, access, and roles for your store.</p></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => downloadCsv(members)}><IconDownload />Export</Button><Button variant="outline" size="sm" onClick={() => importInput.current?.click()}><IconUpload />Import</Button><input ref={importInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importUsers(file); event.currentTarget.value = ""; }} /><Button size="sm" nativeButton={false} render={<Link href="/settings/users/new" />}><IconPlus />Add users</Button></div>
    </header>
    {message && <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
    {error && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
    <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-[15px] font-semibold">Users</h2><p className="mt-1 text-xs text-muted-foreground">Review active users and their current access level.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" className="w-52 pl-9" /></div><Button variant="outline" size="sm" onClick={() => setRole(role === "all" ? "staff" : "all")}><IconFilter />{role === "all" ? "Filter" : roleLabels[role]}</Button></div></div>
      <Card className="overflow-hidden border-border/80 shadow-none"><CardContent className="p-0">{loading ? <PageState kind="loading" title="Loading users…" /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border/70 bg-muted/25 text-xs text-muted-foreground"><tr><th className="w-12 px-5 py-3"><input type="checkbox" aria-label="Select all users" /></th><th className="px-3 py-3 font-medium">User</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Security</th><th className="px-3 py-3 font-medium">Role</th><th className="px-5 py-3 text-right font-medium">Created</th></tr></thead><tbody>{visible.map((member) => <tr key={member.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25"><td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${member.full_name}`} /></td><td className="px-3 py-4"><Link href={`/settings/users/${member.id}`} className="font-medium hover:underline">{member.full_name || member.email}</Link><p className="mt-1 text-xs text-muted-foreground">{member.email}</p></td><td className="px-3 py-4">{statusBadge(member.is_active)}</td><td className="px-3 py-4"><span className="text-xs text-amber-700 dark:text-amber-300">Secure sign-in method is not required</span></td><td className="px-3 py-4"><Badge variant="outline">{roleLabels[member.role]}</Badge></td><td className="px-5 py-4 text-right text-xs text-muted-foreground">{formatDate(member.created_at)}</td></tr>)}{!visible.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No users match this filter.</td></tr>}</tbody></table></div>}</CardContent></Card>
      <p className="text-xs text-muted-foreground">Showing {visible.length} of {members.length} users. <Link href="/settings/users/roles" className="underline underline-offset-2">Manage roles and permission overrides</Link>.</p>
    </section>
  </main>;
}
