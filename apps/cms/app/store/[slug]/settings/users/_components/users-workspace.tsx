"use client";

import { UsersPageHeader } from "./users-page-header";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconDownload, IconFilter, IconPlus, IconSearch, IconUpload, IconUsers, IconShieldOff } from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent } from "@zerocraft/components/ui/card";
import { Input } from "@zerocraft/components/ui/input";
import { PageState } from "@/components/commerce/page-state";
import { formatDate, roleLabels, type UserRole, type UserMember } from "./user-types";

function statusBadge(active: boolean) {
  return <Badge variant="secondary" className={active ? "rounded-md bg-lime-200 px-1.5 py-0 text-xs font-normal text-green-950" : "rounded-md bg-amber-100 px-1.5 py-0 text-xs font-normal text-amber-900"}>{active ? "Active" : "Suspended"}</Badge>;
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
  const [searchOpen, setSearchOpen] = useState(false);
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
    <UsersPageHeader title="Users" actions={<><Button variant="outline" size="sm" onClick={() => downloadCsv(members)}><IconDownload />Export</Button><Button variant="outline" size="sm" onClick={() => importInput.current?.click()}><IconUpload />Import</Button><input ref={importInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importUsers(file); event.currentTarget.value = ""; }} /><Button size="sm" nativeButton={false} render={<Link href="/settings/users/new" />}><IconPlus />Add users</Button></>} />
    {message && <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
    {error && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
    <section className="users-list-section space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="icon" aria-label="Search and filter users" onClick={() => setSearchOpen(open => !open)}><IconSearch size={15} /></Button>
        {searchOpen && <><Input aria-label="Search users" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search users" className="h-8 w-48" /><Button variant="outline" size="sm" onClick={() => setRole(role === "all" ? "staff" : "all")}><IconFilter />{role === "all" ? "Filter" : roleLabels[role]}</Button></>}
      </div>
      <Card className="overflow-hidden border-border/80 shadow-none"><CardContent className="p-0">{loading ? <PageState kind="loading" title="Loading users…" /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border/70 bg-muted/25 text-xs text-muted-foreground"><tr><th className="w-12 px-5 py-3"><input type="checkbox" aria-label="Select all users" /></th><th className="px-3 py-3 font-medium">User</th><th className="px-3 py-3 font-medium">Status</th><th className="w-9 px-2 py-3"><span className="sr-only">Security</span></th><th className="px-3 py-3 font-medium">Role</th></tr></thead><tbody>{visible.map((member) => <tr key={member.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25"><td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${member.full_name}`} /></td><td className="px-3 py-4"><Link href={`/settings/users/${member.id}`} className="font-medium hover:underline">{member.full_name || member.email}</Link></td><td className="px-3 py-4">{statusBadge(member.is_active)}</td><td className="px-3 py-4"><span title="Secure sign-in method is not required" aria-label="Secure sign-in method is not required" className="text-red-600"><IconShieldOff size={15} /></span></td><td className="px-3 py-4">{roleLabels[member.role]}</td></tr>)}{!visible.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">No users match this filter.</td></tr>}</tbody></table></div>}</CardContent></Card>
      <p className="users-help"><Link href="/docs">Learn more about users</Link></p>
    </section>
  </main>;
}
