"use client";

import { useEffect, useState } from "react";
import { supabase, type Profile, type UserRole } from "@/lib/supabase-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconChevronLeft, IconChevronRight, IconSearch } from "@tabler/icons-react";

const roles: UserRole[] = ["client", "staff", "manager", "admin"];

export default function StaffPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleTab, setRoleTab] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState<UserRole | "">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setLoading(false); setError("Your session expired. Sign in again to view staff."); } return; }
      const { data: ownProfile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const { data, error: readError } = await supabase.from("profiles").select("id,email,full_name,role,created_at").order("created_at", { ascending: false });
      if (!active) return;
      setCurrentId(user.id);
      setCanManage(ownProfile?.role === "admin");
      setProfiles((data || []) as Profile[]);
      setError(readError ? "Staff profiles could not be loaded. Apply the admin MVP migration and verify your role." : null);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function changeRole(profile: Profile, role: UserRole) {
    if (!canManage || profile.id === currentId || profile.role === role) return;
    setBusy(profile.id);
    const { error: updateError } = await supabase.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", profile.id).select("id").single();
    if (updateError) setError("Role change failed. Only an admin can change studio access.");
    else { setError(null); setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, role } : item)); }
    setBusy(null);
  }

  const filteredProfiles = profiles.filter((profile) => {
    const matchesRole = roleTab === "all" || profile.role === roleTab;
    const text = `${profile.full_name ?? ""} ${profile.email ?? ""} ${profile.role}`.toLowerCase();
    return matchesRole && text.includes(query.trim().toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / Number(pageSize)));
  const page = Math.min(currentPage, totalPages);
  const pageProfiles = filteredProfiles.slice((page - 1) * Number(pageSize), page * Number(pageSize));
  const selectableRows = pageProfiles.filter((profile) => canManage && profile.id !== currentId);
  const pageSelected = selectableRows.length > 0 && selectableRows.every((profile) => selected.includes(profile.id));

  async function updateSelectedRole() {
    if (!canManage || !bulkRole || selected.length === 0) return;
    setBusy("bulk");
    const targets = profiles.filter((profile) => selected.includes(profile.id) && profile.id !== currentId);
    const results = await Promise.all(targets.map((profile) => supabase.from("profiles").update({ role: bulkRole, updated_at: new Date().toISOString() }).eq("id", profile.id)));
    if (results.some((result) => result.error)) setError("Some selected roles could not be changed. Please review their access and try again.");
    else {
      setError(null);
      setProfiles((current) => current.map((profile) => targets.some((target) => target.id === profile.id) ? { ...profile, role: bulkRole } : profile));
      setSelected([]);
      setBulkRole("");
    }
    setBusy(null);
  }

  return <main className="mx-auto w-full max-w-screen-xl space-y-6 pb-12">
    <header><p className="text-sm font-medium text-muted-foreground">Studio / Access</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Staff</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Assign roles to registered users. New accounts begin as clients and cannot access the studio until promoted. Authentication invitations are managed in Supabase Auth.</p></header>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Card><CardHeader className="border-b"><CardTitle>Team members</CardTitle><CardDescription>Manage the access level for each registered account.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={roleTab} onValueChange={(value) => { setRoleTab(value); setCurrentPage(1); setSelected([]); }}><TabsList className="w-full justify-start overflow-x-auto xl:w-fit"><TabsTrigger value="all">Everyone <span className="ml-1 text-xs text-muted-foreground">{profiles.length}</span></TabsTrigger>{roles.map((role) => <TabsTrigger key={role} value={role} className="capitalize">{role}</TabsTrigger>)}</TabsList></Tabs>
        <div className="relative w-full xl:max-w-sm"><IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search team members" placeholder="Search name, email, or role" value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} className="pl-9" /></div>
      </div>
      {selected.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3"><span className="mr-auto text-sm font-medium">{selected.length} selected</span><Select value={bulkRole} onValueChange={(value) => setBulkRole((value ?? "") as UserRole | "")}><SelectTrigger className="w-40" aria-label="Choose role for selected members"><SelectValue>{bulkRole ? `Set ${bulkRole}` : "Change role to…"}</SelectValue></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>)}</SelectContent></Select><Button size="sm" onClick={() => void updateSelectedRole()} disabled={!canManage || !bulkRole || busy === "bulk"}>Apply</Button><Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button></div>}
      {loading ? <p role="status" className="p-6 text-sm text-muted-foreground">Loading profiles…</p> : filteredProfiles.length ? <><div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-10"><Checkbox aria-label="Select team members on this page" checked={pageSelected} disabled={!canManage || selectableRows.length === 0} onCheckedChange={(checked) => setSelected((current) => checked === true ? [...new Set([...current, ...selectableRows.map((profile) => profile.id)])] : current.filter((id) => !selectableRows.some((profile) => profile.id === id)))}/></TableHead><TableHead>Person</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead></TableRow></TableHeader><TableBody>{pageProfiles.map((profile) => <TableRow key={profile.id} data-state={selected.includes(profile.id) ? "selected" : undefined}><TableCell><Checkbox aria-label={`Select ${profile.full_name || profile.email}`} checked={selected.includes(profile.id)} disabled={!canManage || profile.id === currentId} onCheckedChange={(checked) => setSelected((current) => checked === true ? [...new Set([...current, profile.id])] : current.filter((id) => id !== profile.id))} /></TableCell><TableCell className="font-medium">{profile.full_name || "Unnamed user"}{profile.id === currentId ? " (you)" : ""}</TableCell><TableCell className="text-muted-foreground">{profile.email}</TableCell><TableCell><Select value={profile.role} disabled={!canManage || busy === profile.id || profile.id === currentId} onValueChange={(value) => value && void changeRole(profile, value as UserRole)}><SelectTrigger aria-label={`Role for ${profile.full_name || profile.email}`} className="w-36 capitalize"><SelectValue /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>)}</TableBody></Table></div>
        <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">{selected.length} selected · {filteredProfiles.length ? `${(page - 1) * Number(pageSize) + 1}–${Math.min(page * Number(pageSize), filteredProfiles.length)} of ${filteredProfiles.length}` : "0 results"}</p><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-muted-foreground">Rows per page<Select value={pageSize} onValueChange={(value) => { setPageSize(value ?? "10"); setCurrentPage(1); }}><SelectTrigger className="h-8 w-[72px]" aria-label="Rows per page"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select></label><span className="text-sm font-medium">Page {page} of {totalPages}</span><div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}><IconChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Next page" disabled={page >= totalPages} onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}><IconChevronRight /></Button></div></div></div></> : <p className="p-8 text-center text-sm text-muted-foreground">{loading ? "Loading profiles…" : "No team members match this view."}</p>}
    </CardContent></Card>
  </main>;
}
