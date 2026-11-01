"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { IconArrowLeft, IconMail, IconPlus, IconUserPlus, IconX } from "@tabler/icons-react";
import { Badge } from "@zerocraft/components/ui/badge";
import { Button } from "@zerocraft/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/components/ui/card";
import { Input } from "@zerocraft/components/ui/input";
import { SelectField } from "@zerocraft/components/ui/select-field";
import { roleDescriptions, roleLabels, type UserRole } from "../_components/user-types";

export default function NewUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "client">>("staff");
  const [secureSignIn, setSecureSignIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function addEmail() {
    const value = email.trim().toLowerCase();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || emails.includes(value)) return;
    setEmails((current) => [...current, value]);
    setEmail("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const recipients = [...emails, email.trim().toLowerCase()].filter(Boolean);
      if (!recipients.length) throw new Error("Add at least one email address.");
      for (const recipient of recipients) {
        const response = await fetch("/api/admin/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: recipient, fullName, role, secureSignIn }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `Invitation could not be sent to ${recipient}.`);
      }
      router.push("/settings/users");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invitation could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto flex w-full max-w-[820px] flex-col gap-7 pb-20"><header className="flex items-start gap-3 border-b border-border/70 pb-6"><Button variant="ghost" size="icon" nativeButton={false} render={<Link href="/settings/users" />}><IconArrowLeft /></Button><div><p className="text-xs text-muted-foreground">Users</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Add users</h1><p className="mt-1 text-sm text-muted-foreground">Invite users and choose the access they need.</p></div></header>{error && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}<form onSubmit={submit} className="space-y-6"><Card className="border-amber-500/30 bg-amber-500/10 shadow-none"><CardContent className="p-4 text-sm"><p className="font-medium">User limits depend on your current plan</p><p className="mt-1 text-muted-foreground">Additional admin access may require a plan upgrade. Invitations use the active RBAC roles configured for this workspace.</p></CardContent></Card><Card className="border-border/80 shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><IconUserPlus className="size-4" />User details</CardTitle><CardDescription>Add one or more email addresses for the invitation.</CardDescription></CardHeader><CardContent className="space-y-4"><label className="grid gap-2 text-sm font-medium">Full name<Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Ananya Kumar" autoComplete="name" /></label><div className="grid gap-2 text-sm font-medium"><span>Emails</span><div className="flex flex-wrap gap-2 rounded-md border border-input p-2">{emails.map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => setEmails((current) => current.filter((value) => value !== item))}><IconX className="size-3" /></button></span>)}<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addEmail(); } }} placeholder="name@company.com" className="min-w-48 flex-1 border-0 shadow-none focus-visible:ring-0" autoComplete="email" /><Button type="button" variant="ghost" size="sm" onClick={addEmail}><IconPlus />Add</Button></div></div></CardContent></Card><Card className="border-border/80 shadow-none"><CardHeader><CardTitle className="text-base">Secure sign-in method</CardTitle><CardDescription>Require a passkey or two-step authentication for invited users. This preference is included with the invitation request.</CardDescription></CardHeader><CardContent><button type="button" role="switch" aria-checked={secureSignIn} onClick={() => setSecureSignIn((current) => !current)} className={`relative h-6 w-11 rounded-full transition-colors ${secureSignIn ? "bg-foreground" : "bg-muted-foreground/40"}`}><span className={`absolute top-1 size-4 rounded-full bg-background transition-transform ${secureSignIn ? "translate-x-6" : "translate-x-1"}`} /></button></CardContent></Card><Card className="border-border/80 shadow-none"><CardHeader><CardTitle className="text-base">Roles</CardTitle><CardDescription>Assign a role to grant user actions.</CardDescription></CardHeader><CardContent className="space-y-4"><label className="grid max-w-md gap-2 text-sm font-medium">Role<SelectField value={role} onValueChange={(value) => setRole(value as Exclude<UserRole, "client">)} options={["admin", "manager", "staff"].map((item) => ({ value: item, label: roleLabels[item as Exclude<UserRole, "client">] }))} /></label><div className="rounded-lg border border-border/70 bg-muted/25 p-4"><div className="flex items-center gap-2"><Badge variant="outline">{roleLabels[role]}</Badge><span className="text-sm font-medium">What this role can do</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{roleDescriptions[role]}</p></div></CardContent></Card><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" nativeButton={false} render={<Link href="/settings/users" />}>Cancel</Button><Button type="submit" disabled={busy}><IconMail />{busy ? "Sending invitation…" : "Send invitation"}</Button></div></form></main>;
}
