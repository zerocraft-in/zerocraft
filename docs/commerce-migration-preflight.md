# Zerocraft Commerce Migration Preflight

Generated 2026-10-16 from the repository and the configured Supabase target.

## Environment decision

The configured environment contains one Supabase target only. The user has confirmed that this project is development/testing only, so it is an acceptable deployment target. No database-native backup tool or connection URL is configured locally, so a verified backup must be created from the Supabase Dashboard before mutation.

## Live read-only observations

- `store_products`: 8 rows; all currently use `USD`.
- `store_categories`: 4 rows.
- `store_product_variants`: 0 rows.
- `store_orders`: 10 rows; existing order summary reports USD revenue.
- `is_studio_member()` and `is_studio_admin()` exist.
- The Phase 2 tables are not present in the live schema cache.
- No storage buckets were returned by the service-role storage listing.
- `supabase`, `pg_dump`, and `psql` are not installed or configured in the workspace.

## Migration compatibility review

The migration is additive and preserves existing rows. It references existing `store_products`, `store_categories`, `store_product_variants`, `store_orders`, `auth.users`, and the existing Studio role helper.

The legacy currency mismatch was corrected before deployment: existing product currency values are copied into the new `currency_code` column, while new records default to INR. Existing decimal prices remain untouched and `price_paise` remains nullable until an explicit conversion policy is approved.

The migration adds foreign keys, unique constraints, indexes, and RLS policies for catalog, inventory, customer-owned, storefront, customization, and audit entities.

## Required approval gate

Do not apply `202610160001_commerce_foundation.sql` yet. First create and verify a Supabase Dashboard backup/snapshot of the development project, then explicitly approve migration execution.

## Verification artifacts

- `supabase/verify-commerce-foundation.sql` checks tables, policies, and storage buckets.
- `scripts/verify-commerce-schema.mjs` checks schema-cache visibility through the Supabase API.
- `scripts/seed-commerce.mjs` refuses to run unless `ZEROCRAFT_SEED_ENV` is `development` or `staging`.
