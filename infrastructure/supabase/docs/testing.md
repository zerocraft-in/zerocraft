# Zerocraft Platform — Testing

## Test layers

| Layer | Tool | Docker required? | Status |
|---|---|---|---|
| Static verification | Node scripts | No | Implemented (see below) |
| Database unit tests | `supabase test db` (pgTAP/RLS) | Yes | Not executed |
| RLS isolation tests | SQL test suites | Yes | Not executed |
| Function/trigger tests | SQL test suites | Yes | Not executed |

## Static tests (no database connection)

The following static test files are located in
`infrastructure/supabase/tests/static/`:

### 1. verify-naming.mjs

Checks:
- All table names are plural `snake_case`.
- No vague table names (`data`, `settings_table`, `records`, `items`).
- No duplicate table names within `public` schema.
- Primary keys follow `pk_<table>`.
- Foreign keys follow `fk_<table>_<column>`.
- Unique constraints follow `uq_<table>_<columns>`.
- Check constraints follow `ck_<table>_<condition>`.
- Indexes follow `idx_<table>_<columns>`.
- Triggers follow `trg_<table>_<action>`.
- No duplicate function names/signatures.
- No duplicate constraint names.
- No duplicate index names.
- No duplicate trigger names.
- No duplicate policy names within the same table.

### 2. verify-migration-order.mjs

Checks:
- Migration files are sorted by timestamp prefix.
- No duplicate timestamps.
- Migration 001 creates extensions, `private` schema, identity tables.
- Migration 002 creates platform RBAC tables (after 001).
- Migration 003 creates organization tables and helpers (after 002).
- Migration 004 creates organization_members/invitations/RPCs (after 003).
- No migration references a table defined in a later migration without a forward-reference comment.
- All `create table` statements have a corresponding `alter table ... enable row level security`.

### 3. verify-rls.mjs

Checks:
- Every `create table` in platform migrations is followed by `alter table ... enable row level security`.
- Every table with RLS has at least one `create policy`.
- No table has both RLS enabled and a permissive `using (true)` insert/update/delete policy (except read-only reference tables where select_all is intended).
- `platform_members` has RLS and its select policy calls `private.has_platform_permission`.
- `private.has_platform_permission` owner is pinned to `postgres` (circular RLS fix).
- `authenticated` does not have direct INSERT/UPDATE/DELETE on protected tables (revoke statements present).
- No `security definer` function lacks `set search_path = ''`.

### 4. verify-security.mjs

Checks:
- No `auth.users` duplication (no `create table` that copies auth.users columns).
- No `supabase db push` / `supabase link` / `supabase functions deploy` commands in docs.
- No hardcoded UUIDs or passwords in migrations.
- No plaintext token storage (token_hash columns only).
- `organization_invitations.token_hash` column exists and is described as hashed.
- `create_organization` RPC always assigns the `owner` role (no arbitrary role assignment).
- `change_member_role` RPC rejects `owner` as `p_new_role_key`.
- `change_member_role` RPC rejects changing an Owner's role (`v_current_role_key = 'owner'`).
- Platform RBAC tables (`platform_*`) and organization RBAC tables (`organization_*`) are separate.
- No commerce table names (`products`, `orders`, `customers`, `inventory_items`, etc.) in platform migrations.

### 5. verify-no-commerce.mjs

Checks:
- No table names matching Commerce Template tables (`products`, `variants`, `categories`,
  `customers`, `orders`, `order_items`, `payments`, `shipments`, `sales_channels`,
  `locations`, `media`, `taxonomy_roots`, etc.).
- No `templates/commerce/` content referenced inside `infrastructure/supabase/migrations/`.
- `seed.sql` contains no customer, organization, store, or demo data.

### 6. verify-bootstrap.mjs

Checks:
- Migration 005 exists and comes after migration 004.
- `platform_bootstrap_events` table is created with RLS enabled.
- `private.bootstrap_platform_owner(p_user_id uuid)` function is created.
- Function is `SECURITY DEFINER` with `set search_path = ''`.
- Function is revoked from `public`, `anon`, `authenticated`.
- Function is granted to `service_role` only.
- Function does NOT use `auth.uid()` (service_role context has null `auth.uid()`).
- Function validates user exists in `auth.users` and `platform_users`.
- Function enforces one-time bootstrap (refuses if Platform Owner already exists).
- Function assigns `platform_owner` role.
- Function records audit event in `platform_bootstrap_events`.
- Function uses advisory lock for concurrency safety.
- Function ownership pinned to `postgres`.
- `platform_bootstrap_events` INSERT/UPDATE/DELETE blocked for authenticated.
- No hardcoded UUIDs or passwords in migration 005.
- Bootstrap script exists, uses parameterized `:user_id`, calls the function,
  has `ON_ERROR_STOP`, and contains no hardcoded credentials.
- `config.toml` does not expose the `private` schema via `api.schemas`.

## Database tests (require Docker — not executed)

When Docker is available, the following can be run against a fresh local database:

```powershell
pnpm exec supabase db reset
pnpm exec supabase test db
```

Expected test categories:
- Unauthenticated access (anon role) — all reads denied.
- Authenticated user access — own profile/preferences only.
- Platform Owner access — full platform RBAC read.
- Non-platform-member access — no platform_members rows visible.
- Cross-organization isolation — user A cannot see org B data.
- Organization member access — own org data only.
- Unauthorized store access — denied (stores not yet implemented).
- Sensitive credential protection — invitation token_hash not readable.

**Status: NOT EXECUTED.** Docker is installed on this machine, but `supabase db reset` and
`supabase test db` are not executed per task restrictions (no deployment, no local stack startup).
These tests must be run in an environment with Docker Desktop and the Supabase CLI when task
restrictions permit.

## What has actually been verified

Static file review only (no database connection):
- All 4 migration files read and reviewed.
- Dependency order confirmed (001 → 002 → 003 → 004).
- Circular RLS dependency identified and fixed (`has_platform_permission` owned by postgres).
- Naming conventions verified against all objects.
- No commerce tables present.
- No customer/demo seed data present.
- RLS enabled on all 13 tables.
- 22 functions (15 SECURITY DEFINER, 7 SECURITY INVOKER).
- 12 triggers.
- 49 RLS policies.
- 13 indexes.
- All security-sensitive functions have `set search_path = ''`.
- All direct DML revoked from `authenticated` on protected tables.

**Not verified:** Live RLS execution, function execution, trigger firing, policy evaluation
against actual queries. Requires Docker + `supabase db reset` + `supabase test db`.

## Known limitations

- Docker is installed but not used for live tests per task restrictions; live database tests
  cannot run until `supabase start` / `db reset` are permitted.
- `supabase test db` command availability depends on the installed CLI version (3.1.0).
- RLS recursion fix relies on `postgres` function ownership; if migrations are applied by a
  non-superuser role, ownership pinning may fail (the migration raises an exception in that
  case, which is the safe failure mode).
- No integration with application code (`apps/admin`, `packages/*`, `workers/*`) has been
  tested.
