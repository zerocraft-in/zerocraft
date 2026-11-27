"use server"

import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createSupabaseServiceClient } from "@/lib/supabase/service"
import {
  requireOrganization,
  NO_ACTIVE_MEMBERSHIP_ERROR,
  type SessionContext,
} from "@/lib/auth/session"
import { inviteMember } from "./actions"
import ProfileNameForm from "./profile-name-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@zerocraft/ui/card"
import { Badge } from "@zerocraft/ui/badge"
import { Button } from "@zerocraft/ui/button"
import { Separator } from "@zerocraft/ui/separator"

type MemberRow = {
  id: string
  user_id: string
  email: string | null
  full_name: string | null
  role_key: string | null
  role_name: string | null
  status: string
  joined_at: string | null
}

type InvitationRow = {
  id: string
  email: string
  role_key: string | null
  role_name: string | null
  expires_at: string | null
  created_at: string | null
}

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>

type OrgMemberRow = {
  id: string
  user_id: string
  role_id: string
  status: string
  joined_at: string | null
  profiles: {
    id: string
    full_name: string | null
  } | null
  organization_roles: {
    id: string
    key: string
    name: string | null
  } | null
}

type InvitationRowDb = {
  id: string
  email: string
  role_id: string
  expires_at: string | null
  created_at: string | null
  organization_roles: {
    id: string
    key: string
    name: string | null
  } | null
}

/**
 * Resolves the account address for each organization member.
 *
 * `public.profiles` carries the display name but has no email column: the
 * address lives in auth.users, which is not exposed through PostgREST and
 * cannot be joined from the browser. It is read here on the server through
 * the Supabase Admin API using the service-role client, so no schema change,
 * no RLS change and no invented column on public.profiles is required.
 *
 * A member whose account cannot be read is simply returned without an
 * address instead of failing the whole page.
 */
async function getMemberEmails(userIds: string[]): Promise<Map<string, string>> {
  const emails = new Map<string, string>()
  const uniqueIds = Array.from(new Set(userIds.filter((id) => Boolean(id))))
  if (uniqueIds.length === 0) return emails

  let service: ReturnType<typeof createSupabaseServiceClient>
  try {
    service = createSupabaseServiceClient()
  } catch {
    // Only the error code and message are logged — never keys or tokens.
    console.error("Service client unavailable; member addresses omitted.")
    return emails
  }

  const resolved = await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const { data, error } = await service.auth.admin.getUserById(userId)
        if (error) {
          console.error("Member account lookup failed.", {
            message: error.message,
          })
          return null
        }
        const email = data?.user?.email
        return email ? ([userId, email] as const) : null
      } catch {
        console.error("Member account lookup failed.")
        return null
      }
    })
  )

  for (const entry of resolved) {
    if (entry) emails.set(entry[0], entry[1])
  }

  return emails
}

async function getOrganizationMembers(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MemberRow[]> {
  // `profiles` is embedded through the user_id foreign key explicitly:
  // organization_members has two foreign keys to public.profiles (user_id
  // and invited_by), so a bare `profiles` embed matches two candidate
  // relationships and PostgREST rejects the query as ambiguous. The
  // response property is still `profiles`.
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      id,
      user_id,
      role_id,
      status,
      joined_at,
      profiles!organization_members_user_id_fkey ( id, full_name ),
      organization_roles ( id, key, name )
    `
    )
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: false })

  if (error) throw error

  // `profiles` and `roles` are many-to-one embeds (organization_members holds
  // the FK to their primary key), so PostgREST returns them as single
  // objects, not arrays. The cast goes through `unknown` because the client
  // has no generated database types and therefore infers them as arrays.
  const rows = (data ?? []) as unknown as OrgMemberRow[]

  // public.profiles holds the display name but never the account address.
  // The address is resolved from the member's auth account so the member
  // row can identify a person even when no name was ever set.
  const emails = await getMemberEmails(rows.map((row) => row.user_id))

  return (
    rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      email: emails.get(row.user_id) ?? null,
      full_name: row.profiles?.full_name ?? null,
      role_key: row.organization_roles?.key ?? null,
      role_name: row.organization_roles?.name ?? null,
      status: row.status,
      joined_at: row.joined_at,
    })) ?? []
  )
}

type CurrentProfile = {
  id: string
  full_name: string | null
}

/**
 * Reads the signed-in user's own profile with the authenticated client.
 *
 * The row is selected by the id taken from the verified session, never from
 * anything the browser supplied, and the `profiles_select_own_or_shared`
 * policy decides what the caller is allowed to see.
 */
async function getCurrentProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CurrentProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    // The rest of the page is still useful without it, so log and continue
    // rather than failing the whole screen.
    console.error("Current profile lookup failed.", {
      code: error.code,
      message: error.message,
    })
    return null
  }

  return (data ?? null) as CurrentProfile | null
}

async function getPendingInvitations(
  supabase: SupabaseClient,
  organizationId: string
): Promise<InvitationRow[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select(`
      id,
      email,
      role_id,
      expires_at,
      created_at,
      organization_roles ( id, key, name )
    `)
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error

  // `roles` is a many-to-one embed (invitations holds the FK to its primary
  // key), so PostgREST returns it as a single object, not an array. The cast
  // goes through `unknown` because the client has no generated database types.
  const rows = (data ?? []) as unknown as InvitationRowDb[]

  return (
    rows.map((row) => ({
      id: row.id,
      email: row.email,
      role_key: row.organization_roles?.key ?? null,
      role_name: row.organization_roles?.name ?? null,
      expires_at: row.expires_at,
      created_at: row.created_at,
    })) ?? []
  )
}

async function submitInviteMember(formData: FormData): Promise<void> {
  "use server"

  const email = formData.get("email") as string
  const roleKey = formData.get("roleKey") as string

  const result = await inviteMember({ email, roleKey })

  if (result.ok) {
    redirect("/users")
  }
}

async function requireOrganizationOrRedirect(): Promise<SessionContext> {
  try {
    return await requireOrganization()
  } catch (error) {
    if (error instanceof Error && error.message === NO_ACTIVE_MEMBERSHIP_ERROR) {
      redirect("/onboarding")
    }
    throw error
  }
}

export default async function UsersPage() {
  "use server"

  const context = await requireOrganizationOrRedirect()

  const supabase: SupabaseClient = await createServerSupabaseClient()

  const organizationId = context.activeOrganization?.id
  if (!organizationId) {
    redirect("/onboarding")
  }

  if (!context.permissions.has("users.view")) {
    redirect("/overview")
  }

  const [members, invitations] = await Promise.all([
    getOrganizationMembers(supabase, organizationId),
    getPendingInvitations(supabase, organizationId),
  ])

  const currentProfile = await getCurrentProfile(supabase, context.user.id)

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0 flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-fg"
          >
            M
          </div>
          <div className="min-w-0 leading-tight">
            <h2 className="text-sm font-semibold tracking-[-0.02em] text-body">
              Users &amp; Roles
            </h2>
            <p className="hidden text-2xs text-meta sm:block">
              Manage team members and invitations
            </p>
          </div>
        </div>
        {context.permissions.has("users.invite") && <InviteMemberForm />}
      </div>

      <Separator className="mt-4 mb-8" />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            The display name shown next to your entry in the team list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileNameForm currentName={currentProfile?.full_name ?? ""} />
        </CardContent>
      </Card>

      <MembersTable members={members} />
      <InvitationsTable invitations={invitations} />
    </div>
  )
}

function InviteMemberForm() {
  return (
    <form action={submitInviteMember} className="flex w-full max-w-md flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-body">
            Email address
          </label>
          <input
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-body">
            Role
          </label>
          <select name="roleKey" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50">
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="inventory_staff">Inventory Staff</option>
            <option value="accountant">Accountant</option>
            <option value="sales_staff">Sales Staff</option>
          </select>
        </div>
      </div>
      <Button type="submit">Invite Member</Button>
    </form>
  );
}

function MembersTable({ members }: { members: MemberRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-left pb-3">Member</th>
              <th className="text-left pb-3">Role</th>
              <th className="text-left pb-3">Status</th>
              <th className="text-left pb-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No team members yet
                </td>
              </tr>
            ) : (
              members.map((member: MemberRow) => {
                // A member is identified by the name on their profile when one
                // was set, and by their account address otherwise. Nothing is
                // invented when neither is available.
                const displayName = member.full_name || member.email || "—"
                const initial =
                  (member.full_name || member.email || "").charAt(0).toUpperCase() ||
                  "?"
                const secondary = member.full_name
                  ? member.email ?? "—"
                  : "No name set"

                return (
                  <tr key={member.id} className="border-b">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-inset text-xs font-bold text-body">
                          {initial}
                        </div>
                        <div className="flex flex-col leading-none">
                          <p className="text-sm font-semibold">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {secondary}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant={member.role_key === "owner" ? "secondary" : "default"}>
                        {member.role_name || member.role_key || "—"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={member.status === "active" ? "success" : "default"}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function InvitationsTable({ invitations }: { invitations: InvitationRow[] }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-left pb-3">Email</th>
              <th className="text-left pb-3">Role</th>
              <th className="text-left pb-3">Expires</th>
              <th className="text-left pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                  No pending invitations
                </td>
              </tr>
            ) : (
              invitations.map((invitation: InvitationRow) => (
                <tr key={invitation.id} className="border-b">
                  <td className="py-3">{invitation.email}</td>
                  <td className="py-3">
                    <Badge variant={invitation.role_key === "owner" ? "secondary" : "default"}>
                      {invitation.role_name || invitation.role_key || "—"}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-3">
                    <Badge variant="warning">Pending</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
