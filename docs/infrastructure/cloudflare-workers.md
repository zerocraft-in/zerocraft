# Cloudflare Workers

Maara uses three independently deployable Cloudflare Workers. Each worker has
its own `wrangler.toml`, entry point (`src/index.ts`), and bindings. Workers
do not import from packages or apps.

## Workers

| Worker | Name | Purpose | Entry point |
| --- | --- | --- | --- |
| `workers/tenant-provisioner` | `@zerocraft/tenant-provisioner` | Tenant provisioning | `src/index.ts` |
| `workers/public-cdn` | `@zerocraft/public-cdn` | Public CDN edge gateway | `src/index.ts` |
| `workers/taxonomy` | `@zerocraft/taxonomy` | Taxonomy import | `src/index.ts` |

## Tenant provisioner

Creates customer-owned Supabase projects, installs the Commerce Template,
initializes tenant context, runs verification, and activates the tenant.

- **Job state machine:** QUEUED → RUNNING → SUCCEEDED / FAILED / CANCELLED /
  NEEDS_REAUTHORIZATION
- **Cron:** `*/5 * * * *` — refreshes expiring connections and processes one
  queued job
- **KV:** `TENANT_SECRETS` namespace stores database passwords referenced by
  `tenant_databases.database_password_secret_ref`
- **Debug endpoints:** `/health`, `/jobs/process`, `/jobs/start`,
  `/jobs/{jobId}`, `/admin/template/register` (shared-secret authenticated)
- **Files:** `workers/tenant-provisioner/src/oauth.ts`, `crypto.ts`,
  `provisioning.ts`, `index.ts`

## Public CDN (Stage 2)

Worker gateway for public media delivery without changing the existing R2 bucket.

- **Bucket binding:** `PUBLIC_MEDIA` (existing `maara` bucket)
- **Route:** `cdn.maara.co.in/*` → Worker → GET/HEAD only, `assets/public/*`
  only
- **Behavior:** Never lists the bucket, never accepts a key from a query
  parameter. Private, legacy, traversal, malformed, missing, and unsupported
  method requests are rejected.
- **Caching:** Public responses use trusted R2 metadata, ETag/conditional
  requests, and immutable caching.
- **Files:** `workers/public-cdn/src/index.ts`

## Taxonomy

Imports Shopify Product Taxonomy release assets into taxonomy tables.

- **Entry:** `workers/taxonomy/src/index.ts`
- **Source:** Shopify Product Taxonomy release v2026-11
- **Script:** `tooling/scripts/download-and-import-shopify-taxonomy-2026-11.sh`

## Deployment

Workers are deployed via `wrangler deploy`. No deployment has been performed
without explicit owner approval. `wrangler.toml` files use `maara-*` deployment
names (unchanged).
