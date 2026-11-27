# Commerce Template

## Overview

The Commerce Template is an independent, versioned Supabase schema installed
only into customer-owned Supabase projects. It provides the full commerce
runtime: catalog, inventory, customers, orders, payments, shipping, POS, media
metadata, taxonomy, RBAC, and RLS.

## Version

- **Template name**: `zerocraft-default-commerce`
- **Version**: `1.0.0`
- **Migrations**: 15 (001_core through 015_rls_and_security)
- **Seeds**: 4 (default_permissions, default_roles, default_settings, default_sales_channels)
- **Verification**: 3 (schema-verification, rls-verification, tenant-isolation, health-verification)
- **Tables**: 54
- **Config**: `templates/commerce/template.config.json` (checksums, protected refs, install contract)

## Migration List

| # | File | Purpose |
|---|---|---|
| 001 | `001_core.sql` | Core schema: stores, products, variants, categories |
| 002 | `002_identity_and_access.sql` | Tenant context, RBAC, tenant members |
| 003 | `003_catalog.sql` | Product catalog, pricing, inventory |
| 004 | `004_customers.sql` | Customer accounts, addresses |
| 005 | `005_orders.sql` | Orders, order items, order status |
| 006 | `006_payments.sql` | Payment records, transactions |
| 007 | `007_shipping.sql` | Shipping methods, fulfillment |
| 008 | `008_pos.sql` | Point-of-sale registers, sessions, transactions |
| 009 | `009_taxonomy.sql` | Lightweight taxonomy (R2/Worker roots) |
| 010 | `010_media.sql` | Media metadata, R2 references |
| 011 | `011_sales_channels.sql` | Sales channels (online, POS, marketplace) |
| 012 | `012_settings.sql` | Tenant settings, tax, currency |
| 013 | `013_audit.sql` | Tenant audit log |
| 014 | `014_indexes.sql` | Performance indexes |
| 015 | `015_rls_and_security.sql` | RLS policies, grants, `initialize_tenant_from_json` |

## Identity Model

Supports two verified paths:

1. **Local Supabase Auth**: `tenant_members.local_user_id` references
   `auth.users(id)` in the customer project.
2. **Platform assertion JWT**: `tenant_members.central_user_id` references the
   Platform user, with `iss`/`aud` verification against the platform JWKS.

`user_metadata` is never trusted for identity.

## Variant Model

- Canonical `variants` table (source of truth)
- Read-only `product_variants` view (denormalized for queries)
- No duplicated variant models

## Money and Time

- Money stored as `bigint` in `*_paise` (integer currency subunit)
- All timestamps are `timestamptz` (timezone-aware)

## Taxonomy

- Lightweight taxonomy: R2/Worker shared roots only
- No full Shopify taxonomy per tenant
- Organizations enable top-level roots via `organization_shopify_taxonomy_roots`
  (Platform DB, not tenant project)

## RBAC

Roles: `Owner`, `Admin`, `Manager`, `Staff`
Permissions stored in `permissions` table, mapped via `role_permissions`.
`tenant_members.role_id` references the role.

## RLS

Row-level security enabled on all tables. Policies are scoped by `store_id`
and `tenant_member` context. Tenant context established via
`public.initialize_tenant_from_json()`.

## Installation Contract

1. Template installed only into customer-owned Supabase projects
2. Never installed into Platform DB (`ftcvyhlzeyqceosdqyxn`) or legacy ref
   (`qvjhwxriafgobxknpqtq`)
3. Each migration applied via Management API `POST /v1/projects/{ref}/database/migrations`
4. Checksum verified before and after application
5. Seeds applied after migrations
6. Tenant initialized via `initialize_tenant_from_json()`
7. Verification SQL executed last; activation only after `health-verification.sql`

## Verification

- `tests/schema-verification.sql` — Verifies all 54 tables exist
- `tests/rls-verification.sql` — Verifies RLS is enabled on all tables
- `tests/tenant-isolation.sql` — Verifies cross-tenant isolation
- `tests/health-verification.sql` — Final health check before activation
- Static check: `node templates/commerce/scripts/verify.mjs` (all checks pass)
- Node tests: `node --test templates/commerce/tests/template.test.mjs` (6/6 pass)

## Files

- `templates/commerce/migrations/001_core.sql` … `015_rls_and_security.sql`
- `templates/commerce/seeds/default_permissions.sql`
- `templates/commerce/seeds/default_roles.sql`
- `templates/commerce/seeds/default_settings.sql`
- `templates/commerce/seeds/default_sales_channels.sql`
- `templates/commerce/tests/schema-verification.sql`
- `templates/commerce/tests/rls-verification.sql`
- `templates/commerce/tests/tenant-isolation.sql`
- `templates/commerce/tests/health-verification.sql`
- `templates/commerce/tests/template.test.mjs`
- `templates/commerce/scripts/build-manifest.mjs`
- `templates/commerce/scripts/verify.mjs`
- `templates/commerce/scripts/template-lib.mjs`
- `templates/commerce/template.config.json`
- `templates/commerce/docs/schema.md`
- `templates/commerce/docs/ownership.md`
- `templates/commerce/docs/migration-policy.md`
- `templates/commerce/docs/README.md`

## Ownership

- Template is owned and versioned by Zerocraft
- Each customer project has its own copy, tracked in `tenant_migrations`
  (Platform DB) with checksums
- Template upgrades require a new version entry in `template_versions`
  (Platform DB) and a new provisioning job
