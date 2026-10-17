# Phase 4E-E — Staging Connection Verification

**Repository:** Zerocraft Studio  
**Approved staging project reference:** `leagpvolhukzdaxubmei`  
**Production project reference:** intentionally not used for any connection  
**Date:** 2026-10-16

## Executive result

**NO-GO for staging migration execution or database connection.**

The repository’s current Supabase link metadata points to the production project, not the approved staging project. The local/global CLI state is therefore unsafe for a remote command. The approved staging reference is textually different from the recorded production reference, but actual staging identity was not independently verified because the CLI cannot currently run and `psql` is unavailable.

No remote Supabase connection, migration list, dry run, SQL harness execution, link change, feature-flag change, or deployment was performed.

## 1. Project identity

| Item | Observed value | Classification |
|---|---|---|
| Approved staging reference supplied for this task | `leagpvolhukzdaxubmei` | User-provided; not remotely verified |
| Repository recorded link | `jamyqssytdzbiiahtmsq` | Read locally from [supabase/.temp/project-ref](../supabase/.temp/project-ref) |
| Reference comparison | Different | VERIFIED by local string comparison |
| Current link target | Production reference | VERIFIED by local file inspection |
| Staging project identity/API response | Not obtained | UNVERIFIED |

The project reference comparison prevents an accidental assumption that the current link is staging. It does not prove that the supplied staging reference resolves to the intended Supabase project; that requires an authenticated, read-only CLI/API check after the repository is safely detached from production or an isolated checkout is used.

## 2. Git and working-tree preservation

The existing working tree contains prior Phase 2–4E changes, pending migration files, staging preparation files, and unrelated deletions/modifications. No existing changes were reverted or overwritten.

The current link file remains unchanged and still contains the production reference. This is intentional: changing it would be a repository-state mutation requiring explicit approval.

## 3. Supabase CLI and PostgreSQL availability

### Global tools

- Global `supabase`: **UNAVAILABLE** — PowerShell could not resolve the command.
- Global `psql`: **UNAVAILABLE** — PowerShell could not resolve the command.

### Repository-local CLI

The repository contains the local Supabase CLI package and binaries under `node_modules/.bin`, version `2.121.0` according to its package metadata. Invoking the local CLI did not reach a project: it failed locally while attempting to write Supabase telemetry under the user profile with `EPERM`.

The attempted local CLI invocation produced no project identity, migration state, or credentials. It was not a remote connection. No retry with elevated permissions was made because the repository is still linked to production and no target-changing action is authorized.

### PostgreSQL client

No `psql` executable is available in the current shell, so the prepared SQL harness cannot be run from this environment.

## 4. Migration inventory

The repository contains these 11 migration files in lexicographic order:

1. `20261013043854_secure_studio_auth_and_commerce.sql`
2. `202610160001_commerce_foundation.sql`
3. `202610160002_storage_foundation.sql`
4. `202610160003_transactional_checkout.sql`
5. `202610160004_checkout_runtime_hardening.sql`
6. `202610160005_studio_product_write_hardening.sql`
7. `202610160006_purchase_orders.sql`
8. `202610160007_purchase_order_receiving.sql`
9. `202610160008_inventory_transfers.sql`
10. `202610160009_backfill_checkout_money.sql`
11. [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql) — pending review

The Phase 4E-D setup document correctly identifies `010` as depending on base commerce/auth, inventory, checkout/customization, reservation, money, and Storage objects. The pending migration must be applied only after all preceding migrations in a separately approved staging project.

## 5. Existing CLI link state

The local link state is stored in [supabase/.temp/project-ref](../supabase/.temp/project-ref) and currently contains the production reference. There is no repository `supabase/config.toml`.

The following commands were intentionally **not run** because they would use the current production link:

```text
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
```

Running any `--linked` command before safely targeting staging would violate the task’s production-safety boundary.

## 6. Staging-only dry-run readiness

The commands below are prepared for the next approved stage. They were not executed. Because `supabase link` changes repository link state, it requires explicit operator approval or an isolated checkout/worktree.

### Preferred isolated workflow

Use a separate checkout or approved temporary worktree containing the same migration files. In that isolated copy:

```text
supabase login
supabase link --project-ref leagpvolhukzdaxubmei
supabase migration list --linked
supabase db push --linked --dry-run
```

Before any `--linked` command, verify CLI output identifies `leagpvolhukzdaxubmei`. Do not run `db push` until the migration plan, project identity, environment separation, and operator approval are recorded.

### If the current checkout must be relinked

Stop and obtain explicit approval first. Record the current production link out-of-band, then run only the approved staging link command:

```text
supabase link --project-ref leagpvolhukzdaxubmei
supabase migration list --linked
supabase db push --linked --dry-run
```

Do not overwrite `.env.local`. Do not pass service-role keys or database passwords on the command line. Do not run `supabase db push --linked` in this checkout until the operator confirms the target is staging.

The Phase 4E-D `psql` command remains prepared in [phase4e-d-staging-setup.md](../docs/phase4e-d-staging-setup.md:86), but cannot be executed until a staging-only `STAGING_DATABASE_URL`, PostgreSQL client, disposable Auth identities, and target verification are available.

## 7. Staging SQL harness safety review

The prepared harness is [phase4e-d-database-integration-tests.sql](../supabase/staging/phase4e-d-database-integration-tests.sql).

### Safe by inspection

- Requires `STAGING_PROJECT_REF`, `CUSTOMER_A_ID`, and `CUSTOMER_B_ID` variables before continuing.
- Uses synthetic product, variant, location, and inventory fixtures.
- Does not create Auth users or query production records.
- Wraps fixture mutations in `BEGIN` and ends with `ROLLBACK`.
- Uses synthetic checkout keys and COD payloads.
- Includes duplicate retry, idempotency conflict, release, expiry, fulfilment, and invariant assertions.
- Explicitly states that RLS/Storage tests must use separate disposable client sessions.
- Contains no service-role key, database URL, token, or signed URL.

### Safety limitations requiring operator control

- The harness requires the operator to verify the project reference; it does not independently resolve or authenticate the project identity.
- The `STAGING_PROJECT_REF` variable alone cannot prevent a user from supplying the wrong reference.
- The SQL session sets a `service_role` JWT claim for database-function testing; this is acceptable only in an isolated staging database and is not RLS evidence.
- RLS and Storage behavior is not tested by the service-role SQL session; those tests require separate customer/staff/admin sessions.
- Two-session concurrency, failure injection after mutation boundaries, and signed URL expiry remain prepared test-plan items rather than harness results.
- The harness has not been parsed or executed by PostgreSQL in this environment.

## 8. Migration-state verification

The staging database’s recorded migrations are **UNVERIFIED**. No safe read-only query was possible because:

1. The current repository link targets production.
2. The approved staging reference is not linked.
3. The global CLI and `psql` are unavailable.
4. The local CLI cannot start due to a local telemetry-file permission error.

The next approved read-only command is:

```text
supabase migration list --linked
```

It must be run only after the CLI target is independently confirmed as `leagpvolhukzdaxubmei`.

## 9. Security blockers

| Severity | Blocker | Status |
|---|---|---|
| Critical | Current link points to production | Must not run linked remote commands |
| High | Staging identity/API response not independently verified | Requires approved read-only staging connection |
| High | Global `supabase` and `psql` unavailable | Install/provide approved tooling without changing production link |
| Medium | Local CLI telemetry write fails with `EPERM` | Resolve in tooling environment or use approved CLI binary; do not elevate against production link |
| Medium | Harness project guard is operator-driven | Verify target separately before execution |
| Medium | RLS/Storage/concurrency tests are unexecuted | Require disposable identities and two independent sessions |
| Low | No repository `supabase/config.toml` | Not itself unsafe; link state is currently controlled by `.temp/project-ref` |

## 10. GO / NO-GO decision

**NO-GO for staging migration execution.**

The repository is ready for an operator-controlled staging workflow, but this checkout is not safe for remote commands because it remains linked to production and the target cannot be independently verified. Required next actions are:

1. Obtain approval for an isolated checkout/worktree or relinking this checkout.
2. Provide an approved working Supabase CLI and PostgreSQL client.
3. Link only to `leagpvolhukzdaxubmei` in the isolated context.
4. Run read-only migration listing and confirm project identity.
5. Run the migration dry run and review the plan.
6. Only after explicit approval, apply migrations to staging and run the SQL harness.

No migration, SQL harness, feature flag, production environment, or Vercel deployment was changed.
