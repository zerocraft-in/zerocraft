# Provisioning Recovery Runbook

## Scope

Covers recovery from failed, stuck, or reauthorization-required tenant
provisioning jobs. All actions are local/development only — no production DB
changes, no `wrangler deploy`, no `supabase db push`.

## Prerequisites

- Platform DB is accessible (via Supabase client or direct SQL review)
- Worker is deployed or running via `wrangler dev`
- Owner access to the affected organization
- Valid Supabase OAuth connection (or ability to re-authenticate)

## Job Status Reference

| Status | Meaning | Recovery Action |
|---|---|---|
| `QUEUED` | Waiting for Worker | Wait for cron, or call `POST /jobs/process` |
| `RUNNING` | Worker active | Check heartbeat; if stale (>15 min), cron will reclaim |
| `SUCCEEDED` | Complete | No action |
| `FAILED` | Terminal failure | Inspect `error_code` / `error_message`, then retry |
| `CANCELLED` | Owner-cancelled | Retry via `retry_tenant_provisioning_job` |
| `NEEDS_REAUTHORIZATION` | OAuth expired/revoked | Reconnect Supabase account, then retry |

## Common Failure Modes

### 1. Job FAILED — `VALIDATION_FAILED`

**Cause**: Invalid input (bad project name, region not allowed, missing store/connection).

**Recovery**:
1. Check `error_message` in `tenant_provisioning_jobs`.
2. Fix the input (region, store slug, connection).
3. Call `retry_tenant_provisioning_job(job_id)`.

### 2. Job FAILED — `TEMPLATE_CHECKSUM_MISMATCH`

**Cause**: A template file's stored checksum differs from the bundle's checksum.
This means the template was modified after a previous partial install.

**Recovery**:
1. Do NOT attempt to repair the mismatch.
2. Restore `templates/commerce/` to the version that was originally applied
   (check `tenant_migrations` for the stored checksum).
3. Or cancel the job and start fresh with a new store.
4. Retry via `retry_tenant_provisioning_job(job_id)`.

### 3. Job NEEDS_REAUTHORIZATION

**Cause**: Supabase OAuth access token expired and refresh failed (401/403),
or the connection was revoked in Supabase.

**Recovery**:
1. Re-run the OAuth flow: The owner reconnects their Supabase account via the
   Store Setup Wizard (`/onboarding/setup?organizationId=...`).
2. This creates a new `supabase_connections` row with fresh tokens.
3. Retry the failed job via `retry_tenant_provisioning_job(job_id)`.

### 4. Job FAILED — `PROJECT_NOT_READY`

**Cause**: The Supabase project did not reach `ACTIVE_HEALTHY` within the
polling limit (default 12 polls × 5s = 60s).

**Recovery**:
1. The job is automatically requeued if `attempt_count < max_attempts`.
2. Check the project status in the Supabase dashboard.
3. If the project is in a terminal state (`INACTIVE`, `PAUSED`, `REMOVING`),
   cancel the job and create a new store.
4. Otherwise, retry via `retry_tenant_provisioning_job(job_id)`.

### 5. Job FAILED — `MANAGEMENT_API_409` / `MANAGEMENT_API_422`

**Cause**: Project name conflict — a project with the same name already exists
in the Supabase organization.

**Recovery**:
1. The Worker already attempts to match by name + organization.
2. If no match is found, choose a different `project_name` (store slug).
3. Retry via `retry_tenant_provisioning_job(job_id)`.

### 6. Stuck RUNNING Job (Worker crashed)

**Cause**: Worker crashed or was evicted mid-job; heartbeat is stale.

**Recovery**:
1. The Worker cron (`*/5 * * * *`) reclaims jobs where
   `status = 'RUNNING' AND heartbeat_at < now() - interval '15 minutes'`.
2. Or manually call `POST /jobs/process` to trigger a claim.
3. Reclaimed jobs resume from their last step; applied files are skipped by
   checksum.

## CLI Commands

### Check job status via SQL (review only)

```sql
SELECT id, status, current_step, progress, error_code, error_message,
       attempt_count, max_attempts, heartbeat_at
FROM public.tenant_provisioning_jobs
WHERE id = '<job-id>';
```

### View job steps

```sql
SELECT step, status, message, started_at, finished_at
FROM public.tenant_provisioning_job_steps
WHERE job_id = '<job-id>'
ORDER BY created_at;
```

### Retry a failed job (owner only, via RPC)

```sql
SELECT public.retry_tenant_provisioning_job('<job-id>');
```

### Cancel a job (owner only, via RPC)

```sql
SELECT public.cancel_tenant_provisioning_job('<job-id>');
```

### Check for connections needing reauth

```sql
SELECT id, account_name, connection_status, last_error_code,
       access_token_expires_at
FROM public.supabase_connections
WHERE connection_status = 'needs_reauth';
```

## Worker Debug Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/health` | GET | None | Worker health check |
| `/jobs/process` | POST | Shared secret | Process one QUEUED job |
| `/jobs/start` | POST | Shared secret | Trigger a specific job by ID |
| `/jobs/{jobId}` | GET | Shared secret | Get job status and steps |
| `/admin/template/register` | POST | Shared secret | Register template version |

## Cron

The Worker runs on `*/5 * * * *`:
1. `refreshExpiringConnections()` — Refreshes access tokens expiring within 10 minutes
2. `claimAndRunOne("cron")` — Claims and runs one QUEUED job

## What NOT to Do

- Do not manually update `tenant_provisioning_jobs.status` directly — use the RPCs.
- Do not delete `tenant_migrations` rows — they are the immutable checksum ledger.
- Do not reinstall the template into a project that has `APPLIED` migration rows
  without resolving checksum mismatches first.
- Do not store database passwords in the Platform DB — they live in KV only.
- Do not run `wrangler deploy` or `supabase db push` — local development only.

## Escalation

If a job cannot be recovered through the above steps:

1. Cancel the job: `cancel_tenant_provisioning_job(job_id)`.
2. Create a new store and provisioning job.
3. Investigate the Worker logs for the root cause.
4. Review `platform_audit_events` for the organization's provisioning history.
