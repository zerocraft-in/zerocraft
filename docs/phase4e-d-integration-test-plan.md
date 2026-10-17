# Phase 4E-D — Disposable Integration Test Plan

**Status:** Prepared, not executed. All database and Storage cases below require an approved disposable Supabase project.

## Evidence labels

- **Prepared:** test or command exists in the repository but has not been run against PostgreSQL.
- **Local-only:** repository/static or fixture checks; not evidence of PostgreSQL behavior.
- **Staging-required:** must run against the isolated staging project.

The only local validation performed for this preparation is the static checker described below. No SQL was executed.

## Test artifacts

- [phase4e-d-database-integration-tests.sql](../supabase/staging/phase4e-d-database-integration-tests.sql): prepared psql harness for database lifecycle, grants, constraints, and staging fixtures.
- [phase4e-d-static-checks.mjs](../scripts/security/phase4e-d-static-checks.mjs): local static checker; reads files only and never loads credentials or executes SQL.

## Database lifecycle matrix

| Case | Staging setup | Expected invariant |
|---|---|---|
| Fresh migration install | Apply all tracked migrations in order | All required tables, constraints, functions, indexes, and policies exist |
| Checkout success | Active physical variant with available stock | One order, one order item, one reservation, `reserved` incremented, request completed |
| Duplicate retry | Same customer/key/fingerprint twice | Same order replayed; no extra order, item, or reservation |
| Idempotency conflict | Same key with changed fingerprint | Conflict; no new mutation |
| Insufficient stock | Request above `on_hand - reserved` | Error; no order, item, reservation, counter, or customization mutation |
| Rollback after mutation | Inject a staging-only downstream failure | All order, item, reservation, counter, request, and customization changes roll back |
| Release retry | Release same order twice | First call releases; second changes zero rows; counter never negative |
| Mixed expiry | Same order with expired and unexpired reservations | First expiry call changes nothing; after all expire, all release and order cancels |
| Cancellation state | Cancel pending/confirmed and fulfilling/shipped orders | Pre-fulfilment cancellation releases; fulfilment-started cancellation is rejected |
| Fulfilment retry | Fulfil an order twice | First call decrements `on_hand`/`reserved`; second changes zero rows |
| Expired order retry | Expire cancelled order twice | Second call changes zero rows |
| Customization consumption | Valid private object and ready metadata | Metadata becomes consumed atomically; reuse is rejected |
| Foreign customization | Customer B submits Customer A path | Rejected; no order or reservation |
| Currency authority | Catalog price differs from browser payload | Server catalog price controls order snapshot |

## Role and RLS matrix

Run these with separate Supabase client sessions using disposable identities. Do not emulate roles by merely changing a browser header.

| Actor | Direct checkout RPC | Own order read | Other customer order | Reservation read | Private artwork |
|---|---|---|---|---|---|
| Anonymous | Denied | Denied | Denied | Denied | Denied |
| Customer A | Denied by grant | Own only, if policy permits | Denied | Denied | Own only |
| Staff/manager | Denied by grant | Studio policy only | Studio policy only | Studio policy only | Studio policy only |
| Administrator | Denied by grant | Admin policy only | Admin policy only | Admin policy only | Admin policy only |
| Server service role | Allowed only from approved server path | Explicitly scoped | Explicitly scoped | Explicitly scoped | Explicitly scoped |

Verify policy behavior with `select`, `insert`, `update`, and `delete` attempts where the schema grants them. Confirm that service-role use is never exposed to client JavaScript.

## Storage tests

Staging-only Storage tests must:

1. Upload synthetic artwork under Customer A’s UUID in the private customer-customizations bucket.
2. Confirm Customer A can use the approved application path and Customer B cannot read or sign it.
3. Confirm a signed URL expires at the configured TTL.
4. Confirm registered `ready`/`consumed` artwork cannot be overwritten or deleted by the customer.
5. Confirm product-media public reads do not expose customer artwork.
6. Confirm invalid path, MIME, size, and cross-user operations fail.
7. Remove synthetic objects during staging cleanup.

No production customer file may be used.

## Two-session concurrency strategy

Use two independent database sessions, not two promises in one process:

1. Seed one available physical unit.
2. In Session A, call the server checkout path with a unique idempotency key and pause at a controlled test barrier if available.
3. In Session B, call checkout for the same variant with a different key.
4. Release the barrier and collect only status/error codes and invariant counts.
5. Expect one success and one `OUT_OF_STOCK`; `reserved` must equal one and exactly one active ledger row must exist.
6. Repeat with multi-line checkouts in opposite input order to detect lock-order deadlocks.
7. Repeat duplicate same-key calls concurrently and expect one order with replay behavior.

The harness must have a bounded timeout and must abort both sessions on failure. Do not leave open transactions or locks in staging.

## Rollback and cleanup verification

Test rollback at these boundaries in staging:

- After request row insertion.
- After order insertion.
- After order-item insertion.
- After inventory counter update.
- After reservation insertion.
- After customization consumption.

Use a staging-only failure injection mechanism approved by the operator. Do not add test triggers or failure hooks to production migrations. After each abort, verify all related counts and inventory counters are unchanged.

## Required staging evidence

- Migration output and checksum, excluding secrets.
- Function signature, owner, `prosecdef`, empty search path, and ACL metadata.
- RLS enabled/policy metadata and role test results.
- Storage bucket/policy metadata and synthetic-object access results.
- Lifecycle result matrix and invariant counts.
- Two-session concurrency results.
- Cleanup/reset confirmation.

No evidence should contain email addresses, tokens, database URLs, service-role keys, signed URLs, customer records, or artwork bytes.
