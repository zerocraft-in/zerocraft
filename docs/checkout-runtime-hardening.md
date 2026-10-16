# Checkout runtime hardening

This document is local preparation for Phase 2.8B.3F-B. It does not authorize or perform remote changes.

## Deployment state

- Applied migration: `202610160003_transactional_checkout.sql`
- New draft: `202610160004_checkout_runtime_hardening.sql`
- Draft status: **LOCAL DRAFT — NOT DEPLOYED**
- Offline fixtures: **NOT CREATED REMOTELY**
- Checkout and customization feature gates remain disabled.

The deployed checkout function is intentionally not edited in this phase. The current function increments `store_inventory_levels.reserved` but does not write an authoritative reservation ledger. The draft ledger must be integrated into a reviewed replacement checkout function before checkout activation.

## Customization metadata security

The draft replaces the customer metadata INSERT policy with a narrow helper that requires:

- `customer_id = auth.uid()`;
- an active product;
- a published template belonging to that product;
- `status = 'ready'`;
- a UUID filename under the authenticated customer’s first path segment.

Customers retain no metadata UPDATE or DELETE grant. The helper is `SECURITY DEFINER`, uses `search_path = ''`, has no dynamic SQL, and is not executable by `anon` or `public`.

## Storage artwork lifecycle

The deployed schema has only `ready`, `consumed`, and `rejected` metadata statuses. Storage-only upload is treated as `UPLOADED`; a successful metadata insert creates `READY`; checkout/fulfillment should transition to `CONSUMED`; retention or archival is an operational policy over consumed records.

The draft prevents customer Storage UPDATE/DELETE after a matching metadata row is `ready` or `consumed`. Unregistered abandoned objects remain removable by their owner and require bounded cleanup. PostgreSQL metadata and Storage bytes are not atomic; a failed registration can still require compensating Storage deletion, and immutable object versioning remains a future improvement.

## Reservation state machine

The draft adds `store_inventory_reservations` with `reserved`, `released`, and `fulfilled` states. Each row is tied to an order, variant, location, and quantity. The unique order/location/variant key prevents duplicate active rows for one order line.

Legal business transitions:

```text
PENDING -> CONFIRMED -> FULFILLING -> SHIPPED -> COMPLETED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
```

Reservation transitions:

```text
reserved -> released
reserved -> fulfilled
```

The draft includes service-role-only, retry-safe release and fulfillment primitives. They lock the order and ledger rows in deterministic order and use conditional inventory updates. They are not called by application code yet.

## Reservation reconciliation

Read-only diagnostic queries should identify:

```sql
-- Reservations without a valid order or inventory row
select r.* from public.store_inventory_reservations r
left join public.store_orders o on o.id = r.order_id
left join public.store_inventory_levels i
  on i.location_id = r.location_id and i.variant_id = r.variant_id
where o.id is null or i.variant_id is null;

-- Terminal orders with outstanding reservations
select r.order_id, count(*)
from public.store_inventory_reservations r
join public.store_orders o on o.id = r.order_id
where r.status = 'reserved' and o.status in ('cancelled', 'completed')
group by r.order_id;

-- Inventory rows whose ledger total differs from reserved stock
select i.location_id, i.variant_id, i.reserved,
       coalesce(sum(r.quantity) filter (where r.status = 'reserved'), 0) as ledger_reserved
from public.store_inventory_levels i
left join public.store_inventory_reservations r
  on r.location_id = i.location_id and r.variant_id = i.variant_id
group by i.location_id, i.variant_id, i.reserved
having i.reserved <> coalesce(sum(r.quantity) filter (where r.status = 'reserved'), 0);
```

No automatic correction is permitted. A correction requires a reviewed snapshot, explicit authorization, a service-role-only operation, and an audit record.

## Dedicated identities

Provisioning is a future approved operation using placeholders such as:

- `TEST CUSTOMER A`: authenticated, no Studio membership;
- `TEST CUSTOMER B`: authenticated, no Studio membership;
- `TEST STUDIO OPERATOR`: authenticated, minimum Studio role needed by the test.

Do not reuse the existing Auth users. Verification must compare IDs and role membership without logging emails, tokens, or passwords. Cleanup must remove only accounts explicitly created for the unique test run.

## Disposable fixture schema

[prepare-commerce-fixtures.mjs](../scripts/prepare-commerce-fixtures.mjs) generates an offline JSON plan using deployed columns only. It requires a unique run ID, prefixes every identifier with `zc_itest_`, uses deterministic UUIDs, and performs no network access. It covers physical, digital, size, color, combined option, customizable, INR, USD, insufficient-stock, final-unit, multi-variant, and archived-product cases.

Example, local-only:

```powershell
node scripts/prepare-commerce-fixtures.mjs --run-id local-20261016-a --output .itest-fixtures/local-20261016-a.json
```

The output path must remain outside production deployment and must never contain credentials.

## Idempotency and concurrency

[verify-checkout-hardening.mjs](../scripts/verify-checkout-hardening.mjs) is an offline mock harness. It verifies same-key replay, changed-payload conflict, cross-customer key scoping, final-stock competition, retry-safe release, digital bypass, rollback, invariants, and fixture relationship integrity.

These results are **MOCK VERIFIED**, never live PostgreSQL concurrency proof. Live tests require dedicated fixtures, bounded quantities, pre/post snapshots, and separate authorization.

## Cleanup and recovery

Resource cleanup order:

1. Stop feature gates and test traffic.
2. Reconcile reservations and retain an audit snapshot.
3. Remove test Storage objects.
4. Remove customization metadata.
5. Remove checkout requests, order items, and test orders according to the approved retention policy.
6. Remove inventory levels and disposable variants.
7. Remove option links, values, options, products, categories, and locations.
8. Remove only explicitly created test accounts and Studio membership.
9. Verify zero `zc_itest_<run-id>` resources remain.

No automatic cleanup script is provided. Broad deletes are prohibited.

## Deployment dependencies and gates

Before deploying the draft:

- Review the customization helper against live RLS behavior.
- Replace the checkout function so every physical reservation writes a ledger row in the same transaction.
- Add legal order transition enforcement.
- Test service-role claim handling with isolated identities.
- Verify Storage lock behavior with disposable objects.
- Obtain separate migration deployment approval.

Required runtime gates remain exactly disabled unless separately approved:

- `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED`
- `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED`
