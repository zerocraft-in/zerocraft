"use client";

import Link from "next/link";
import { IconSearch, IconArrowsSort, IconShieldOff } from "@tabler/icons-react";
import { Button } from "@zerocraft/components/ui/button";
import { Card } from "@zerocraft/components/ui/card";
import { UsersPageHeader } from "../_components/users-page-header";

function AccessAccounts({ title, description, action, emptyTitle, emptyDescription }: {
  title: string; description: string; action: string; emptyTitle: string; emptyDescription: string;
}) {
  return <section className="security-section">
    <div className="flex items-center justify-between gap-3">
      <div><h2>{title}</h2><p className="mt-1 text-muted-foreground">{description}</p></div>
      <Button variant="secondary" size="sm" disabled title="This access feature is not configured for this deployment">{action}</Button>
    </div>
    <Card>
      <div className="users-table-toolbar justify-end">
        <span className="flex gap-2 text-muted-foreground" aria-hidden="true"><IconSearch size={16} /><IconArrowsSort size={16} /></span>
      </div>
      <div className="security-empty"><p className="font-medium">{emptyTitle}</p><p>{emptyDescription}</p></div>
    </Card>
  </section>;
}

export default function UsersSecurityPage() {
  return <main className="mx-auto flex w-full flex-col pb-20">
    <UsersPageHeader title="Security" back />
    <section className="security-section">
      <h2>Organization security</h2>
      <div className="flex items-center justify-between gap-4"><h3>Secure sign-in requirements</h3><Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/settings/users" />}>Manage users</Button></div>
      <Card><div className="flex items-start gap-3 p-4"><IconShieldOff className="mt-0.5 size-4 shrink-0" /><p>Review each user’s secure sign-in requirements from their user page.</p></div></Card>
    </section>
    <section className="security-section">
      <h2>User activity logs</h2>
      <Card><div className="security-row"><p className="text-muted-foreground">Monitor and review user activities</p><Button variant="secondary" size="sm" nativeButton={false} render={<Link href="/system/audit-logs" />}>View</Button></div></Card>
    </section>
    <AccessAccounts title="Organization service accounts" description="Organization access for developer automations and agents" action="Add service account" emptyTitle="No service accounts" emptyDescription="Service accounts let automation act for this organization." />
    <AccessAccounts title="Partner API clients" description="Manage apps and integrations for this organization" action="Add Partner API client" emptyTitle="No Partner API clients" emptyDescription="Partner API clients are not configured for this deployment." />
    <section className="security-section">
      <h2>Store security</h2>
      <div><h3>Collaborators</h3><p className="mt-1 text-muted-foreground">Give designers, developers, and marketers access to this store through a user invitation.</p></div>
      <Card><div className="security-row"><p>Collaborator access</p><Button variant="secondary" size="sm" nativeButton={false} render={<Link href="/settings/users/new" />}>Invite user</Button></div><div className="border-t bg-muted/30 px-4 py-3"><p className="text-muted-foreground">Collaborator codes are not configured. Invitations and role assignments are available from <Link href="/settings/users" className="underline">Users</Link>.</p></div></Card>
    </section>
  </main>;
}
