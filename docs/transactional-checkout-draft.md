# Transactional checkout draft

Status: local implementation complete; draft migration only; not deployed and not verified against live transactions.

## Compatibility matrix

| Area | Current local schema | Draft behavior | Live verification |
| --- | --- | --- | --- |
| Order header | `store_orders`, legacy decimal totals, `customer_id`, `idempotency_key` | Inserts pending, unpaid COD orders only | Required before deployment |
| Order items | INR-only `unit_price_paise` and `currency = 'INR'` | Adds explicit minor-unit snapshot for USD and permits INR/USD | Required before deployment |
| Inventory | `store_inventory_levels(location_id, variant_id, on_hand, reserved)` | Locks exactly one location per physical variant and increments `reserved` atomically | Required before deployment |
| Digital products | `store_products.product_type = 'digital'` | No inventory row or reservation | Required before deployment |
| Customizations | Private Storage references, no database transaction across Storage | Auth/path/existence precheck, then reference snapshot; TOCTOU remains documented | Required before deployment |
| Idempotency | Existing global order index | Customer-scoped `store_checkout_requests` plus request fingerprint | Required before deployment |

The draft adds customer-owned read policies for order headers and order items. Existing Studio read/update policies remain in place.

The current deployed schema cannot safely represent legacy USD order-item snapshots because `store_order_items` currently requires INR paise. The draft adds explicit minor-unit support without rewriting existing rows.

## Hardened trust boundary

The browser calls the existing Next.js order route. The route authenticates the Supabase session with the normal server client, validates the request, verifies customization ownership, and only then uses a server-only service-role client to call `public.create_transactional_checkout(uuid, text, text, jsonb)`.

The draft function rejects all callers except the `service_role` JWT role and receives the verified customer UUID as a trusted server handoff. It is not executable by `public`, `anon`, or `authenticated`. The service-role key is never imported by client code, placed in a `NEXT_PUBLIC_` variable, returned in a response, or logged.

The trusted handoff assumes the Next.js server environment protects `SUPABASE_SERVICE_ROLE_KEY`. Database privileges prevent ordinary authenticated RPC calls, while the function validates that the supplied customer UUID exists. This is a server trust boundary, not proof that a compromised server environment is safe.

## Customization ownership

The draft adds `store_customizations`, linking customer, product, published template, private object path, MIME type, size, and lifecycle status. The upload-registration route remains disabled unless `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED=true`; it registers only authenticated customer-owned paths after validating the product/template relationship. The transaction rechecks the ownership row, product, published template, `ready` status, and `storage.objects` metadata before persisting the reference.

Storage bytes and PostgreSQL metadata are still external to one atomic database transaction. The remaining deletion/replacement TOCTOU risk requires runtime testing and an approved lifecycle policy before activation.

## Feature gate

`ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED=true` is required. With the gate absent or false, the order route returns a safe `503` and does not use the previous direct-insert path. The frontend is not activated against the draft function. `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED` is also disabled by default.

## Transaction boundaries

The PostgreSQL function creates or locks the customer-scoped idempotency row, validates catalog state, locks inventory in deterministic product/variant order, increments reservations, inserts the order header and immutable order-item snapshots, and completes the idempotency row in one transaction. Any failure rolls back the reservation and order writes.

Physical multi-location allocation is intentionally blocked because no allocation policy is defined. Digital products do not consume inventory.

## Storage limitation

Storage object existence is checked immediately before the RPC using the authenticated client and again through the ownership/metadata boundary in the function. PostgreSQL cannot atomically guarantee the external object bytes remain present after the metadata check, so deletion or replacement between the check and commit remains a TOCTOU limitation. No Storage mutation occurs in checkout.

## Payment and fulfillment

Only the existing COD contract is accepted. New orders remain `pending` and `unpaid`; no payment is marked successful. Shipping, tax, discount, payment capture, reservation release, cancellation, and expiration policies require separate approved business rules.

## Deployment sequence

1. Review the draft against the live schema and constraint names.
2. Confirm the development project identity and migration history.
3. Explicitly approve the migration.
4. Apply and verify the migration in development only.
5. Run SQL/RLS, customization, concurrency, and idempotency tests with isolated fixtures.
6. Enable the feature flag only after those tests pass.
7. Run Store checkout integration tests and Studio order visibility tests.
8. Define reservation release/cancellation behavior before production consideration.
9. Keep the gate disabled for production until payment, fulfillment, rollback, and incident procedures are approved.

## Reservation lifecycle prerequisite

Accepted COD checkout reserves stock and creates a pending, unpaid order. A future approved lifecycle must define:

- cancellation transition and retry-safe reservation release;
- fulfillment transition and physical stock deduction;
- protection against concurrent cancellation and fulfillment;
- reconciliation for inconsistent reservations; and
- an explicit abandoned-checkout policy.

No automatic expiration or background worker is included in this draft.
