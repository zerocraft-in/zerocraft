# Zerocraft Default Commerce Template

Versioned, customer-owned PostgreSQL schema for a Zerocraft commerce project.

This directory is **independent of `infrastructure/supabase/migrations/`**. Platform migrations
describe the Zerocraft-owned Platform DB. Files in `templates/commerce/migrations/`
are installed only into a verified, customer-owned Supabase project after OAuth
authorization and explicit customer confirmation.

## What this template is

- A single-tenant (one customer organization) commerce database, optionally
  holding multiple stores/locations.
- A versioned SQL contract with checksums, deterministic order, and idempotent
  re-runs.
- An RLS-first schema that resolves identity from either:
  - the customer project's own Supabase Auth (`auth.uid()` mapped through
    `tenant_members.local_user_id`), or
  - a Zerocraft platform assertion JWT verified by Supabase third-party auth
    (`tenant_members.central_user_id` matched to the verified `sub` claim).
- Media metadata only. Binary files live in Cloudflare R2 (or another object
  store), never in PostgreSQL.

## What this template is **not**

- It is not the Platform DB. It contains no `organizations`, `profiles`,
  OAuth tokens, provisioning jobs, or Platform audit logs.
- It is not a second authentication system. It does not create `auth.users`.
- It does not contain the global Shopify taxonomy. Only selected taxonomy roots
  and category references are stored; the global catalogue stays in R2 behind
  the taxonomy Worker.

## Layout

```text
templates/commerce/
├── template.config.json          # version, checksums, install metadata
├── migrations/
│   ├── 001_core.sql
│   ├── 002_identity_and_access.sql
│   ├── 003_catalog.sql
│   ├── 004_product_options_and_variants.sql
│   ├── 005_collections_and_media.sql
│   ├── 006_taxonomy_integration.sql
│   ├── 007_inventory.sql
│   ├── 008_customers.sql
│   ├── 009_orders.sql
│   ├── 010_payments.sql
│   ├── 011_shipping.sql
│   ├── 012_sales_channels.sql
│   ├── 013_pos.sql
│   ├── 014_audit_and_webhooks.sql
│   └── 015_rls_and_security.sql
├── seeds/
│   ├── default_roles.sql
│   ├── default_permissions.sql
│   ├── default_settings.sql
│   └── default_sales_channels.sql
├── tests/
│   ├── schema-verification.sql
│   ├── rls-verification.sql
│   └── tenant-isolation.sql
└── docs/
    ├── schema.md
    ├── ownership.md
    └── migration-policy.md
```

## Installation contract

The provisioning Worker is the only supported installer. It:

1. Verifies the target project ref is not a protected Zerocraft project.
2. Verifies the project belongs to the customer-selected Supabase organization.
3. Waits for `ACTIVE_HEALTHY`.
4. Applies migrations in order with SHA-256 checksums recorded in the Platform
   DB (`tenant_migrations`).
5. Applies idempotent seed files.
6. Calls `public.initialize_tenant(...)` with the organization/store context.
7. Applies the verification SQL as a fail-closed migration.
8. Activates the tenant database only after verification returns success.

Never run these files against the Zerocraft Platform project.

## Local verification

```powershell
pnpm --filter @zerocraft/commerce-template test
pnpm --filter @zerocraft/commerce-template verify
```

Static tests validate ordering, checksums, required tables, RLS coverage,
idempotency markers, and the absence of destructive/SQL-secret patterns. The
`.sql` test files can be executed by the migration runner's verification step or
by `psql` against a disposable local database.

## Versioning policy

- `MAJOR`: breaking data model change requiring a data migration.
- `MINOR`: additive tables/columns/indexes/policies.
- `PATCH`: seed or policy corrections without schema shape changes.
- Every change requires a new migration file. Never edit an applied migration.
- Checksum mismatches stop installation; they are never "repaired" by re-running.
