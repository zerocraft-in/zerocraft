# Phase 4E-B — Checkout Migration Preflight Review

**Project:** Zerocraft Studio  
**Supabase project:** `jamyqssytdzbiiahtmsq`  
**Review date:** 2026-10-16  
**Scope:** Read-only static review of the pending checkout reservation migration

## Executive recommendation

**NO-GO.** Do not apply [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql), do not enable transactional checkout, and do not treat the Phase 4E-A fixture suite as SQL-runtime validation.

The pending migration has a release-blocking SQL defect at lines 160–162: the `jsonb_to_recordset` definition uses quoted camelCase output names (`"productId"`, `"variantId"`, and `"customizationReference"`), while the immediately generated JSON references `x.product_id`, `x.variant_id`, and `x.customization_reference`. Those identifiers do not exist in the record alias. The migration requires correction and disposable PostgreSQL execution before review can proceed.

Additional blockers remain around partial reservation expiry, cancellation of already-fulfilling orders, payment confirmation, refunds/returns, live reservation reconciliation, exact function ownership, and multi-location inventory policy.

No SQL was executed, no live metadata was queried, no migration was deployed, no feature flag changed, and no production data was accessed.

## Classification key

- **VERIFIED — static inspection:** directly established from repository source and migration text.
- **VERIFIED — local tests:** established by the local fixture/contract tests only.
- **UNVERIFIED — database execution required:** cannot be established without PostgreSQL/Supabase execution.
- **BLOCKED — business decision required:** behavior cannot be safely finalized without an approved product/payment/operations rule.

## Findings

### Critical — pending function has invalid record-field references

**Classification:** VERIFIED — static inspection  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:158)

At lines 164–166 the record alias is declared as:

```sql
"productId" uuid, "variantId" uuid, "customizationReference" text
```

But lines 160–162 reference `x.product_id`, `x.variant_id`, and `x.customization_reference`. PostgreSQL treats the quoted names as case-sensitive identifiers, so these snake_case fields are not present. The checkout function cannot be considered deployable or executable until the references are made consistent.

**Required correction:** use the quoted camelCase fields consistently, or declare snake_case aliases and explicitly transform the JSON input. Add a disposable PostgreSQL test that creates the function and invokes one physical and one digital line; the current fixture test cannot detect this SQL binding error.

### High — reservation expiry can cancel an order while leaving active reservations

**Classification:** VERIFIED — static inspection  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:384)

`expire_order_reservations` processes only rows whose `expires_at <= now()` at lines 393–400, then cancels the order when any row was expired at lines 403–404. If an order has multiple reservations with different expiry times, some rows can remain `reserved` after the order is marked `cancelled`. The inventory counter then remains inflated and the order is no longer eligible for the normal pending-payment path.

**Required correction:** either require that all active reservations for the order are expired before cancelling, or release/expire the complete order under one explicit policy. Add an invariant test asserting that a cancelled order has no `reserved` ledger rows.

### High — cancellation can release inventory for fulfilment orders

**Classification:** VERIFIED — static inspection  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:431)

`cancel_order_with_reservations` calls the release function and then updates every order whose status is not `completed` at lines 438–440. That includes `confirmed`, `fulfilling`, and `shipped`. Releasing a reservation after fulfilment has begun can make inventory available for another sale while the original order still expects the unit.

**Required correction:** define an explicit allowed source-state set, normally `pending`/`confirmed` before fulfilment, and reject cancellation after fulfilment begins unless a separate return/restock workflow is used.

### High — payment success is described but not implemented

**Classification:** BLOCKED — business decision required  
**Files:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:349), [phase4e-checkout-lifecycle-design.md](../docs/phase4e-checkout-lifecycle-design.md:48)

The draft creates a pending/unpaid order and reservation, but provides no payment-success function, provider-reference field, signed webhook handler, capture transition, or duplicate payment-event idempotency. The design document lists payment success as a state transition, but the migration does not implement it. The current application route accepts COD only through [checkout-server.ts](../lib/commerce/checkout-server.ts:63).

**Required correction:** approve the payment model first. For COD, define whether `payment_status` remains `unpaid` until delivery. For online payment, add a provider event identity, authenticated webhook processing, idempotent payment transition, and explicit reservation behavior.

### High — refunds and returns have no implemented inventory transition

**Classification:** BLOCKED — business decision required  
**Files:** [phase4e-checkout-lifecycle-design.md](../docs/phase4e-checkout-lifecycle-design.md:57), [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:408)

The draft supports reservation release and fulfilment, but no refund or return workflow. A returned unit may be restockable, damaged, or pending inspection. Automatically increasing `on_hand` would be unsafe without an approved disposition and movement reason.

**Required correction:** design a separate return/refund model and inventory movement workflow. Do not treat payment status `refunded` as proof that physical inventory can be restocked.

### High — current applied checkout still has no ledger writes

**Classification:** VERIFIED — static inspection; live behavior UNVERIFIED  
**Files:** [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql:327), [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql:400), [202610160004_checkout_runtime_hardening.sql](../supabase/migrations/202610160004_checkout_runtime_hardening.sql:105)

The applied function increments `store_inventory_levels.reserved` at lines 340–342 but does not insert into `store_inventory_reservations`. The hardening migration explicitly states that the deployed RPC does not write the ledger. The pending replacement addresses the intended gap, but its runtime behavior remains unverified until PostgreSQL execution.

**Required correction:** reconcile any existing orders, `reserved` counters, and ledger rows in a non-disclosing preflight before deployment. Do not assume the live ledger is empty or internally consistent.

### High — one-location allocation is safe only under an explicit business constraint

**Classification:** VERIFIED — static inspection; BLOCKED for multi-location commerce  
**Files:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:253), [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql:327), [phase4e-checkout-lifecycle-design.md](../docs/phase4e-checkout-lifecycle-design.md:28)

Both the current and pending functions require exactly one inventory level for a physical variant. This avoids ambiguous allocation, but it rejects valid multi-location inventory and does not implement a reservation allocation strategy across locations.

**Required correction:** explicitly approve the one-location limitation for launch or design a deterministic location allocation policy with ordered locks and per-location ledger rows.

### Medium — deterministic locking reduces deadlocks but is not proven against all writers

**Classification:** VERIFIED — static inspection; UNVERIFIED — database execution required  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:155)

The draft sorts cart lines by product, variant, customization, and option values before product and inventory locking. It then locks the inventory level with `FOR UPDATE` at lines 315–318 before checking `on_hand - reserved` and updating `reserved` at lines 319–324. This is a sound pattern for competing checkout calls using the same function.

It does not prove deadlock freedom against studio inventory operations, purchase-order receiving, transfers, or any future writer that locks rows in a different order. Concurrent PostgreSQL tests are required.

### Medium — atomicity is structurally intended but not runtime verified

**Classification:** VERIFIED — static inspection; VERIFIED — local fixture only; UNVERIFIED — database execution required  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:298)

The order, order-item, inventory counter, reservation ledger, customization consumption, and checkout-request completion occur inside one PL/pgSQL function. An exception should roll back the transaction. The local fixture exercises an analogous rollback model, but does not execute PostgreSQL triggers, constraints, RLS, generated defaults, or function exception semantics.

**Required correction:** execute a disposable database test that injects failure after each mutation boundary and verifies zero partial rows and unchanged inventory counters.

### Medium — idempotency behavior is structurally sound but requires database concurrency testing

**Classification:** VERIFIED — static inspection; VERIFIED — local fixture only; UNVERIFIED — database execution required  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:133)

The unique `(customer_id, idempotency_key)` constraint from [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql:29) and the `INSERT ... ON CONFLICT DO NOTHING` followed by `FOR UPDATE` serialize retries. Fingerprint mismatch is rejected, and an existing `order_id` is replayed.

The database must still be tested with two concurrent sessions, a crash/abort between request insertion and order completion, and a retry after transaction rollback. The fixture test cannot establish PostgreSQL row-lock behavior.

### Medium — lifecycle constraints do not fully encode audit reasons

**Classification:** VERIFIED — static inspection  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:21)

`release_reason` is nullable and unconstrained. The lifecycle check validates timestamps but does not require a reason for `released` or `expired`. This weakens operational auditability and makes payment failure, operator cancellation, and timeout indistinguishable except by external logs.

**Required correction:** define an allowed reason set and require it for terminal release states, or document why free-form reasons are intentional.

### Medium — function ownership and existing live grants remain unverified

**Classification:** UNVERIFIED — database execution required  
**Files:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:40), [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:363)

The functions use `SECURITY DEFINER`, `set search_path = ''`, fully qualified application tables, and explicit revocation from `public`, `anon`, and `authenticated`, with `service_role` grants. This is the correct static shape.

`CREATE OR REPLACE FUNCTION` retains the existing function owner. The owner, ACL, default privileges, and Supabase role behavior must be checked in the disposable database and compared with live metadata before deployment. The review did not execute SQL.

### Medium — constraint replacement may fail or be unsafe if live names/data differ

**Classification:** UNVERIFIED — database execution required  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:14)

The draft drops constraints by assumed names and recreates them. Repository history suggests the generated names, but exact live constraint names and existing reservation rows were not queried in this review. A mismatch can leave the old status constraint in place and reject `expired`; invalid legacy timestamps could make the new lifecycle constraint fail.

**Required correction:** inspect exact live constraint names and reservation-state counts in a read-only preflight, then test the migration against a schema snapshot containing representative legacy rows.

### Medium — expiry has no scheduled worker or bulk operation

**Classification:** BLOCKED — operational design required  
**Files:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:384), [phase4e-checkout-lifecycle-design.md](../docs/phase4e-checkout-lifecycle-design.md:80)

The function expires one order at a time. No cron route, queue worker, retry policy, alert, or bounded batch process is included. Reserved inventory can therefore remain unavailable after the 30-minute expiry until another trusted process calls the function.

**Required correction:** define an authenticated service-worker schedule, bounded batch selection, retry behavior, and monitoring before enabling checkout.

### Low — pending migration has no destructive table/data operation, but rollback is forward-only

**Classification:** VERIFIED — static inspection  
**File:** [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:10)

The draft does not delete tables, rows, orders, inventory objects, or Storage objects. It does drop and recreate constraints and replaces function bodies. Once applied, restoring the previous function body requires a reviewed forward migration; there is no safe automatic rollback that can reconstruct prior function ownership/body state. The existing [202610160009_backfill_checkout_money.sql](../supabase/migrations/202610160009_backfill_checkout_money.sql:1) already performed irreversible price backfills on legacy rows and must not be treated as rollbackable.

## Migration dependency matrix

| Dependency | Repository evidence | Pending migration use | Review result |
|---|---|---|---|
| Base `store_orders`, products, variants, status checks | [20261013043854_secure_studio_auth_and_commerce.sql](../supabase/migrations/20261013043854_secure_studio_auth_and_commerce.sql:4) | Inserts pending orders and reads active catalog/prices | Static columns compatible; live constraints UNVERIFIED |
| Inventory levels and movements | [202610160001_commerce_foundation.sql](../supabase/migrations/202610160001_commerce_foundation.sql:65) | Locks and updates `on_hand`/`reserved` | Static one-location assumption verified; concurrency UNVERIFIED |
| Checkout requests/customizations | [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql:29) | Reuses rows, unique idempotency, ownership/status | Static dependency verified; RLS/runtime UNVERIFIED |
| Applied checkout RPC | [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql:94) | Replaced by same signature | Pending body has critical alias defect |
| Reservation ledger and lifecycle functions | [202610160004_checkout_runtime_hardening.sql](../supabase/migrations/202610160004_checkout_runtime_hardening.sql:105) | Alters ledger and replaces release/fulfill | Existing live contents/constraints UNVERIFIED |
| Money columns/backfill | [202610160009_backfill_checkout_money.sql](../supabase/migrations/202610160009_backfill_checkout_money.sql:1) | Reads `price_paise`, `currency_code`, legacy USD price | Static currency mapping compatible; legacy data coverage UNVERIFIED |
| Storage objects | [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql:345) | Validates private customer object exists | Policy/object behavior UNVERIFIED |
| Server route and feature flag | [checkout-server.ts](../lib/commerce/checkout-server.ts:53) | Calls RPC with expected four parameters | Signature compatible; flag remains disabled |

## Lifecycle assessment

### Checkout and retry

**Static result:** the intended transaction boundary, customer-scoped idempotency, fingerprint conflict, server-derived price, and reservation creation are present in the draft. The server route passes the expected signature and maps the expected result fields.

**Unverified:** PostgreSQL function compilation, constraint behavior, row-lock serialization, rollback after a backend disconnect, and the behavior when a prior order exists but the checkout request row is incomplete.

### Inventory

**Static result:** available stock is calculated as `on_hand - reserved`; reservation increments only `reserved`; fulfilment decrements both values; release decrements `reserved` only.

**Risks:** expiry and cancellation can leave inconsistent state as described above. The current movement table is not written by checkout reservation, so reservation events are represented by the ledger, not by `store_inventory_movements`; this should be explicitly approved for reporting and reconciliation.

### Payment, fulfilment, refund, and returns

**Result:** payment success, payment failure, refund, and return behavior are **BLOCKED** or **UNVERIFIED**. The draft is COD-only, has no provider event model, no payment success function, no refund function, and no return/restock workflow. `fulfill_order_reservations` accepts `fulfilling`, `shipped`, or `completed` order states but does not itself verify payment status; that authorization remains an unimplemented caller responsibility.

### Customizations

**Static result:** the draft verifies customer ownership, product/template publication, and Storage object existence before order creation, then changes `ready` to `consumed` inside the transaction. A failure after consumption should roll back SQL changes.

**Unverified:** Storage policy enforcement, object existence under service-role access, concurrent reuse from separate requests, and cleanup of orphaned bytes. The application’s preflight in [checkout-server.ts](../lib/commerce/checkout-server.ts:27) is useful defense in depth but is not the authoritative transaction boundary.

## Required corrections before staging

1. Correct the invalid `x.product_id`/`x.variant_id`/`x.customization_reference` references at [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:160).
2. Add a disposable PostgreSQL compile-and-execute test for the corrected function.
3. Prevent partial expiry from cancelling orders that retain active reservations.
4. Restrict cancellation to approved pre-fulfilment states.
5. Define and implement payment confirmation, failure, webhook idempotency, refund, and return policies before enabling non-COD behavior.
6. Define the expiry worker and reconciliation process.
7. Verify exact live constraint names, function owners, ACLs, existing reservation rows, and reserved-counter consistency without reading customer records.
8. Decide whether the one-location-per-variant limitation is acceptable.
9. Require non-null, auditable release reasons or document the weaker policy.
10. Add SQL-level tests for concurrent multi-line checkout, rollback after every mutation boundary, duplicate customization use, and lifecycle invariants.

## Staging integration-test plan

Run only against a fresh disposable Supabase project or isolated local database. Do not use project `jamyqssytdzbiiahtmsq`.

1. Apply repository migrations through the normal tracked migration mechanism, then apply the corrected pending draft in isolation.
2. Before checkout tests, assert function signature, owner, `prosecdef`, empty `proconfig` search path, ACLs, constraints, indexes, and RLS state.
3. Use disposable anonymous, customer A, customer B, staff, manager, and administrator identities.
4. Execute the matrix in [phase4e-test-and-rollout-plan.md](../docs/phase4e-test-and-rollout-plan.md:28): direct RPC denial, successful server checkout, duplicate replay/conflict, final-unit concurrency, insufficient stock, forced rollback, foreign/consumed customization, release/expiry/fulfilment retries, private Storage access, and signed URL expiry.
5. Add PostgreSQL-specific assertions after every test: order count, order-item count, checkout-request state, reservation rows, `on_hand`, `reserved`, customization status, and absence of partial writes.
6. Test mixed expiry times and cancellation from every order state; assert no cancelled order retains a reserved row.
7. Test a competing studio receiving/transfer operation to detect lock-order deadlocks.
8. Test session expiry and route authorization separately; do not rely on `service_role` RPC access as proof of browser authorization.
9. Keep the application checkout flag false until all staging checks and payment/operations approvals are recorded.

## Local validation interpretation

The local Phase 4E-A fixture/contract suite passed, along with the project’s typecheck, checkout correctness, commerce correctness, and production build checks recorded in [phase4e-test-and-rollout-plan.md](../docs/phase4e-test-and-rollout-plan.md:109). Those results are **VERIFIED — local tests** only. The fixture suite does not parse or execute PostgreSQL PL/pgSQL and therefore did not catch the invalid field references identified in this review.

The full repository ESLint baseline remains the Phase 4D result: 28 pre-existing errors and 20 warnings in unrelated files. No unrelated fixes were made.

## Final decision

**NO-GO / blocked for staging deployment until the required corrections are made.** The pending migration is directionally sound on transaction boundaries and inventory-locking strategy, but it is not currently a valid production candidate. The first correction is the SQL record-alias defect; the next gates are PostgreSQL execution, lifecycle invariant tests, payment/return policy approval, and live metadata reconciliation without customer-record access.
