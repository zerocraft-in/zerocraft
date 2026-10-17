# Phase 4E-C — Checkout Migration Correction Report

**Project:** Zerocraft Studio  
**Date:** 2026-10-16  
**Status:** Corrected locally; migration remains unapplied and checkout remains disabled.

## Summary

The pending checkout migration was corrected in response to the Phase 4E-B preflight findings. The existing checkout RPC signature remains unchanged, so the current Next.js server integration remains compatible. No previously applied migration was edited.

The result is **NOT READY for staging deployment yet**. The corrected migration still requires PostgreSQL compilation/execution in a disposable environment, live-schema preflight, payment/return policy approval, and integration testing. No SQL was executed in this workspace.

## Exact corrections

### 1. JSON record-field consistency

In [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:158), the `jsonb_to_recordset` output fields and references are now consistent:

- `x."productId"`
- `x."variantId"`
- `x."customizationReference"`

This fixes the Phase 4E-B blocker where the migration declared quoted camelCase fields but referenced nonexistent snake_case fields.

### 2. Mixed-expiry protection

At [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:384), expiry now:

- Locks the order row.
- Returns without changes if the order is not `pending` or `confirmed`.
- Returns without changes if any active reservation is unexpired or has no expiry.
- Expires all active reservations together only when all are eligible.
- Cancels the order only after every active reservation has been released as `expired`.

This prevents a cancelled order from retaining active reservations.

### 3. Cancellation state restriction

At [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:431), cancellation now:

- Is idempotent for an already-cancelled order.
- Allows only `pending` and `confirmed` orders.
- Rejects `fulfilling`, `shipped`, and `completed` orders.
- Releases reservations with the explicit `cancelled` reason before marking the order cancelled.

No automatic restocking was added.

### 4. Explicit release reasons and compatibility

The migration now provides:

- `release_order_reservations(uuid, text)` with validated reasons: `payment_failed`, `cancelled`, and `manual_release`.
- The existing one-argument `release_order_reservations(uuid)` wrapper for compatibility with the previously applied function signature.
- `expired` as the expiry reason.
- A release-reason constraint allowing only known lifecycle values when present.

Release, expiry, and fulfilment remain idempotent because they operate only on rows in `reserved` state.

### 5. Atomicity and deterministic locking

The checkout function still performs order creation, order-item creation, inventory updates, reservation inserts, customization consumption, and checkout-request completion within one PL/pgSQL transaction. Any exception rolls back the complete transaction.

Cart lines remain deterministically ordered before product and inventory locking at [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql:155). Inventory availability is checked under `FOR UPDATE` at lines 315–324.

The RPC remains `SECURITY DEFINER`, uses `set search_path = ''`, preserves the existing four-argument signature, and grants execution only to `service_role` at lines 358–359.

## Classification of results

| Area | Classification | Evidence |
|---|---|---|
| JSON alias correction | VERIFIED by static inspection | Pending migration fields and references now match |
| Mixed-expiry rule | VERIFIED by static inspection | Expiry checks all active rows before cancellation |
| Cancellation restriction | VERIFIED by static inspection | Only `pending`/`confirmed` are accepted |
| Idempotent lifecycle selection | VERIFIED by static inspection | Release/expiry/fulfilment select `status = 'reserved'` |
| Atomic mutation structure | VERIFIED by static inspection | All mutations are inside one function transaction |
| Fixture scenarios | VERIFIED by local tests | Duplicate, concurrency, stock, rollback, mixed expiry, and cancellation tests pass |
| PostgreSQL function compilation | UNVERIFIED without database execution | No SQL was executed |
| PostgreSQL lock/deadlock behavior | UNVERIFIED without database execution | Fixture locking is not PostgreSQL locking |
| RLS and Storage enforcement | UNVERIFIED without database execution | No live or disposable Supabase access used |
| Function owner and live ACLs | UNVERIFIED without database execution | `SECURITY DEFINER` owner behavior requires catalog inspection |
| COD policy | BLOCKED by unresolved business rule | Product decision still required |
| Payment/refund/return lifecycle | BLOCKED by unresolved business rules | Provider and disposition model are not implemented |
| One-location allocation | BLOCKED by unresolved business rule | Draft retains the existing one-location restriction |

## Remaining risks

### High — PostgreSQL execution is still required

The fixture tests do not parse PL/pgSQL, validate record aliases through PostgreSQL, exercise constraints, or prove transaction rollback. A disposable database must compile and execute the migration before staging.

### High — payment lifecycle remains incomplete

The draft is COD-only. It does not implement payment success, authenticated webhooks, provider-event idempotency, refunds, or returns. The proposed COD-only assumption is documented but not approved. Checkout must remain disabled until product and payment owners approve the state model.

### High — expiry scheduling is not implemented

`expire_order_reservations(uuid)` is still a per-order trusted-server primitive. There is no scheduler, batch worker, retry policy, alert, or reconciliation job. Expired inventory may remain reserved until an approved worker calls the function.

### Medium — legacy live state requires reconciliation

The current applied RPC from [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql:327) increments `reserved` without ledger inserts. Any historical orders or counters must be reconciled before applying the replacement. No customer records should be returned in the verification output.

### Medium — exact live constraints and ownership remain unverified

The draft drops and recreates assumed constraint names and replaces function bodies. A disposable schema snapshot and read-only catalog comparison must verify constraint names, existing reservation states, function owner, `prosecdef`, `search_path`, and ACLs.

### Medium — one-location assumption

The migration still rejects physical variants with anything other than exactly one inventory level. This is intentional for the proposed MVP but is not approved business policy.

### Medium — no automatic refund/return restocking

The draft intentionally does not increase `on_hand` for refunds or returns. A separate inventory disposition workflow is required for restockable, damaged, or pending-inspection items.

## Validation results

Commands run locally:

| Command | Result |
|---|---|
| `npm.cmd run test:phase4e` | **PASS** — contract checks plus duplicate retry, concurrent stock, insufficient inventory, rollback, mixed expiry, cancellation restriction, customization ownership/consumption, authorization, and release retry scenarios. |
| `npm.cmd run verify:checkout-correctness` | **PASS** — 6 checks. Non-fatal Node experimental/module-type warnings were emitted. |
| `npm.cmd run verify:commerce-correctness` | **PASS** — 13 checks. Non-fatal module-type warning emitted. |
| `npm.cmd run typecheck` | **PASS** — route type generation and TypeScript completed. |
| `npm.cmd run build` | **PASS** — Next.js 16.3.0 compiled, type-checked, generated 52 static pages, and exited successfully. |
| `git diff --check` | **PASS** — only existing CRLF normalization warnings. |

These results are local-only. No SQL execution, Supabase access, migration deployment, feature-flag change, Vercel deployment, payment, order creation, or production-data access occurred.

## Staging readiness recommendation

**NO-GO for staging deployment at this time.** The migration is improved and the Phase 4E-B static blocker is corrected, but staging requires these gates first:

1. Review and approve the corrected SQL.
2. Compile and apply it only in a disposable database.
3. Run PostgreSQL integration tests for concurrent checkout, rollback at every mutation boundary, mixed expiry, cancellation state restrictions, lifecycle retries, RLS, and private Storage ownership.
4. Reconcile legacy reserved counters and reservation rows without exposing customer records.
5. Verify function owner, `SECURITY DEFINER`, empty `search_path`, constraints, indexes, and grants.
6. Approve COD semantics, one-location allocation, expiry scheduling, payment handling, and return/refund policy.
7. Keep `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED=false` until all gates pass.

The corrected files are ready for review, not for production or live Supabase application.
