# Phase 4E-D — Disposable Supabase Staging Setup

**Status:** Preparation only. No Supabase project was created, linked, queried, or modified.  
**Production checkout flag:** Remains disabled.

## Safety boundary

This workflow is for a separately approved disposable Supabase project only. Never point it at the production project, production Storage buckets, production Auth users, or a production service-role key. Do not place access tokens, database passwords, service-role keys, or customer data in this repository, shell history, SQL files, or logs.

The corrected migration remains pending review at [202610160010_checkout_reservation_lifecycle_pending.sql](../supabase/migrations/202610160010_checkout_reservation_lifecycle_pending.sql). It must not be applied to production through the SQL Editor.

## Operator approvals required

Before the next stage, an authorized operator must provide or approve:

1. A new disposable Supabase project or an isolated non-production project, with its project reference recorded outside the repository.
2. Confirmation that the project contains no production customer records, Auth users, Storage objects, payment credentials, or webhooks.
3. A staging-only Supabase URL, publishable key, service-role key, and database connection method stored in the local secret manager or ephemeral environment only.
4. Two disposable customer identities and disposable staff/manager/administrator identities.
5. Approval to apply all repository migrations, including the pending Phase 4E-C migration, to that staging project.
6. Approval for staging-only fixture creation and cleanup.
7. Product/payment approval for the proposed COD-only, one-location, no-automatic-restocking assumptions—or a revised test contract.

No operator credentials are requested, printed, or stored by this preparation.

## Fresh-install dependency order

The repository migration order is lexicographic and currently contains:

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
11. `202610160010_checkout_reservation_lifecycle_pending.sql` — pending, not applied

The pending migration depends on:

- Base orders, products, variants, profiles, and role helpers from `20261013043854`.
- Inventory levels and movement tables from `202610160001`.
- Checkout requests and customizations from `202610160003`.
- Reservation ledger and lifecycle functions from `202610160004`.
- Money columns/backfill from `202610160009`.
- The private customer-customizations Storage bucket and its policies.

Do not apply only migration `010` to an empty project. Use the tracked migration mechanism so dependencies and ordering are preserved.

## Staging environment separation

Use environment names equivalent to the existing variables, but with staging-only values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED=false`
- `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED=false`
- staging-specific `NEXT_PUBLIC_STUDIO_URL`, `NEXT_PUBLIC_STORE_URL`, and `NEXT_PUBLIC_ADMIN_URL`
- `ZEROCRAFT_HOSTNAME_ROUTING_ENABLED=true`

Do not copy production `.env.local`, production webhook URLs, production `CRON_SECRET`, production encryption keys, or production Storage configuration into staging. Keep the checkout flag false until database tests and business approval are complete.

## Operator command sequence

These are prepared commands only. Run them only after the disposable project and credentials have been approved. Replace placeholders locally; do not commit them.

```text
supabase login
supabase link --project-ref <STAGING_PROJECT_REF>
supabase migration list --linked
supabase db push --linked
```

Before `supabase db push --linked`, verify the linked project reference in the Supabase CLI output and confirm it is not the production project. Review the generated migration plan. The application feature flag must remain false.

After applying to staging, run the SQL harness only through a staging database connection:

```text
psql "$STAGING_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v STAGING_PROJECT_REF="$STAGING_PROJECT_REF" \
  -v CUSTOMER_A_ID="$STAGING_CUSTOMER_A_ID" \
  -v CUSTOMER_B_ID="$STAGING_CUSTOMER_B_ID" \
  -f supabase/staging/phase4e-d-database-integration-tests.sql
```

Do not paste a database URL containing credentials into a tracked file or a shared transcript. The command is not to be executed against production.

## Staging fixture policy

The SQL harness creates only synthetic catalog/inventory records in a transactionally isolated staging database. Auth users must be created through the staging Auth control plane or an approved staging-only seed process; the harness never creates Auth users or reads user records.

Use clearly synthetic identifiers and content. The fixture policy is:

- Two disposable customers, not production identities.
- One synthetic physical product with one active variant and one location.
- Optional second variant/location only for concurrency and multi-line tests.
- No real payment provider credentials or webhooks.
- No real artwork; use staging-only test bytes and private bucket paths.
- Record only IDs, counts, statuses, and invariant results.

## Cleanup

Run cleanup only against the disposable project after test evidence is captured. Prefer destroying/resetting the disposable project. If the project must be retained, delete only fixture IDs recorded by the harness in dependency order: test orders/reservations, customizations and Storage objects, inventory levels/location, variants, then products/templates. Do not use broad deletes and do not run cleanup against production.

## Deployment gate

- [ ] Disposable project reference independently verified.
- [ ] No production credentials or data available to the test process.
- [ ] Fresh migration push reviewed and completed.
- [ ] Pending migration compiled successfully in PostgreSQL.
- [ ] SQL integration harness passed.
- [ ] Two-session concurrency tests passed.
- [ ] RLS and Storage tests passed with disposable roles.
- [ ] COD/one-location/no-auto-restock assumptions approved or replaced.
- [ ] Checkout flag remains false.
- [ ] Failure evidence and cleanup evidence archived without secrets or customer data.
