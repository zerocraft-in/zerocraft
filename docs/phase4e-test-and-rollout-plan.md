# Phase 4E-A — Test and Rollout Plan

**Status:** Preparation only. No live SQL, production data, migration deployment, feature-flag change, or Vercel deployment was performed.

## 1. Automated non-production tests

[phase4e-checkout-lifecycle-tests.mjs](../scripts/security/phase4e-checkout-lifecycle-tests.mjs) is a local fixture test. It does not load environment variables or create a Supabase client. It covers:

- Migration contract and pending-review marker.
- Duplicate checkout replay with the same fingerprint.
- Idempotency conflict with the same key and different payload.
- Concurrent checkout serialization and insufficient stock.
- Transaction rollback after reservation work.
- Reservation creation and idempotent release.
- Mixed-expiry protection: an order is not cancelled until every active reservation is expired.
- Cancellation state restriction: fulfilment-started orders cannot be cancelled through the MVP function.
- Customization consumption after successful checkout.
- Customer ownership isolation.
- Trusted-server authorization rejection.
- No direct `anon` or `authenticated` execute grants on lifecycle functions.

Run it with:

```text
npm.cmd run test:phase4e
```

This fixture suite validates application invariants, not PostgreSQL locking or RLS. It must be supplemented with disposable Supabase integration tests before deployment.

## 2. Disposable database integration matrix

Use a fresh non-production Supabase project or local PostgreSQL/Supabase environment. Do not point these tests at project `jamyqssytdzbiiahtmsq`.

| Scenario | Setup | Expected result |
|---|---|---|
| Anonymous RPC | Call checkout with anon credentials | Rejected; no order, item, reservation, or customization mutation |
| Customer direct RPC | Call checkout with authenticated customer credentials | Rejected by function grant |
| Server checkout | Invoke through the server route with a disposable customer | One order, items, reservations, and consumed customizations |
| Duplicate same request | Repeat same customer/key/fingerprint | Original order returned; no new reservation |
| Duplicate changed request | Same key, changed fingerprint | Conflict; no additional mutation |
| Concurrent requests | Two sessions/requests race for final unit | At most one reservation succeeds |
| Insufficient stock | Request more than `on_hand - reserved` | Rejected and no partial writes |
| Forced downstream failure | Inject failure after inventory update | Entire transaction rolls back |
| Foreign customization | Customer B submits Customer A’s path/metadata | Rejected; object and metadata unchanged |
| Already consumed customization | Reuse a consumed reference | Rejected; no new order/reservation |
| Release retry | Call release twice | First releases; second changes zero rows |
| Expiry retry | Expire an eligible order twice | First expires; second changes zero rows |
| Mixed expiry | One order has expired and unexpired reservations | No partial expiry/cancellation; later expiry releases all together |
| Cancellation state | Cancel pending/confirmed and fulfilling/shipped orders | Pre-fulfilment cancellation releases; fulfilment-started cancellation is rejected |
| Fulfillment retry | Fulfill an order twice | First decrements stock; second changes zero rows |
| Unauthorized lifecycle | Customer or staff calls lifecycle RPC | Rejected by grant and server-role check |
| RLS reservation read | Customer reads reservation table | Denied; staff policy only where intended |
| Private artwork | Customer A requests Customer B’s object | Denied; no signed URL |
| Signed URL expiry | Request URL, wait past TTL | URL no longer usable |
| Admin operation | Staff/manager/admin exercise module permissions | Exact role matrix enforced server-side |

Capture row counts and invariant checks, not customer data. Test fixtures must be deleted through the disposable environment’s reset process only.

## 3. Rollout sequence

### Gate A — Review

- Approve the lifecycle state machine and payment semantics.
- Review the pending SQL against the exact live metadata and dependencies.
- Decide whether the one-location allocation constraint remains acceptable.

### Gate B — Disposable deployment

- Apply the pending migration only to the disposable project.
- Run the full integration matrix and inspect PostgreSQL errors.
- Test retries, concurrent requests, transaction aborts, and worker retries.
- Verify function owner, `SECURITY DEFINER`, empty `search_path`, grants, and RLS.

### Gate C — Preview

- Deploy application code with checkout disabled.
- Verify hostname isolation and admin authorization.
- Run storefront regression tests and confirm no checkout mutation occurs while disabled.
- Use preview-only Supabase credentials and storage buckets.

### Gate D — Controlled production migration

- Take an approved metadata/backup snapshot and record the migration checksum.
- Apply the migration through the approved Supabase deployment process; do not use the SQL Editor for an untracked production change.
- Re-check function metadata, grants, constraints, indexes, and reservation counts without reading customer records.
- Keep the feature flag disabled while smoke tests run.

### Gate E — Enablement decision

- Run a controlled test order only if product, security, payment, and operations owners approve.
- Monitor checkout errors, reservation counts, inventory invariants, duplicate requests, and lifecycle job failures.
- Enable the flag gradually and retain an immediate disable procedure.

## 4. Rollback and failure handling

- **Before migration:** remove the pending draft from deployment input; no live rollback is needed.
- **After migration, before enablement:** leave the flag disabled. Prefer a forward-fix migration; do not delete reservation history or reverse an applied migration destructively.
- **Checkout incident:** disable the feature flag, stop new checkout attempts, preserve existing orders/reservations, and run an approved reconciliation report.
- **Payment incident:** stop capture/webhook processing as appropriate, use idempotent provider reconciliation, and release only through the service-role lifecycle function after review.
- **Inventory mismatch:** freeze fulfillment for affected orders and reconcile `on_hand`, `reserved`, and ledger totals before any manual correction.

## 5. Required production-readiness evidence

- Passed disposable database integration matrix.
- Passed application security, TypeScript, lint, build, storefront, and admin navigation checks.
- Verified no secret exposure in HTML, JSON, browser bundles, or logs.
- Approved Supabase migration checksum and deployment record.
- Approved payment and refund semantics.
- Documented expiry worker schedule and alerting.
- Documented reservation reconciliation query/report.
- Confirmed checkout flag is false in all environments until the enablement decision.

## 6. Current validation

The local fixture test is the only new Phase 4E-A test in this change. The following checks were run locally on 2026-10-16:

```text
npm.cmd run typecheck
npm.cmd run test:phase4e
npm.cmd run test:security
npm.cmd run verify:cart-correctness
npm.cmd run verify:checkout-correctness
npm.cmd run verify:commerce-correctness
npm.cmd run build
```

Results:

| Command | Result |
|---|---|
| `npm.cmd run typecheck` | **PASS** — route type generation and TypeScript completed. |
| `npm.cmd run test:phase4e` | **PASS** — contract checks plus isolated duplicate, concurrency, stock, rollback, ownership, consumption, authorization, and release scenarios. |
| `npm.cmd run test:security` | **Not rerun in this phase**; Phase 4D recorded the existing suite as passing. |
| `npm.cmd run verify:cart-correctness` | **Not rerun in this phase**; Phase 4D recorded 12 checks passing. |
| `npm.cmd run verify:checkout-correctness` | **PASS** — 6 checks. Node emitted non-fatal experimental/module-type warnings. |
| `npm.cmd run verify:commerce-correctness` | **PASS** — 13 checks. Node emitted a non-fatal module-type warning. |
| `npm.cmd run build` | **PASS** — Next.js 16.3.0 compiled, type-checked, generated 52 static pages, and exited successfully. |
| `git diff --check` | **PASS** — only existing CRLF normalization warnings were reported. |

The repository-wide ESLint baseline remains the Phase 4D result: 28 pre-existing errors and 20 warnings in unrelated demo/UI files. No unrelated lint fixes were made. No result above should be interpreted as production approval until the disposable PostgreSQL integration matrix passes.
