# Studio product atomic RPC v2

This document describes the local, unapplied contract in `supabase/migrations/202610160005_studio_product_write_hardening.sql`.

## Contract

`studio_save_product_atomic_v2(action, product_id, expected_version, product, variants, options)` returns:

```json
{
  "product_id": "uuid",
  "version": 2,
  "variants": [{ "id": "uuid", "is_active": true }]
}
```

`action` is `create` or `edit`. Create requires null identity/version. Edit requires the current `store_products.write_version`; stale writes fail with `STALE_VERSION`.

Product fields are allowlisted. `collection_ids` is optional on edit: omitted means preserve existing collection links, while an explicit array replaces them. Existing CMS API response shapes are unchanged because the runtime is intentionally not wired to this unapplied RPC.

Variant objects contain `id`, `label`, `sku`, `options`, `price`, `price_paise`, `stock`, `is_active`, and optional `inventory`. Existing IDs are preserved. New physical variants require inventory rows; existing inventory is never changed by product editing. The legacy `stock` field remains a catalog compatibility field and is not an inventory adjustment instruction.

Normalized option tables are authoritative. JSON options are canonicalized into lower-case option names (`colour` becomes `color`) and mirrored to the legacy JSONB field. Values may be a string or a bounded string array.

## Rollout sequence

1. Review and separately approve the unapplied migration.
2. Deploy migration 005 only after SQL execution, catalog constraints, and lock-order review.
3. Update the Studio server adapter to call the v2 RPC and translate its response to the existing API contract.
4. Deploy the adapter and migration as a coordinated change.
5. Run authenticated Studio smoke tests and concurrency tests in a non-production environment.

Migration 004 remains independent and NO-GO. The v2 helper checks its reservation ledger only when the table exists, so migration 005 does not require migration 004 to be present. It never creates, releases, or cancels reservations.

## Error categories

`FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `DUPLICATE_SKU`, `INVALID_VARIANT`, `STALE_VERSION`, and `INVENTORY_RESERVED` are returned as stable prefixed messages with PostgreSQL error codes.

This is a local design document. It does not authorize deployment or runtime activation.
