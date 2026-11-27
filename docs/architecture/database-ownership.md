# Database Ownership Model

## Overview

Zerocraft uses a **split database ownership** model:

1. **Platform DB** — holds central users, organizations, memberships,
   invitations, stores, OAuth connections, tenant mappings, template versions,
   jobs, and audit events. Operated by Zerocraft.
2. **Customer-owned Supabase projects** — each tenant store gets its own
   independent Supabase project holding commerce data (catalog, inventory,
   orders, customers, payments, shipping, POS, media). Operated by the tenant.

No commerce data ever lives in the Platform DB. No Platform data ever lives in
a customer project.

## Platform DB

- **Project ref**: `ftcvyhlzeyqceosdqyxn` (documented reference)
- **Purpose**: Central multi-tenant control plane
- **Owned tables**: `organizations`, `profiles`, `organization_members`,
  `roles`, `permissions`, `role_permissions`, `stores`, `store_members`,
  `supabase_connections`, `supabase_oauth_tokens`, `supabase_oauth_states`,
  `supabase_oauth_pending`, `tenant_databases`, `tenant_provisioning_jobs`,
  `tenant_provisioning_job_steps`, `tenant_migrations`, `template_versions`,
  `platform_audit_events`, `audit_logs`
- **Migration**: `infrastructure/supabase/migrations/20261125090000_platform_tenant_provisioning.sql`
  (additive only — no existing table, role, policy, or row is modified)
- **Secrets**: Stored only as references (`database_password_secret_ref`) or
  AES-256-GCM ciphertext. No plaintext tokens or passwords.
- **Local development**: Runs in local Supabase stack at `infrastructure/supabase/`.
  13 forward-only migrations.

## Customer-owned Supabase Projects

- **Purpose**: Tenant commerce runtime
- **Owned tables**: All 54 tables from the Commerce Template (migrations 001–015)
- **Template**: Versioned, independently maintained at `templates/commerce/`
- **Installation**: Via the Supabase Management API migration endpoint,
  validated by checksums in the `tenant_migrations` ledger
- **Access**: Tenant members authenticate through Supabase Auth or platform
  assertion JWT (`iss`/`aud` verified). `user_metadata` is never trusted.
- **Local development**: Must be tested in a **dedicated separate** local Supabase
  project or schema. Never apply Commerce template migrations to the Platform DB
  merely to test them.

## Protected Project Refs

The following project refs are **never** targeted for template installation:

- `ftcvyhlzeyqceosdqyxn` — the Zerocraft Platform DB
- `qvjhwxriafgobxknpqtq` — legacy/administrative ref

Both are listed in `templates/commerce/template.config.json` under
`protectedProjects` and enforced by the provisioning Worker's
`assertSafeTarget()` check.

## RLS and Access Control

- Platform DB: RLS enabled on all new tables. Client access is read-only for
  members with the appropriate permission (`platform.provisioning.view`,
  `platform.connections.manage`, etc.). Writes go through SECURITY DEFINER RPCs
  that verify ownership (`private.is_org_owner`).
- Token tables (`supabase_oauth_tokens`, `supabase_oauth_states`,
  `supabase_oauth_pending`): No client policy, no client grant. Service role
  only.
- Customer projects: RLS enabled per the Commerce Template's `015_rls_and_security.sql`.
  Tenant context is established via `initialize_tenant_from_json()`.

## Ownership Boundaries

| Concern | Platform DB | Customer Project |
|---|---|---|
| Users / orgs | Yes | No |
| Stores | Yes | No |
| OAuth connections | Yes | No |
| OAuth tokens (encrypted) | Yes | No |
| Catalog / products | No | Yes |
| Inventory | No | Yes |
| Orders / customers | No | Yes |
| Payments | No | Yes |
| Tenant migrations ledger | Yes (tracking only) | Yes (applied files) |

## Migration Safety Rules (Session C–G)

1. **Platform DB only in Session C:** Local Supabase start and migration verification targets the Platform DB only (13 migrations).
2. **Commerce template tested separately:** Session D creates a dedicated local environment for the 15 Commerce template migrations. No cross-contamination.
3. **Never touch remote/production:** No commands target remote Supabase projects during Sessions C–G.
4. **Forward-only:** No migration file is edited or deleted. Fixes are new forward-only migrations.
5. **Reset only local:** `supabase db reset` only on local Platform or Commerce test instances. Never on non-local databases.

## What This Doc Does Not Cover

- Commerce Template schema details → `templates/commerce/docs/schema.md`
- Template ownership within a tenant → `templates/commerce/docs/ownership.md`
- Provisioning workflow → `docs/architecture/tenant-provisioning.md`
- OAuth flow → `docs/security/supabase-oauth.md`
- Secret storage → `docs/security/secrets-management.md`

---

## Corrections Applied (Session B Review)

**2026-11-27:** Added explicit Migration Safety Rules section and clarified that Commerce template migrations must be tested in a dedicated local environment, never applied to the Platform DB. Added local development paths for both databases. The Platform DB local config is at `infrastructure/supabase/`; Commerce template local testing requires a separate setup in Session D.