# Zerocraft Platform — Security

## RLS strategy

Row Level Security is enabled on **every** platform-owned table containing protected
application data:

- `platform_users`, `user_preferences`
- `platform_roles`, `platform_permissions`, `platform_role_permissions`, `platform_members`
- `organizations`, `organization_roles`, `organization_permissions`, `organization_role_permissions`
- `organization_members`, `organization_invitations`

Every table has an explicit `SELECT` policy where read access is intended, and explicit
`INSERT`/`UPDATE`/`DELETE` policies set to `false` (blocked by default) where direct DML
is not allowed. There are no implicit permissive policies.

## Authorization model

### Two independent RBAC systems

| System | Tables | Scope | Highest role |
|---|---|---|---|
| Platform RBAC | `platform_roles`, `platform_permissions`, `platform_role_permissions`, `platform_members` | Entire platform | `platform_owner` |
| Organization RBAC | `organization_roles`, `organization_permissions`, `organization_role_permissions`, `organization_members` | Single organization | `owner` |

Platform roles and organization roles are completely separate. A Platform Owner is not
automatically an Organization Owner, and vice versa.

### Least-privilege grants

- Direct DML (`INSERT`, `UPDATE`, `DELETE`) is revoked from `authenticated` on all
  protected tables.
- Writes go exclusively through `SECURITY DEFINER` RPCs that validate caller
  permissions before mutating data.
- `SELECT` is granted only where a policy exists.
- `anon` and `public` have no access to any platform table or function.
- `service_role` bypasses RLS (Supabase default) and is used only by server-side code.

### Platform Owner authorization vs organization membership authorization

- Platform Owner access is checked via `private.has_platform_permission('platform.admin')`,
  which is exclusive to the `platform_owner` role (rank 100).
- Organization membership access is checked via `private.current_org_ids()`,
  `private.authorized_org_ids()`, `private.has_org_permission()`, `private.is_org_member()`,
  and `private.is_org_owner()`.
- The two systems never cross-reference each other.

## SECURITY DEFINER functions

All security-critical helper functions and RPCs are `SECURITY DEFINER` with
`set search_path = ''` to prevent search_path injection attacks. Object references are
fully qualified (`public.table`, `private.function`).

### Function ownership

- `private.has_platform_permission(text)` is explicitly owned by `postgres` so its internal
  query on `platform_members` bypasses RLS, breaking the circular RLS dependency where
  `platform_members_select_own_or_admin` calls `has_platform_permission`.
- All other functions are created as `postgres` by default (Supabase CLI applies
  migrations as the `postgres` superuser).
- Trigger functions `public.protect_organization_members_identity()`,
  `public.protect_organization_invitations_immutable()`, and
  `private.prevent_owner_deletion()` are `SECURITY DEFINER`/`SECURITY INVOKER` as noted
  below and REVOKED from `public`/`anon`.
- Public wrapper functions `public.create_organization()`, `public.accept_invitation()`,
  `public.invite_member()`, and `public.change_member_role()` are `SECURITY INVOKER`
  and delegate to their `private.*` SECURITY DEFINER counterparts. They are exposed
  through PostgREST (the `private` schema is not in `api.schemas`). EXECUTE is granted
  to `authenticated` only.

## Circular RLS dependency — fixed

**Problem:** `platform_members_select_own_or_admin` policy calls
`private.has_platform_permission('platform.admin')`, which queries `public.platform_members`
itself. Without intervention, PostgreSQL would detect infinite recursion.

**Fix:** `private.has_platform_permission` is owned by `postgres` and is `SECURITY DEFINER`,
so its query on `platform_members` executes with table-owner privileges and bypasses RLS.
The policy calls the helper; the helper does not re-enter the policy. Recursion is broken.

This is the same pattern used in the original `repair_auth_profiles_and_rls.sql`
(`private.shared_org_user_ids()` owned by `postgres`).

## Invitation acceptance validation

`private.accept_invitation` validates, in order:

1. Token hash matches SHA-256 of the presented token.
2. Invitation is not already accepted (`accepted_at IS NULL`).
3. Invitation is not revoked (`revoked_at IS NULL`).
4. Invitation has not expired (`expires_at > now()`).
5. Organization row is locked first (consistent lock order, deadlock prevention).
6. Invitation row is re-locked and re-validated after acquiring the organization lock.
7. Caller profile exists in `platform_users`.
8. Caller email (from `auth.users`) matches the invitation email (case-insensitive).
9. Caller is not already an active member of the target organization.
10. Only then marks the invitation accepted and creates/activates the membership.

The token itself is never returned to the client; only the invitation ID is returned.
The plaintext token is delivered out-of-band (email) by the application layer.

## Organization membership protection

- `organization_members_insert_blocked` — direct INSERT is blocked; memberships are created
  only via `accept_invitation` (SECURITY DEFINER) or `create_organization` (atomic onboarding).
- `organization_members_update_blocked` — direct UPDATE is blocked; role changes go through
  `change_member_role` (SECURITY DEFINER).
- `organization_members_delete_rpc_only` — direct DELETE is blocked.
- `organization_members_protect_identity` trigger — rejects changes to `organization_id`
  or `user_id` on any update attempt (defense in depth).
- `organization_invitations_protect_immutable` trigger — rejects changes to email, role_id,
  token_hash, invited_by, organization_id, and un-revoking.

## Last-owner deletion protection

**Problem:** `auth.users` → `platform_users` (ON DELETE CASCADE) →
`organization_members` (ON DELETE CASCADE). If an Auth user who is the only active
Owner of an organization is deleted, the cascade silently makes the organization
ownerless. RLS does NOT protect against FK cascades.

**Fix:** `private.prevent_owner_deletion()` is a `SECURITY DEFINER` BEFORE DELETE
trigger on `public.platform_users`. It checks whether the user being deleted is an
active owner of any organization, and raises an exception if so. Ownership must be
transferred first (ownership transfer RPC is future work).

- `private.prevent_owner_deletion()` — SECURITY DEFINER, `set search_path = ''`,
  revoked from public/anon.
- `trg_prevent_owner_deletion` — BEFORE DELETE trigger on `public.platform_users`,
  for each row.

**Unresolved:** No ownership transfer RPC exists yet. An active organization Owner
cannot delete their account until ownership transfer is implemented (Phase D).

## Role hierarchy and privilege escalation prevention

### Platform RBAC

- `platform_roles` has a `rank` column (higher = more authority).
- `platform_owner` = 100, `platform_admin` = 80, `platform_reviewer` = 60,
  `platform_support` = 40.
- `is_system = true` prevents client deletion of system roles.
- RLS policies on role/permission tables are read-only for `authenticated`; insert/update/
  delete are blocked.

### Organization RBAC

- `organization_roles` has a `rank` column.
- `owner` = 100, `admin` = 80, `manager` = 60, `staff` = 20.
- `change_member_role` enforces:
  1. Caller's rank must strictly exceed the target's current rank.
  2. Caller's rank must strictly exceed the requested new rank.
  3. Cannot change one's own role (prevents self-promotion).
  4. Cannot change an Owner's role (protects the final active Owner).
  5. Cannot assign Owner through ordinary role management.
- `invite_member` enforces:
  1. Caller's rank must strictly exceed the target role's rank.
  2. Cannot assign Owner through invitations.

## Platform Owner bootstrap security (implemented)

The first Platform Owner (Mani) is assigned via a secure, idempotent bootstrap
mechanism implemented in migration 005. The mechanism satisfies all requirements:

1. Mani authenticates through Supabase Auth. His existing Auth user must exist
   before the bootstrap assigns Platform Owner access.
2. No public, unauthenticated privilege-escalation endpoint. The bootstrap
   function is revoked from `public`, `anon`, and `authenticated`. It is
   executable only by `service_role` (server-side administrative context).
3. Fail-closed one-time enforcement — safe to re-run but always fails
   after the first successful bootstrap (refuses if a Platform Owner
   already exists). Not idempotent in the sense of succeeding again.
4. Rejects arbitrary user IDs from untrusted client input. The function takes
   `p_user_id` as a parameter and validates it against `auth.users` and
   `platform_users`. It does NOT use `auth.uid()` (service_role context has
   null `auth.uid()`).
5. No hardcoded user UUID or password in migrations or scripts. The target user
   ID is supplied at runtime via the administrative script.
6. Does not create an additional Auth user unexpectedly. The function validates
   that the target user already exists in `auth.users` and `platform_users`.
7. Records an appropriate audit event in `platform_bootstrap_events`.
8. Prevents accidental promotion of arbitrary users. Only `service_role` can
   execute the function; the administrative script requires explicit user_id.
9. Concurrency-safe via an advisory transaction lock.
10. No shared bootstrap secret is used. Access is controlled by database role
    membership (postgres superuser or service_role).

### Bootstrap function: `private.bootstrap_platform_owner(p_user_id uuid)`

- SECURITY DEFINER, owned by `postgres`, `set search_path = ''`.
- Revoked from `public`, `anon`, `authenticated`; granted to `service_role` only.
- NOT exposed through PostgREST (the `private` schema is not in `api.schemas`).
- Administrative entry point: `scripts/bootstrap-platform-owner.sql`, run as
  the database owner (postgres superuser) using the service_role connection.

### Audit table: `public.platform_bootstrap_events`

Append-only audit trail for bootstrap events. RLS enabled. SELECT restricted to
authenticated users with `platform.admin` permission. INSERT/UPDATE/DELETE
blocked for clients; INSERT performed only by the bootstrap function.

### Threat model

| Threat | Mitigation |
|---|---|
| Unauthenticated privilege escalation | Function revoked from `anon`; not exposed via PostgREST |
| Authenticated user self-promotion | Function revoked from `authenticated`; only `service_role` can execute |
| Arbitrary user ID injection | Function validates `p_user_id` against `auth.users` and `platform_users` |
| Duplicate bootstrap | Function refuses if a Platform Owner already exists |
| Concurrent bootstrap attempts | Advisory transaction lock |
| Hardcoded credentials | No email, password, or UUID in migrations or scripts |
| Audit trail tampering | `platform_bootstrap_events` INSERT/UPDATE/DELETE blocked for clients |

## Secret management

- No plaintext OAuth tokens, database passwords, or service-role keys are stored in this
  schema (relevant to planned store integration tables).
- Invitation tokens are stored as SHA-256 hashes only (`token_hash`).
- The `ZEROCRAFT_PLATFORM_BOOTSTRAP_SECRET` environment variable (in `.env.example`) is
  for local development only and must never be committed.
- No production credentials or hardcoded secrets in any migration file.

## Audit requirements

- All `updated_at` columns are managed by `public.updated_at_trigger()` and are never
  directly writable by clients.
- Invitation immutability trigger protects audit-relevant fields.
- Organization settings changes are not yet audited (planned in migration 009 audit logs).
- `platform_audit_events` and `organization_audit_logs` tables are planned (migration 009).

## What is NOT protected yet (planned)

- Store business verification requests and events (migration 005+).
- Integration credentials / secret references (migration 006+).
- Provisioning jobs and events (migration 007+).
- Platform billing tables (migration 008+).
- Platform and organization audit log tables (migration 009+).
