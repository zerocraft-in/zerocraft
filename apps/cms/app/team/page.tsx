"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  IconLock,
  IconRefresh,
  IconShieldCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";

type TeamRole = "admin" | "manager" | "staff" | "client";
type Member = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};
type Invite = {
  id: string;
  email: string;
  role: Exclude<TeamRole, "client">;
  status: string;
  expires_at: string;
  created_at: string;
};
type InviteHealth = {
  counts: Record<string, number>;
  lastCleanup: {
    created_at: string;
    metadata: { expiredCount?: number };
  } | null;
  nextCleanupAt: string;
  schedule: string;
};
type Permission = {
  key: string;
  label: string;
  description: string;
  group_name: string;
  sort_order: number;
};
type RoleDefault = { role: TeamRole; permission_key: string; allowed: boolean };
type UserOverride = {
  user_id: string;
  permission_key: string;
  allowed: boolean;
};

const roleLabels: Record<TeamRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  client: "No studio access",
};
const roleVariants: Record<TeamRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  staff: "outline",
  client: "outline",
};
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value),
  );

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [health, setHealth] = useState<InviteHealth | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] =
    useState<Exclude<TeamRole, "client">>("staff");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [permissionCatalog, setPermissionCatalog] = useState<Permission[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<RoleDefault[]>([]);
  const [overrides, setOverrides] = useState<UserOverride[]>([]);
  const [permissionMemberId, setPermissionMemberId] = useState("");
  const [permissionValues, setPermissionValues] = useState<
    Record<string, boolean>
  >({});
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    kind: "member" | "invite";
    id: string;
    label: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/studio/team", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Team members could not be loaded.");
      setMembers(payload.members || []);
      setInvites(payload.invites || []);
      const permissionResponse = await fetch("/api/studio/team/permissions", {
        cache: "no-store",
      });
      if (permissionResponse.ok) {
        const permissionPayload = await permissionResponse.json();
        setPermissionCatalog(permissionPayload.permissions || []);
        setRoleDefaults(permissionPayload.roleDefaults || []);
        setOverrides(permissionPayload.overrides || []);
      }
      const healthResponse = await fetch("/api/studio/team/health", {
        cache: "no-store",
      });
      if (healthResponse.ok) setHealth(await healthResponse.json());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Team members could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const member =
      members.find((item) => item.id === permissionMemberId) || members[0];
    if (!member) return;
    if (member.id !== permissionMemberId) setPermissionMemberId(member.id);
    const defaults = new Map(
      roleDefaults
        .filter((item) => item.role === member.role)
        .map((item) => [item.permission_key, item.allowed]),
    );
    const memberOverrides = new Map(
      overrides
        .filter((item) => item.user_id === member.id)
        .map((item) => [item.permission_key, item.allowed]),
    );
    setPermissionValues(
      Object.fromEntries(
        permissionCatalog.map((item) => [
          item.key,
          memberOverrides.get(item.key) ?? defaults.get(item.key) ?? false,
        ]),
      ),
    );
  }, [members, permissionMemberId, permissionCatalog, roleDefaults, overrides]);

  async function savePermissions() {
    if (!permissionMemberId) return;
    setPermissionSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/studio/team/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: permissionMemberId,
          permissions: Object.entries(permissionValues).map(
            ([key, allowed]) => ({ key, allowed }),
          ),
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Permissions could not be saved.");
      setOverrides(
        Object.entries(permissionValues).map(([permission_key, allowed]) => ({
          user_id: permissionMemberId,
          permission_key,
          allowed,
        })),
      );
      setMessage("Member permissions saved and audit logged.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Permissions could not be saved.",
      );
    } finally {
      setPermissionSaving(false);
    }
  }

  async function resetPermissions() {
    if (!permissionMemberId) return;
    setPermissionSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/studio/team/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: permissionMemberId, permissions: [] }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Permissions could not be reset.");
      setOverrides((current) =>
        current.filter((item) => item.user_id !== permissionMemberId),
      );
      setMessage("Member permissions reset to role defaults.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Permissions could not be reset.",
      );
    } finally {
      setPermissionSaving(false);
    }
  }

  async function updateRole(member: Member, role: TeamRole) {
    if (role === member.role) return;
    setSaving(member.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/studio/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, role }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Role could not be updated.");
      setMembers((current) =>
        current.map((item) => (item.id === member.id ? payload.member : item)),
      );
      setMessage(`${member.email} is now ${roleLabels[role]}.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Role could not be updated.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/studio/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteName,
          role: inviteRole,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Invitation could not be sent.");
      setInvites((current) => [payload.invite, ...current]);
      setInviteEmail("");
      setInviteName("");
      setMessage(`Invitation sent to ${payload.invite.email}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Invitation could not be sent.",
      );
    } finally {
      setInviteBusy(false);
    }
  }

  async function resendInvite(invite: Invite) {
    setSaving(invite.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/studio/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", inviteId: invite.id }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Invitation could not be resent.");
      setInvites((current) => [
        payload.invite,
        ...current.map((item) =>
          item.id === invite.id ? { ...item, status: "revoked" } : item,
        ),
      ]);
      setMessage(`Replacement invitation sent to ${payload.invite.email}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Invitation could not be resent.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function setAccess(member: Member, isActive: boolean) {
    setSaving(member.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/studio/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, isActive }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Access could not be updated.");
      setMembers((current) =>
        current.map((item) => (item.id === member.id ? payload.member : item)),
      );
      setMessage(`${member.email} is ${isActive ? "active" : "suspended"}.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Access could not be updated.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function removeConfirmed() {
    if (!confirmAction) return;
    setSaving(confirmAction.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/studio/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: confirmAction.kind,
          id: confirmAction.id,
          confirm: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error || "The access record could not be removed.",
        );
      if (confirmAction.kind === "member")
        setMembers((current) =>
          current.filter((member) => member.id !== confirmAction.id),
        );
      else
        setInvites((current) =>
          current.map((invite) =>
            invite.id === confirmAction.id
              ? { ...invite, status: "revoked" }
              : invite,
          ),
        );
      setMessage(
        confirmAction.kind === "member"
          ? `${confirmAction.label} was removed from the team.`
          : `Invitation for ${confirmAction.label} was revoked.`,
      );
      setConfirmAction(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The access record could not be removed.",
      );
    } finally {
      setSaving(null);
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter(
      (member) =>
        !needle ||
        [member.full_name, member.email, member.role]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    );
  }, [members, query]);

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <IconUsersGroup className="size-7" />
            Team access
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage Studio roles for existing team accounts. Every role change is
            recorded in the audit log.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
        >
          <IconRefresh className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </header>
      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Team accounts</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {members.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Studio access</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {
                members.filter(
                  (member) => member.role !== "client" && member.is_active,
                ).length
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Administrators</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {members.filter((member) => member.role === "admin").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Pending invites</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {health?.counts.pending ??
                invites.filter((invite) => invite.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>
      {health && (
        <Card>
          <CardHeader>
            <CardTitle>Invitation health</CardTitle>
            <CardDescription>
              Automated expiry cleanup and invitation lifecycle status.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Lifecycle</p>
              <p className="mt-1 text-sm">
                {health.counts.accepted || 0} accepted ·{" "}
                {health.counts.expired || 0} expired ·{" "}
                {health.counts.revoked || 0} revoked
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last cleanup</p>
              <p className="mt-1 text-sm font-medium">
                {health.lastCleanup
                  ? dateLabel(health.lastCleanup.created_at)
                  : "Not run yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {health.lastCleanup
                  ? `${health.lastCleanup.metadata?.expiredCount || 0} expired accounts handled`
                  : "Waiting for scheduled run"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next cleanup</p>
              <p className="mt-1 text-sm font-medium">
                {dateLabel(health.nextCleanupAt)}
              </p>
              <p className="text-xs text-muted-foreground">{health.schedule}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delivery failures</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {health.counts.email_failed || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Invite a team member</CardTitle>
          <CardDescription>
            Creates a protected account and sends the invitation through the
            configured SMTP relay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={inviteMember}
            className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]"
          >
            <Input
              required
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Email address"
              aria-label="Invite email"
            />
            <Input
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="Full name (optional)"
              aria-label="Invite full name"
            />
            <SelectField value={inviteRole} onValueChange={(value) => setInviteRole(value as Exclude<TeamRole, "client">)} options={[{ value: "staff", label: "Staff" }, { value: "manager", label: "Manager" }, { value: "admin", label: "Admin" }]} />
            <Button type="submit" disabled={inviteBusy}>
              {inviteBusy ? "Sending…" : "Send invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitation history</CardTitle>
            <CardDescription>
              Revoke pending invitations or resend expired and failed
              invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {invites.map((invite) => {
                const resendable =
                  invite.status === "expired" ||
                  invite.status === "email_failed" ||
                  (invite.status === "pending" &&
                    new Date(invite.expires_at).getTime() <= Date.now());
                return (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div>
                      <strong className="block">{invite.email}</strong>
                      <span className="text-xs text-muted-foreground">
                        {roleLabels[invite.role]} · Expires{" "}
                        {dateLabel(invite.expires_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          invite.status === "pending"
                            ? "secondary"
                            : invite.status === "revoked"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {invite.status.replace("_", " ")}
                      </Badge>
                      {resendable && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={saving === invite.id}
                          onClick={() => void resendInvite(invite)}
                        >
                          {saving === invite.id ? "Resending…" : "Resend"}
                        </Button>
                      )}
                      {invite.status === "pending" && !resendable && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={saving === invite.id}
                          onClick={() =>
                            setConfirmAction({
                              kind: "invite",
                              id: invite.id,
                              label: invite.email,
                            })
                          }
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {permissionCatalog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconLock className="size-5" />
              Granular permissions
            </CardTitle>
            <CardDescription>
              Choose the exact pages and actions this member can use. Empty
              overrides restore role defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <SelectField value={permissionMemberId} onValueChange={setPermissionMemberId} className="min-w-64" aria-label="Select team member for permissions" options={members.map((member) => ({ value: member.id, label: `${member.full_name || member.email} · ${roleLabels[member.role]}` }))} />
              <Button
                type="button"
                onClick={() => void savePermissions()}
                disabled={permissionSaving || !permissionMemberId}
              >
                {permissionSaving ? "Saving…" : "Save permissions"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void resetPermissions()}
                disabled={permissionSaving || !permissionMemberId}
              >
                Reset to role defaults
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {permissionCatalog.map((permission) => (
                <label
                  key={permission.key}
                  className="flex gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={permissionValues[permission.key] === true}
                    onChange={(event) =>
                      setPermissionValues((current) => ({
                        ...current,
                        [permission.key]: event.target.checked,
                      }))
                    }
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {permission.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                      {permission.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconShieldCheck className="size-5" />
              Role directory
            </CardTitle>
            <CardDescription className="mt-1">
              Only administrators can change roles, suspend, or remove access.
            </CardDescription>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people or email"
            className="w-full sm:w-72"
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 text-right font-medium">Access</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-5 py-4">
                      <strong className="block">
                        {member.full_name || "Unnamed member"}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={roleVariants[member.role]}>
                        {roleLabels[member.role]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={member.is_active ? "secondary" : "destructive"}
                      >
                        {member.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {dateLabel(member.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <SelectField aria-label={`Change role for ${member.email}`} value={member.role} disabled={saving === member.id} onValueChange={(value) => void updateRole(member, value as TeamRole)} options={[{ value: "admin", label: "Admin" }, { value: "manager", label: "Manager" }, { value: "staff", label: "Staff" }, { value: "client", label: "No studio access" }]} />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={saving === member.id}
                          onClick={() =>
                            void setAccess(member, !member.is_active)
                          }
                        >
                          {member.is_active ? "Suspend" : "Reactivate"}
                        </Button>
                        {member.id !== "" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={saving === member.id}
                            onClick={() =>
                              setConfirmAction({
                                kind: "member",
                                id: member.id,
                                label: member.email,
                              })
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && (
              <div className="p-6 text-sm text-muted-foreground">
                Loading team members…
              </div>
            )}
            {!loading && !visible.length && (
              <div className="grid min-h-48 place-items-center p-6 text-sm text-muted-foreground">
                No matching team members.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-confirm-title"
            className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl"
          >
            <h2 id="team-confirm-title" className="text-lg font-semibold">
              {confirmAction.kind === "member"
                ? "Remove team member?"
                : "Revoke invitation?"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmAction.kind === "member"
                ? `This permanently removes ${confirmAction.label} and ends their CMS access. This action cannot be undone.`
                : `The invitation for ${confirmAction.label} will be invalidated and the pending account disabled.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmAction(null)}
                disabled={saving === confirmAction.id}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void removeConfirmed()}
                disabled={saving === confirmAction.id}
              >
                {saving === confirmAction.id
                  ? "Removing…"
                  : confirmAction.kind === "member"
                    ? "Remove member"
                    : "Revoke invitation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
