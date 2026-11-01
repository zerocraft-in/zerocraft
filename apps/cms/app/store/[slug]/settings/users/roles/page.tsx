"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconArrowLeft, IconDownload, IconPlus, IconSearch, IconArrowsSort } from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent } from "@zerocraft/components/ui/card";
import { Input } from "@zerocraft/components/ui/input";
import { PageState } from "@/components/commerce/page-state";

type Member = { role: "admin" | "manager" | "staff" | "client" };
type RoleRow = { name: string; key: Member["role"]; category: string; description: string; users: number; system: boolean };

const ROLE_META: Record<Member["role"], Omit<RoleRow, "key" | "users">> = {
  admin: { name: "Administrator", category: "Organization", description: "Full access to settings, users, permissions, and operations.", system: true },
  manager: { name: "Store manager", category: "Store", description: "Manage day-to-day store and studio operations.", system: true },
  staff: { name: "Staff", category: "Store", description: "Work with assigned Commerce and Store features.", system: true },
  client: { name: "No studio access", category: "Organization", description: "Account exists without CMS access.", system: true },
};

function downloadCsv(rows: RoleRow[]) {
  const csv = ["Name,Category,Users", ...rows.map((row) => [row.name, row.category, row.users].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "zerocraft-roles.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function RolesPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/team", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Roles could not be loaded.");
      setMembers(payload.members || []);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Roles could not be loaded.")).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => (Object.keys(ROLE_META) as Member["role"][]).map((key) => ({ key, ...ROLE_META[key], users: members.filter((member) => member.role === key).length })).filter((row) => !query.trim() || `${row.name} ${row.category}`.toLowerCase().includes(query.trim().toLowerCase())), [members, query]);

  return <main className="mx-auto flex w-full max-w-[920px] flex-col gap-7 pb-20">
    <header className="flex items-start justify-between gap-4 border-b border-border/70 pb-6">
      <div className="flex items-start gap-3"><Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/settings/users" />}><IconArrowLeft /></Button><div><p className="text-xs text-muted-foreground">Users</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Roles</h1><p className="mt-1 text-sm text-muted-foreground">Configure the access levels available to your users.</p></div></div>
      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => downloadCsv(rows)}><IconDownload />Export</Button><Button size="sm" disabled title="Custom roles require a dedicated role definition in the current RBAC model"><IconPlus />Add role</Button></div>
    </header>
    {error && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
    <section className="space-y-3"><div className="flex items-center justify-between gap-3"><Badge variant="secondary">All</Badge><div className="flex gap-2"><div className="relative"><IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles" className="w-56 pl-9" /></div><Button variant="outline" size="icon" aria-label="Sort roles"><IconArrowsSort /></Button></div></div>
      <Card className="overflow-hidden border-border/80 shadow-none"><CardContent className="p-0">{loading ? <PageState kind="loading" title="Loading roles…" /> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border/70 bg-muted/25 text-xs text-muted-foreground"><tr><th className="w-12 px-5 py-3"><input type="checkbox" aria-label="Select all roles" /></th><th className="px-3 py-3 font-medium">Name</th><th className="px-3 py-3 font-medium">Category</th><th className="px-5 py-3 text-right font-medium">Users</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key} className="border-b border-border/60 last:border-0 hover:bg-muted/25"><td className="px-5 py-3"><input type="checkbox" aria-label={`Select ${row.name}`} disabled={row.system} /></td><td className="px-3 py-3"><p className="font-medium">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">{row.description}</p></td><td className="px-3 py-3 text-muted-foreground">{row.category}</td><td className="px-5 py-3 text-right">{row.users}</td></tr>)}{!rows.length && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">No roles match your search.</td></tr>}</tbody></table></div>}</CardContent></Card>
      <p className="text-xs text-muted-foreground">System roles are backed by the active RBAC configuration. User-specific permission overrides remain available from a user profile.</p>
    </section>
  </main>;
}
