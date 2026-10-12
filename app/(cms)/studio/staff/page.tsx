"use client";

import { useEffect, useState } from "react";
import { supabase, type Profile, type UserRole } from "@/lib/supabase-client";

const roles: UserRole[] = ["client", "staff", "manager", "admin"];

export default function StaffPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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
    const { error: updateError } = await supabase.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", profile.id);
    if (updateError) setError("Role change failed. Only an admin can change studio access.");
    else { setError(null); setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, role } : item)); }
    setBusy(null);
  }

  return <main className="mx-auto max-w-5xl space-y-7 pb-12">
    <div><p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Studio / Access</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Staff</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Assign roles to registered users. New accounts begin as clients and cannot access the studio until promoted. Authentication invitations are managed in Supabase Auth.</p></div>
    {error && <p role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error}</p>}
    {loading ? <p role="status" className="text-sm text-muted-foreground">Loading profiles…</p> : <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th scope="col" className="p-4">Person</th><th scope="col" className="p-4">Email</th><th scope="col" className="p-4">Role</th></tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id} className="border-b border-border last:border-0"><td className="p-4 font-medium">{profile.full_name}{profile.id === currentId ? " (you)" : ""}</td><td className="p-4 text-muted-foreground">{profile.email}</td><td className="p-4"><label className="sr-only" htmlFor={`role-${profile.id}`}>Role for {profile.full_name}</label><select id={`role-${profile.id}`} value={profile.role} disabled={!canManage || busy === profile.id || profile.id === currentId} onChange={(event) => void changeRole(profile, event.target.value as UserRole)} className="rounded-lg border border-border bg-background px-3 py-2 capitalize disabled:opacity-60">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></td></tr>)}</tbody></table>{!profiles.length && <p className="p-6 text-sm text-muted-foreground">No profiles found.</p>}</div>}
  </main>;
}
