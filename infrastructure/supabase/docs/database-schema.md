# Zerocraft Platform — Database Schema

This document describes the actual implemented database objects in migrations 001–004.
Planned future migrations are listed separately at the end.

## Schema ownership

- `public` — application tables, views, functions, triggers, policies.
- `private` — security-critical helper functions. USAGE granted to `authenticated`;
  all other access revoked from `public` and `anon`.
- `auth` — Supabase Auth system schema (not created by these migrations).

## Tables

### 1. public.platform_users

One row per Supabase Auth user. Platform identity. Email lives in `auth.users` only.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | — | PK, FK → auth.users(id) | Auth user identity |
| full_name | text | YES | — | | Display name |
| phone | text | YES | — | | Phone number |
| avatar_path | text | YES | — | | Storage path for avatar |
| email | citext | YES | — | | Cached email (case-insensitive) |
| created_at | timestamptz | NO | now() | | Row creation time |
| updated_at | timestamptz | NO | now() | | Row update time (trigger) |

- RLS: enabled
- Policies: `platform_users_select_own`, `platform_users_update_own`
- Trigger: `trg_platform_users_updated_at` (calls `public.updated_at_trigger()`)
- FK: `auth.users(id)` ON DELETE CASCADE — deleting an Auth user cascades to platform_users

### 2. public.user_preferences

Per-user platform preferences.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK | |
| user_id | uuid | NO | — | FK → platform_users(id), UQ | User reference |
| theme | text | NO | 'system' | CK (light/dark/system) | UI theme |
| language | text | NO | 'en' | CK (2–8 chars) | UI language |
| email_notifications | boolean | NO | true | | Email notification opt-in |
| created_at | timestamptz | NO | now() | | |
| updated_at | timestamptz | NO | now() | | Trigger |

- RLS: enabled
- Policies: `user_preferences_select_own`, `user_preferences_insert_own`, `user_preferences_update_own`
- Index: `idx_user_preferences_user_id`
- Trigger: `trg_user_preferences_updated_at`

### 3. public.platform_roles

System platform roles, global reference rows.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK | |
| key | text | NO | — | UQ, CK (4 allowed keys) | Role key |
| name | text | NO | — | | Display name |
| description | text | YES | — | | |
| rank | int | NO | 0 | CK (>= 0) | Authority ordering |
| is_system | boolean | NO | true | | System roles cannot be deleted |
| created_at | timestamptz | NO | now() | | |
| updated_at | timestamptz | NO | now() | | Trigger |

- RLS: enabled (select_all only; insert/update/delete blocked)
- Trigger: `trg_platform_roles_updated_at`
- Seed rows: platform_owner (100), platform_admin (80), platform_reviewer (60), platform_support (40)

### 4. public.platform_permissions

Catalogue of platform permission keys.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| key | text | NO | — | PK | Permission key |
| group | text | NO | — | | Functional group |
| description | text | YES | — | | |
| created_at | timestamptz | NO | now() | | |

- RLS: enabled (select_all only)
- Seed: 16 permissions across Platform Administration, Organization Management, Store Management, Provisioning, Integrations, Billing, Verification

### 5. public.platform_role_permissions

Maps platform roles to permissions. Source of truth for platform RBAC.

| Column | Type | Null | FK | Description |
|---|---|---|---|---|
| role_id | uuid | NO | platform_roles(id) | |
| permission_key | text | NO | platform_permissions(key) | |

- PK: (role_id, permission_key)
- RLS: enabled (select_all only)
- Seed: owner gets all 16; other roles get their intended subsets

### 6. public.platform_members

Platform staff members. One active membership per user. Separate from organization membership.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK | |
| user_id | uuid | NO | — | FK → platform_users(id), UQ | User reference |
| role_id | uuid | NO | — | FK → platform_roles(id) | Role reference |
| status | text | NO | 'active' | CK (invited/active/suspended) | Membership status |
| invited_by | uuid | YES | — | FK → platform_users(id) | Who invited |
| created_at | timestamptz | NO | now() | | |
| updated_at | timestamptz | NO | now() | | Trigger |

- RLS: enabled
- Policies: `platform_members_select_own_or_admin` (select), insert/update/delete blocked
- Indexes: `idx_platform_members_user_id`, `idx_platform_members_role_id`, `idx_platform_members_status`
- Trigger: `trg_platform_members_updated_at`

### 7. public.organizations

Top-level tenant. Every business record is organization-scoped.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK | |
| name | text | NO | — | CK (2–120 chars) | Organization name |
| slug | text | NO | — | UQ, CK (^[a-z0-9-]+$) | URL-safe identifier |
| currency | char(3) | NO | 'INR' | | ISO currency |
| timezone | text | NO | 'Asia/Kolkata' | | |
| country | char(2) | NO | 'IN' | | ISO country |
| gstin | text | YES | — | | GST tax ID |
| address | jsonb | YES | — | | |
| phone | text | YES | — | | |
| email | text | YES | — | | |
| logo_path | text | YES | — | | |
| invoice_prefix | text | NO | 'INV-' | | |
| invoice_next_number | int | NO | 1 | CK (> 0) | |
| tax_inclusive_pricing | boolean | NO | false | | |
| created_at | timestamptz | NO | now() | | |
| updated_at | timestamptz | NO | now() | | Trigger |

- RLS: enabled
- Policies: `organizations_select_member` (select), insert/update/delete blocked
- Trigger: `trg_organizations_updated_at`

### 8. public.organization_roles

System organization roles ordered by rank.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK | |
| key | text | NO | — | UQ, CK (owner/admin/manager/staff) | |
| name | text | NO | — | | |
| rank | int | NO | 0 | CK (>= 0) | |
| is_system | boolean | NO | true | | |
| created_at | timestamptz | NO | now() | | |
| updated_at | timestamptz | NO | now() | | Trigger |

- RLS: enabled (select_all only)
- Seed: owner (100), admin (80), manager (60), staff (20)

### 9. public.organization_permissions

Catalogue of organization permission keys.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| key | text | NO | — | PK | |
| group | text | NO | — | | |
| description | text | YES | — | | |
| created_at | timestamptz | NO | now() | | |

- RLS: enabled (select_all only)
- Seed: 8 permissions (organizations.view/manage, users.view/invite/manage_roles, audit_logs.view, stores.view/manage)

### 10. public.organization_role_permissions

Maps organization roles to permissions.

| Column | Type | Null | FK | Description |
|---|---|---|---|---|
| role_id | uuid | NO | organization_roles(id) | |
| permission_key | text | NO | organization_permissions(key) | |

- PK: (role_id, permission_key)
- RLS: enabled (select_all only)
- Seed: owner gets all 8; admin gets manage+view subsets; manager/staff get view subsets

### 11. public.organization_members

Links platform users to organizations with assigned roles and membership status.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK | |
| organization_id | uuid | NO | — | FK → organizations(id) | Organization |
| user_id | uuid | NO | — | FK → platform_users(id), UQ (with org_id) | User |
| role_id | uuid | NO | — | FK → organization_roles(id) | Role |
| status | text | NO | 'active' | CK (invited/active/suspended) | |
| invited_by | uuid | YES | — | FK → platform_users(id) | |
| joined_at | timestamptz | YES | — | | |
| created_at | timestamptz | NO | now() | | |
| updated_at | timestamptz | NO | now() | | Trigger |

- RLS: enabled
- Policies: select (own or shared orgs), insert/update/delete blocked
- Indexes: `idx_organization_members_org_id`, `idx_organization_members_user_id`, `idx_organization_members_status`
- Unique: `uq_organization_members_org_user` (organization_id, user_id)
- Trigger: `trg_organization_members_updated_at`, `organization_members_protect_identity`

### 12. public.organization_invitations

Single-use, time-bound invitations bound to email.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK | |
| organization_id | uuid | NO | — | FK → organizations(id) | |
| email | citext | NO | — | | Invitee email |
| role_id | uuid | NO | — | FK → organization_roles(id) | Offered role |
| token_hash | text | NO | — | | SHA-256 of token (never plaintext) |
| expires_at | timestamptz | NO | — | | Expiration |
| accepted_at | timestamptz | YES | — | | Acceptance time |
| revoked_at | timestamptz | YES | — | | Revocation time |
| invited_by | uuid | NO | — | FK → platform_users(id) | Inviter |
| created_at | timestamptz | NO | now() | | |
| updated_at | timestamptz | NO | now() | | Trigger |

- RLS: enabled
- Policies: select (member orgs), insert/update/delete blocked
- Indexes: `idx_organization_invitations_org_email`, `idx_organization_invitations_token_hash`, `idx_organization_invitations_expires_at`
- Partial unique: `uq_organization_invitations_pending_org_email` (org_id, email where not accepted/revoked)
- Triggers: `trg_organization_invitations_updated_at`, `organization_invitations_protect_immutable`
- Grants: direct INSERT/UPDATE revoked from `authenticated`

### 12. public.platform_bootstrap_events

Audit trail for Platform Owner bootstrap events.

| Column | Type | Null | Default | Constraint | Description |
|---|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | PK | |
| bootstrapped_user_id | uuid | NO | — | FK → platform_users(id) | User promoted to Platform Owner |
| bootstrapped_at | timestamptz | NO | now() | | When the bootstrap occurred |
| action | text | NO | 'platform_owner_bootstrap' | CK (1–100 chars) | Action type |
| metadata | jsonb | NO | '{}'::jsonb | CK (jsonb object) | Structured event context |
| created_at | timestamptz | NO | now() | | Row creation time |

- RLS: enabled
- Policies: select (platform.admin only), insert/update/delete blocked
- Indexes: `idx_platform_bootstrap_events_user_id`, `idx_platform_bootstrap_events_created_at`
- Trigger: `trg_platform_bootstrap_events_updated_at`
- Grants: direct INSERT/UPDATE/DELETE revoked from `authenticated`; INSERT via `private.bootstrap_platform_owner()` only

## Functions

### public.updated_at_trigger()

Sets `new.updated_at = now()`. Used by all `trg_*_updated_at` triggers. `set search_path = ''`. REVOKED from public/anon.

### private.auth_user_id()

Returns `auth.uid()`. SECURITY DEFINER, `set search_path = ''`. Executable by `authenticated`.

### private.platform_member_id()

Returns the active `platform_members.id` for the authenticated user. SECURITY DEFINER, `set search_path = ''`. Queries `platform_members` (migration 002 table). Executable by `authenticated`.

### private.has_platform_permission(p_permission text)

Returns true if the authenticated platform member holds the given permission. SECURITY DEFINER, `set search_path = ''`. Queries `platform_members`, `platform_role_permissions`, `platform_permissions`. **Owner pinned to `postgres`** — breaks circular RLS dependency on `platform_members`. Executable by `authenticated`.

### private.is_platform_owner()

Returns true if the authenticated user holds `platform.admin` permission (exclusive to `platform_owner` role). SECURITY DEFINER, `set search_path = ''`. Delegates to `has_platform_permission`. Executable by `authenticated`.

### private.current_org_ids()

Returns the set of organization IDs the authenticated user is an active member of. SECURITY DEFINER, `set search_path = ''`. Queries `organization_members` (migration 004 table — forward reference). Executable by `authenticated`.

### private.authorized_org_ids(p_permission text)

Returns organization IDs where the caller holds the given permission. SECURITY DEFINER, `set search_path = ''`. Queries org tables. Executable by `authenticated`.

### private.has_org_permission(p_org uuid, p_permission text)

Boolean check used inside RPC bodies and policy WITH CHECK clauses. SECURITY DEFINER, `set search_path = ''`. Queries org tables. Executable by `authenticated`.

### private.is_org_member(p_org uuid)

Boolean: is the caller an active member of the given organization? SECURITY DEFINER, `set search_path = ''`. Executable by `authenticated`.

### private.is_org_owner(p_org uuid)

Boolean: is the caller an active owner of the given organization? SECURITY DEFINER, `set search_path = ''`. Queries `organization_members` + `organization_roles`. Executable by `authenticated`.

### public.protect_organization_members_identity()

Trigger function: rejects changes to `organization_id` or `user_id` on `organization_members`. Not SECURITY DEFINER. REVOKED from public/anon.

### public.protect_organization_invitations_immutable()

Trigger function: rejects changes to immutable invitation fields (email, role_id, token_hash, invited_by, organization_id) and un-revoking. Not SECURITY DEFINER. REVOKED from public/anon.

### private.create_organization(p_name, p_timezone, p_currency) → uuid

SECURITY DEFINER, `set search_path = ''`. Atomic onboarding: creates organization + Owner membership. Uses advisory lock. Validates profile exists, no active membership, name/timezone/currency format. Always assigns `owner` role — cannot assign arbitrary roles. Public wrapper `public.create_organization` delegates to it. Executable by `authenticated`.

### private.invite_member(p_organization_id, p_email, p_role_key) → uuid

SECURITY DEFINER, `set search_path = ''`. Creates an invitation (not a direct membership). Locks organization row, verifies caller membership + `users.invite` permission, resolves role, prevents Owner assignment, enforces rank hierarchy (caller rank > target rank). Generates secure token, stores SHA-256 hash only. Revokes existing pending invitations for same email/org. Public wrapper delegates. Executable by `authenticated`.

### private.accept_invitation(p_token text) → uuid

SECURITY DEFINER, `set search_path = ''`. Atomic single-use acceptance. Locks organization row, validates token hash, expiry, revocation, email/caller identity match, prevents duplicate memberships. Marks accepted and creates/activates membership. Public wrapper delegates. Executable by `authenticated`.

### private.change_member_role(p_organization_id, p_member_id, p_new_role_key)

SECURITY DEFINER, `set search_path = ''`. Changes a member's role. Locks organization row, verifies caller membership + `users.manage_roles` permission, prevents self-change, prevents changing an Owner, prevents assigning Owner, enforces rank hierarchy in both directions (caller > current AND caller > new). Public wrapper delegates. Executable by `authenticated`.

### public.invite_member(p_organization_id, p_email, p_role_key) → uuid

SECURITY INVOKER public wrapper. Delegates to `private.invite_member`. Exposed through PostgREST (private schema is not in `api.schemas`). Executable by `authenticated`.

### public.change_member_role(p_organization_id, p_member_id, p_new_role_key)

SECURITY INVOKER public wrapper. Delegates to `private.change_member_role`. Exposed through PostgREST (private schema is not in `api.schemas`). Executable by `authenticated`.

### private.bootstrap_platform_owner(p_user_id uuid) → uuid

SECURITY DEFINER, `set search_path = ''`. Promotes an existing Auth user to Platform Owner. Does NOT use `auth.uid()` (service_role context has null `auth.uid()`). Validates `p_user_id` exists in `auth.users` and `platform_users`. Refuses if a Platform Owner already exists (one-time enforcement). Uses an advisory transaction lock for concurrency safety. Inserts the `platform_members` row with the `platform_owner` role. Records an audit event in `platform_bootstrap_events`. Revoked from public/anon/authenticated; executable only by `service_role`. Function ownership pinned to `postgres`.

### private.prevent_owner_deletion()

SECURITY DEFINER trigger function, `set search_path = ''`. Fires BEFORE DELETE on `public.platform_users`. Blocks deletion when the user is an active owner of any organization (prevents ownerless organizations via FK cascade). REVOKED from public/anon.

## Triggers

| Trigger | Table | Timing | Function |
|---|---|---|---|
| trg_platform_users_updated_at | platform_users | BEFORE UPDATE | public.updated_at_trigger() |
| trg_user_preferences_updated_at | user_preferences | BEFORE UPDATE | public.updated_at_trigger() |
| trg_platform_roles_updated_at | platform_roles | BEFORE UPDATE | public.updated_at_trigger() |
| trg_platform_members_updated_at | platform_members | BEFORE UPDATE | public.updated_at_trigger() |
| trg_organizations_updated_at | organizations | BEFORE UPDATE | public.updated_at_trigger() |
| trg_organization_roles_updated_at | organization_roles | BEFORE UPDATE | public.updated_at_trigger() |
| trg_organization_members_updated_at | organization_members | BEFORE UPDATE | public.updated_at_trigger() |
| organization_members_protect_identity | organization_members | BEFORE UPDATE | public.protect_organization_members_identity() |
| trg_organization_invitations_updated_at | organization_invitations | BEFORE UPDATE | public.updated_at_trigger() |
| organization_invitations_protect_immutable | organization_invitations | BEFORE UPDATE | public.protect_organization_invitations_immutable() |
| trg_prevent_owner_deletion | platform_users | BEFORE DELETE | private.prevent_owner_deletion() |
| trg_platform_bootstrap_events_updated_at | platform_bootstrap_events | BEFORE UPDATE | public.updated_at_trigger() |

## Indexes

| Index | Table | Columns |
|---|---|---|
| idx_user_preferences_user_id | user_preferences | user_id |
| idx_platform_members_user_id | platform_members | user_id |
| idx_platform_members_role_id | platform_members | role_id |
| idx_platform_members_status | platform_members | status |
| idx_organization_members_org_id | organization_members | organization_id |
| idx_organization_members_user_id | organization_members | user_id |
| idx_organization_members_status | organization_members | status |
| idx_organization_invitations_org_email | organization_invitations | organization_id, email |
| idx_organization_invitations_token_hash | organization_invitations | token_hash |
| idx_organization_invitations_expires_at | organization_invitations | expires_at |
| uq_organization_invitations_pending_org_email | organization_invitations | organization_id, email (partial) |
| idx_platform_bootstrap_events_user_id | platform_bootstrap_events | bootstrapped_user_id |
| idx_platform_bootstrap_events_created_at | platform_bootstrap_events | created_at desc |

## Constraints summary

| Type | Naming pattern | Example |
|---|---|---|
| Primary key | `pk_<table>` | `pk_platform_users` |
| Foreign key | `fk_<table>_<column>` | `fk_user_preferences_user_id` |
| Unique | `uq_<table>_<columns>` | `uq_user_preferences_user_id` |
| Check | `ck_<table>_<condition>` | `ck_user_preferences_theme` |

## RLS policies summary

| Table | Select | Insert | Update | Delete |
|---|---|---|---|---|
| platform_users | own only | blocked | own only | blocked |
| user_preferences | own only | own only | own only | blocked |
| platform_roles | all authenticated | blocked | blocked | blocked |
| platform_permissions | all authenticated | blocked | blocked | blocked |
| platform_role_permissions | all authenticated | blocked | blocked | blocked |
| platform_members | own or admin | blocked | blocked | blocked |
| organizations | member orgs only | blocked | blocked | blocked |
| organization_roles | all authenticated | blocked | blocked | blocked |
| organization_permissions | all authenticated | blocked | blocked | blocked |
| organization_role_permissions | all authenticated | blocked | blocked | blocked |
| organization_members | own or shared orgs | blocked | blocked | blocked |
| organization_invitations | member orgs only | blocked | blocked | blocked |
| platform_bootstrap_events | admin only | blocked | blocked | blocked |

## Planned future migrations (not implemented)

| Migration | Area | Status |
|---|---|---|
| 005 | Stores, store settings, store business profiles, store addresses, store domains | Planned |
| 006 | Store integrations, encrypted integration credentials, integration verification events | Planned |
| 007 | Provisioning jobs, provisioning attempts, migration execution history, template versions | Planned |
| 008 | Plans, plan features, organization subscriptions, subscription items, invoices, platform transactions, usage records | Planned |
| 009 | Platform audit logs, organization audit logs, security events, support access sessions | Planned |

## Commerce template boundary

No tables from the Commerce Template (`templates/commerce/migrations/001_core.sql`…`015_rls_and_security.sql`) are present in this schema. The two databases are strictly separate.
