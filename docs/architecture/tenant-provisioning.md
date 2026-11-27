# Tenant Provisioning

## Overview

Tenant provisioning creates a customer-owned Supabase project for a store,
installs the versioned Commerce Template, initializes tenant context, runs
verification, and activates the tenant. The process is idempotent, resumable,
and job-tracked with lifecycle states.

## State Machine

Job steps (mirrored in `tenant_provisioning_job_steps`):

1. `validate_target` — Validate project ref is not protected
2. `ensure_oauth` — Ensure a valid Supabase access token (refresh if needed)
3. `create_project` — Create the customer Supabase project via Management API
4. `wait_healthy` — Poll until project status is `ACTIVE_HEALTHY`
5. `install_migrations` — Apply template migrations 001–015 (checksum-verified)
6. `install_seeds` — Apply seed data (permissions, roles, settings, channels)
7. `initialize_tenant` — Call `initialize_tenant_from_json()` to set tenant context
8. `verify_template` — Run schema, RLS, tenant-isolation, health verification
9. `activate_tenant` — Fetch publishable key, mark `tenant_databases` as `ACTIVE`

## Lifecycle States

| Status | Meaning | Terminal? | Retryable? |
|---|---|---|---|
| `QUEUED` | Job waiting to be picked up | No | Yes |
| `RUNNING` | Worker actively processing | No | Yes (if heartbeat stale) |
| `SUCCEEDED` | Provisioning complete | Yes | No |
| `FAILED` | Provisioning failed | Yes | Yes |
| `CANCELLED` | Cancelled by owner | Yes | Yes |
| `NEEDS_REAUTHORIZATION` | OAuth token expired/revoked | Yes | Yes (after reauth) |

## Idempotency

- Jobs are keyed by `(organization_id, idempotency_key)` — duplicate enqueues
  return the existing job.
- Applied template files are tracked in `tenant_migrations` with checksums.
  Retries skip already-applied files with matching checksums.
- A checksum mismatch stops provisioning — it never self-repairs.
- The `create_project` step is idempotent: on 409/422 from the Management API,
  the Worker lists projects and matches by name + organization.

## RPCs

| RPC | Caller | Purpose |
|---|---|---|
| `enqueue_tenant_provisioning` | Owner (authenticated) | Create an idempotent provisioning job |
| `cancel_tenant_provisioning_job` | Owner (authenticated) | Cancel a QUEUED/FAILED/NEEDS_REAUTHORIZATION job |
| `retry_tenant_provisioning_job` | Owner (authenticated) | Reset and requeue a failed job |
| `claim_tenant_provisioning_job` | Worker (service_role) | Claim the next QUEUED job |
| `claim_tenant_provisioning_job_by_id` | Worker (service_role) | Claim a specific job (admin-triggered) |
| `finish_tenant_provisioning_job` | Worker (service_role) | Mark a job terminal |
| `set_tenant_provisioning_step` | Worker (service_role) | Update job step status and progress |
| `record_tenant_migration` | Worker (service_role) | Record an applied template file |
| `upsert_tenant_database` | Worker (service_role) | Create/update tenant database registry row |
| `current_user_is_org_owner` | Worker (user token) | Verify owner before OAuth start |
| `log_platform_event` | Owner / Worker | Append to platform audit trail |

## Job Triggering

1. Admin server calls `enqueue_tenant_provisioning` RPC directly (creates the
   job and returns the job ID).
2. Admin server calls `POST /jobs/start` on the Worker (best-effort async
   trigger).
3. The Worker cron (`*/5 * * * *`) calls `claim_tenant_provisioning_job` to
   process QUEUED jobs.
4. Alternatively, `POST /jobs/process` can be called to process one job.

## Provisioning Worker

- **Service**: `maara-tenant-provisioner` (Cloudflare Worker)
- **Entry**: `workers/tenant-provisioner/src/index.ts`
- **State machine**: `workers/tenant-provisioner/src/provisioning.ts`
- **Template bundle**: Embedded at build time via `workers/tenant-provisioner/scripts/embed-template.mjs`
  from `templates/commerce/template.config.json`
- **KV**: `TENANT_SECRETS` namespace stores database passwords referenced by
  `tenant_databases.database_password_secret_ref`
- **Cron**: `*/5 * * * *` — refreshes expiring connections and processes one job

## Files

- `workers/tenant-provisioner/` — Worker source, tests, config
- `infrastructure/supabase/migrations/20261125090000_platform_tenant_provisioning.sql` — Platform tables, RPCs, RLS
- `templates/commerce/migrations/` — 15 versioned migration SQL files
- `templates/commerce/seeds/` — 4 idempotent seed files
- `templates/commerce/tests/` — Verification SQL files
- `apps/admin/src/app/(auth)/onboarding/wizard.tsx` — Store Setup Wizard UI
- `apps/admin/src/app/api/onboarding/provision/route.ts` — Provision API route
- `apps/admin/src/app/api/onboarding/job-status/route.ts` — Job status API route

## Environment Variables

| Variable | Purpose |
|---|---|
| `TENANT_PROVISIONER_URL` | Public base URL of the provisioning Worker |
| `TENANT_PROVISIONER_SHARED_SECRET` | Shared secret for admin → Worker calls |
| `TENANT_ALLOWED_REGIONS` | Comma-separated allowed region codes |
| `PLATFORM_JWT_ISSUER` | Platform JWT issuer (optional) |
| `PLATFORM_JWT_AUDIENCE` | Platform JWT audience (optional) |
| `PLATFORM_JWKS_URL` | Platform JWKS URL (optional) |
