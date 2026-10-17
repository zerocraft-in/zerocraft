# Phase 4E-A — Transactional Checkout Lifecycle Design

**Status:** Pending review; no SQL has been executed or deployed.  
**Scope:** Checkout reservation lifecycle only. Existing applied migrations remain unchanged.

The following MVP assumptions are proposed for review, not approved policy: COD-only checkout, one inventory location per physical variant, no automatic restocking for refunds/returns, and no cancellation after fulfilment begins. Checkout remains disabled.

## 1. Audit result

The current path is [checkout-server.ts](../lib/commerce/checkout-server.ts) → [orders route](../app/api/store/orders/route.ts) → the service-role RPC `public.create_transactional_checkout`.

The applied checkout function validates the customer, idempotency key, request fingerprint, active catalog records, server-derived prices, customization ownership, and inventory availability. It locks the product and inventory rows and increments `store_inventory_levels.reserved`.

The blocking gap is that it does not insert `store_inventory_reservations`. The applied hardening migration creates that ledger and service-role release/fulfillment functions, but those functions cannot reconcile reservations created only by the counter. The checkout flag must therefore remain disabled.

### Stock model

For each inventory level:

`available = on_hand - reserved`

- `on_hand`: physical units currently held at the location.
- `reserved`: units committed to open orders but not yet fulfilled.
- `available`: units that a new checkout may reserve.
- A successful reservation increments `reserved` only.
- Fulfillment decrements both `on_hand` and `reserved`.
- Cancellation, payment failure, or expiry decrements `reserved` only.
- Receiving increases `on_hand` and creates an inventory movement.

The draft assumes one inventory location per physical variant, matching the current RPC’s `count(*) = 1` guard. Multi-location allocation is an unresolved design decision and is intentionally not introduced here.

## 2. Draft migration

[202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql) is a forward-only, unapplied draft. It:

- Adds expiry and release-reason metadata to the existing reservation ledger.
- Extends reservation states with `expired` while preserving terminal-state checks.
- Replaces the checkout RPC body without changing its public signature.
- Serializes retries on `(customer_id, idempotency_key)`.
- Validates customer identity, payload shape, product/variant status, server-side prices, currency, delivery, address, option selections, customization ownership, and object existence.
- Sorts cart lines before row locking to reduce deadlock risk.
- Creates the order, order items, inventory updates, reservation rows, and customization consumption in one transaction.
- Uses `FOR UPDATE` on the inventory level immediately before availability validation and reservation.
- Rolls back every mutation if any line, reservation, customization, or order-item operation fails.
- Keeps checkout and lifecycle functions restricted to `service_role`.
- Provides idempotent release, expiry, fulfilment, and cancellation primitives with explicit release reasons.

The draft is not a substitute for a reviewed payment-provider integration. It currently preserves the existing COD-only contract. Online payment confirmation, provider reference storage, webhook authentication, and capture/refund semantics require a separate approved design.

## 3. Lifecycle state machine

| Event | Order state | Payment state | Reservation state | Inventory effect |
|---|---|---|---|---|
| Checkout accepted | `pending` | `unpaid` | `reserved` | `reserved += quantity` |
| Payment success / COD confirmation | `confirmed` | `paid` or `unpaid` for COD policy | `reserved` | None |
| Payment failure | `cancelled` | `unpaid` | `released` (`payment_failed`) | `reserved -= quantity` |
| Customer/operator cancellation before fulfilment | `cancelled` | unchanged unless provider confirms refund | `released` (`cancelled`) | `reserved -= quantity` |
| Reservation timeout when all active rows are expired | `cancelled` | `unpaid` | `expired` (`expired`) | `reserved -= quantity` |
| Fulfillment starts | `fulfilling` | paid/approved by policy | `reserved` | None |
| Fulfillment completes | `completed` | paid/approved by policy | `fulfilled` | `on_hand -= quantity`, `reserved -= quantity` |
| Refund/return | separate return/refund workflow | `refunded` | no new reservation transition | inventory disposition must be explicit |

Repeated release, expiry, and fulfilment calls only select rows still in `reserved` state. Expiry refuses to cancel an order while any active reservation is unexpired, preventing a cancelled order from retaining active reservations. Cancellation is restricted to `pending` and `confirmed`; fulfilment-started orders require a separate return policy. Order row locks serialize lifecycle calls for one order. Inventory row locks and invariant predicates prevent a release or fulfilment from making `reserved` negative.

Refunds and returns are deliberately not automated in this draft: returned physical stock may be damaged, restockable, or pending inspection, so it requires a separate movement and disposition policy.

## 4. Authorization and storage design

| Operation | Anonymous | Customer | Staff/manager | Administrator | Trusted server |
|---|---:|---:|---:|---:|---:|
| Read public catalog | Yes | Yes | Yes | Yes | Yes |
| Submit checkout RPC directly | No | No | No | No | Yes |
| Checkout for own customer identity | No | Via server session | Not as a customer by default | Via approved server flow | Yes |
| Register/read own customization | No | Own object/metadata only | No | Studio policy only | Yes |
| Release/expire/fulfill reservation | No | No | No | No direct RPC | Yes |
| Read reservation ledger | No | No | Studio policy where already approved | Studio policy | Yes |

The application must continue to authenticate the browser session, require same-origin requests, validate the customer identity, and keep service-role clients server-only. The SQL role check is defense in depth, not a replacement for route authorization.

Customization bytes remain in the private `customer-customizations` bucket. Checkout requires both the customer-owned metadata row and a matching storage object, then changes metadata from `ready` to `consumed` inside the checkout transaction. Storage object deletion is not transactionally coupled to SQL; cleanup needs a separate, retry-safe process.

## 5. Unresolved design decisions and blockers

1. Payment provider: provider, authorization/capture timing, signed webhooks, duplicate event handling, and refund state are not specified.
2. COD policy: whether COD orders should be considered `paid` at confirmation or remain `unpaid` until delivery needs product approval; the draft does not silently choose.
3. Expiry worker: a trusted scheduled process must call expiry for eligible pending orders. No cron or feature flag was added.
4. Multi-location inventory: the draft retains the existing one-location-per-variant restriction.
5. Returns: restock and damage handling need explicit inventory movement reasons.
6. Existing live order rows and any existing reservation rows require a preflight reconciliation before deployment.
7. The draft’s `create or replace function` must be checked against exact live function ownership, grants, and dependent callers in a disposable Supabase project.

## 6. Review gates

Do not apply the draft until:

- SQL syntax and catalog dependencies pass in a disposable database.
- Concurrent checkout, rollback, duplicate request, ownership, and lifecycle tests pass.
- RLS and Storage policies are exercised with disposable identities.
- Payment and cancellation semantics are approved.
- A migration backup and rollback/forward-fix plan are approved.
- `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED` remains false until post-deployment smoke tests complete.
