# Phase 4E-E Gate B — Isolated Staging Worktree Report

**Original repository:** `D:\projects\zerocraft`  
**Staging worktree:** `D:\projects\zerocraft-staging`  
**Staging branch:** `phase4e-e-staging`  
**Approved staging project:** `leagpvolhukzdaxubmei`  
**Protected production project:** `jamyqssytdzbiiahtmsq`

## Executive result

The isolated local worktree was created successfully without modifying the original working tree. Only the explicit Phase 4E migration, reports, staging SQL harness, and credential-free test scripts were transferred.

The staging worktree does not contain `.env.local`, `supabase/.temp`, `supabase/config.toml`, or active production link metadata after cleanup. The base checkout did include `supabase/.temp` because those metadata files are tracked in the repository; they were removed only from the isolated staging worktree and remain as uncommitted deletions there. It contains all 11 expected migration files, including the pending `202610160010` migration.

**Recommendation: NO-GO for staging connection at this time.** No Supabase connection, migration listing, SQL execution, migration deployment, feature-flag change, or Vercel deployment was performed. The next connection requires approved CLI tooling and explicit target verification against `leagpvolhukzdaxubmei`.

## 1. Original repository preservation checks

- Original branch: `main`.
- Original `HEAD`: `1208c599c2354fd7129f0274ae2da00da58d618e`.
- Original working tree had existing Phase 2–4E modifications, untracked reports/scripts, the pending migration, and unrelated deletions. These were not reset, stashed, committed, or cherry-picked.
- Original production link metadata remains at [supabase/.temp/project-ref](../supabase/.temp/project-ref) with the protected production reference.
- Original status was rechecked after worktree creation and file transfer; prior changes remain present.
- No original application, applied migration, environment, or Supabase link file was edited.

## 2. Worktree creation

Git created:

- Worktree: `D:\projects\zerocraft-staging`
- Branch: `phase4e-e-staging`
- Base: original committed `main` `HEAD`

The first worktree command was blocked by local Git lock-file permissions. The same narrowly scoped `git worktree add` operation succeeded with approved local elevation. No remote Git operation occurred.

The worktree initially contained only the committed repository checkout. It did not contain the original uncommitted application changes until the explicit Phase 4E transfer.

## 3. Required Phase 4E file inventory

Transferred explicitly:

- [phase4c-live-supabase-verification.md](../docs/phase4c-live-supabase-verification.md)
- [phase4d-security-runtime-readiness.md](../docs/phase4d-security-runtime-readiness.md)
- [phase4e-b-migration-preflight-review.md](../docs/phase4e-b-migration-preflight-review.md)
- [phase4e-c-correction-report.md](../docs/phase4e-c-correction-report.md)
- [phase4e-checkout-lifecycle-design.md](../docs/phase4e-checkout-lifecycle-design.md)
- [phase4e-test-and-rollout-plan.md](../docs/phase4e-test-and-rollout-plan.md)
- [phase4e-d-integration-test-plan.md](../docs/phase4e-d-integration-test-plan.md)
- [phase4e-d-staging-setup.md](../docs/phase4e-d-staging-setup.md)
- [phase4e-e-staging-connection-verification.md](../docs/phase4e-e-staging-connection-verification.md)
- [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql)
- [phase4e-d-database-integration-tests.sql](../supabase/staging/phase4e-d-database-integration-tests.sql)
- [phase4e-checkout-lifecycle-tests.mjs](../scripts/security/phase4e-checkout-lifecycle-tests.mjs)
- [phase4e-d-static-checks.mjs](../scripts/security/phase4e-d-static-checks.mjs)

Intentionally not retained in the staging worktree:

- `.env.local` and all environment values.
- `supabase/.temp` and its project link metadata. These files are tracked in the base repository, so the fresh worktree initially materialized them; they were then removed only from the staging worktree. The original files were not changed.
- `supabase/config.toml`.
- `package.json`, because the original file contains unrelated prior working-tree changes. The copied checks were run directly with Node.
- Any service-role key, database password, webhook secret, production connection string, or customer data.

## 4. Migration inventory

The staging worktree contains exactly 11 migration files:

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
11. `202610160010_checkout_reservation_lifecycle_pending.sql`

The first ten are the committed migration history; `010` is the transferred pending draft. No applied migration history was changed.

## 5. Supabase CLI availability

- Global `supabase`: unavailable in the current PowerShell environment.
- Repository-local Supabase CLI package: present under `node_modules`, package version `2.121.0` in the original repository.
- Local CLI invocation: blocked before any remote operation because it attempted to write a user-profile telemetry file and received `EPERM`.
- No security control was disabled, no telemetry setting was changed, and no elevated CLI retry was performed.

The staging worktree does not currently have a copied `node_modules` directory. A future operator may use an approved local CLI installation or install dependencies in the isolated worktree without copying production credentials.

## 6. PostgreSQL client availability

`psql` was not available in the current shell. The prepared SQL harness therefore was not executed.

Safe installation options for the next operator stage:

- Install PostgreSQL client tools from the approved PostgreSQL distribution and add only the client `bin` directory to the isolated shell’s `PATH`.
- Use an approved Supabase CLI environment that provides `psql` or an equivalent controlled database client.
- Verify `psql --version` and the target project independently before using `STAGING_DATABASE_URL`.

Do not install Docker, use production connection strings, or place passwords in command history.

## 7. Link isolation verification

The staging worktree was checked after transfer:

| Path | Result |
|---|---|
| `.env.local` | Absent |
| `supabase/.temp` | Removed; absent |
| `supabase/config.toml` | Absent |
| `supabase/.temp/project-ref` | Absent |
| Original `supabase/.temp/project-ref` | Still present and untouched |

The tracked `.temp` directory unexpectedly materialized in the new worktree and contained the production link reference. It was verified as the exact staging-worktree path and removed with a narrowly scoped operation. The staging worktree now shows only those metadata files as uncommitted deletions; they must not be restored or committed on the staging branch. The original repository’s metadata was confirmed to remain present afterward.

## 8. Credential-free local checks

Run from `D:\projects\zerocraft-staging`:

```text
node scripts/security/phase4e-d-static-checks.mjs
node scripts/security/phase4e-checkout-lifecycle-tests.mjs
```

Results:

- `phase4e-d-static-checks.mjs`: **PASS**.
- `phase4e-checkout-lifecycle-tests.mjs`: **PASS**.
- Neither script loads environment variables, connects to Supabase, executes SQL, or accesses customer data.
- Migration count: **11**.

## 9. Remaining blockers

1. The approved staging project has not been independently contacted or verified.
2. No Supabase CLI is currently usable without resolving the local telemetry-file permission issue or providing an approved CLI binary.
3. No PostgreSQL client is available.
4. The isolated branch has not been linked to staging.
5. Migration dry-run and recorded migration state are unverified.
6. SQL lifecycle, RLS, Storage, and two-session concurrency tests remain unexecuted.
7. Checkout remains disabled and the pending migration remains unapplied.

## 10. Staging-only connection instructions

Use an isolated checkout and obtain operator approval before running any linked command:

```text
supabase login
supabase link --project-ref leagpvolhukzdaxubmei
supabase migration list --linked
supabase db push --linked --dry-run
```

Confirm the CLI output identifies `leagpvolhukzdaxubmei` before any further command. Do not run these commands from the original production-linked checkout. Do not execute `db push`, SQL, or the harness until project identity, credentials, feature flags, and fixture policy are approved.

## Final decision

**NO-GO for staging connection and migration execution.** The isolated worktree is prepared and locally validated, but remote target verification and required database tooling are not yet available. The next stage requires explicit approval to use the isolated branch, an approved Supabase CLI/`psql` installation, and independent confirmation that every remote command targets `leagpvolhukzdaxubmei`.
