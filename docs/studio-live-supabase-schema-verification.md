# Studio Live Supabase Schema Verification

Audit date: 2026-10-16  
Repository: `D:\projects\zerocraft`  
Authorized live project: `jamyqssytdzbiiahtmsq`  
Supabase CLI: project-local `2.121.0`

## 1. Executive summary

**FINAL DECISION: NO-GO.** The authorized live project was verified and its migration history was read successfully. Migrations `20261013043854` through `202610160003` are recorded remotely. Migrations `202610160004` and `202610160005` are present locally but are not recorded remotely.

The audit could not safely obtain the requested PostgreSQL catalog metadata. The environment has no `psql` or `pg_dump` executable, and the project-local CLI schema dump did not produce a usable dump file. No direct database query was executed because a SELECT-only catalog role and read-only transaction could not be established. All live schema, function, RLS, privilege, and Storage findings that depend on catalog inspection are therefore **NOT VERIFIED** or **BLOCKED**.

Repository evidence shows that the Studio product API still performs direct product writes and calls the legacy `studio_replace_product_variants` RPC. It does not call `studio_save_product_atomic_v2`, pass `write_version`, or implement the Migration 005 contract. Checkout and customization registration remain gated by environment flags whose deployed values were not inspected.

## 2. Authorization and scope

The user explicitly authorized a read-only metadata verification for project `jamyqssytdzbiiahtmsq`, with permission to write this report only. The following were in scope:

- Repository inspection, migration review, checksum verification, and `git diff --check`.
- Remote migration-history metadata.
- Read-only live catalog metadata, if a safe connection could be established.

The following remained prohibited and were not performed:

- Migration deployment, migration repair, linking, login, project switching, or configuration changes.
- Database writes, RPC execution, application checkout, product writes, or authentication bypass tests.
- Customer rows, `auth.users` rows, Storage object contents, signed URLs, or credentials.
- Docker, local PostgreSQL, local Supabase startup, feature-flag changes, and application-code changes.

## 3. Connection method and read-only guarantees

**VERIFIED LIVE:** The project-local Supabase CLI was available at `node_modules/.bin/supabase.cmd` and reported version `2.121.0`. The linked project reference in `supabase/.temp/project-ref` and `supabase/.temp/linked-project.json` matched `jamyqssytdzbiiahtmsq`.

**VERIFIED LIVE:** `supabase migration list --linked --project-ref jamyqssytdzbiiahtmsq --output-format json` connected to the remote database and returned migration-history metadata.

**BLOCKED:** A full catalog inspection could not be completed. The CLI dry run confirmed that `db dump` would use `pg_dump --schema-only`, but the environment did not provide a usable `pg_dump` executable or usable schema dump output. No fallback direct PostgreSQL query was attempted because the available connection did not establish SELECT-only catalog permissions or read-only transaction enforcement.

No customer data, Auth rows, Storage objects, or application RPCs were read.

## 4. Verified project identity

**VERIFIED LIVE:**

| Item | Result |
|---|---|
| Authorized project reference | `jamyqssytdzbiiahtmsq` |
| Local linked reference | Matches |
| Remote operation | Migration-history metadata read |
| Endpoint host observed by CLI | Supabase pooler for the linked project |
| Project switch or link write | Not performed |

The remote project identity was accepted only because the local linked reference matched the explicitly authorized reference.

## 5. Migration-history comparison

The following result came directly from the remote migration-history command:

| Migration | Repository | Remote history | Alignment |
|---|---|---|---|
| `20261013043854_secure_studio_auth_and_commerce.sql` | Present | Recorded | Aligned |
| `202610160001_commerce_foundation.sql` | Present | Recorded | Aligned |
| `202610160002_storage_foundation.sql` | Present | Recorded | Aligned |
| `202610160003_transactional_checkout.sql` | Present | Recorded | Aligned |
| `202610160004_checkout_runtime_hardening.sql` | Present | Not recorded | Mismatch; live application unknown |
| `202610160005_studio_product_write_hardening.sql` | Present | Not recorded | Mismatch; live application unknown |

The remote command returned local versions `202610160004` and `202610160005` with empty remote versions. This proves they are absent from the remote migration history; it does not prove that no equivalent objects exist in the live database.

## 6. Live schema inventory

**NOT VERIFIED:** The requested live table, column, default, constraint, index, and trigger metadata could not be obtained safely. This includes `profiles`, `store_categories`, `store_products`, `store_product_variants`, `store_inventory_levels`, `store_inventory_reservations`, `store_orders`, `store_order_items`, `store_customizations`, `store_product_options`, and `store_product_option_values`, plus additional commerce tables referenced by the migrations.

**REPOSITORY ONLY:** The migration files define commerce tables, currency fields, normalized variant-option tables, inventory locations and levels, checkout/customization tables, and the Migration 004 reservation ledger. The repository definition is not evidence that those objects currently exist or retain the expected definitions in the live project.

## 7. Function and RPC metadata

**NOT VERIFIED:** No live catalog evidence was obtained for function signatures, owners, volatility, `SECURITY DEFINER`/invoker mode, `search_path`, dependencies, or EXECUTE grants.

**REPOSITORY ONLY:** The relevant definitions are:

| Function | Repository signature / grant expectation |
|---|---|
| `studio_replace_product_variants` | `(uuid, jsonb)`; authenticated EXECUTE in Migration 001 |
| `studio_save_product_atomic_v2` | `(text, uuid, bigint, jsonb, jsonb, jsonb)`; authenticated EXECUTE in Migration 005 |
| `create_transactional_checkout` | `(uuid, text, text, jsonb)`; service-role EXECUTE in Migration 003 |
| `studio_store_order_summary` | `()`; authenticated EXECUTE in Migration 001 |
| `release_order_reservations` | `(uuid)`; service-role EXECUTE in Migration 004 |
| `fulfill_order_reservations` | `(uuid)`; service-role EXECUTE in Migration 004 |
| `studio_variant_has_active_reservations` | `(uuid)`; revoked from public, anon, and authenticated in Migration 005 |

No listed function was called.

## 8. RLS and privilege findings

**NOT VERIFIED:** Live RLS enabled/forced status, policy names and expressions, table grants, function grants, and role boundaries for `anon`, `authenticated`, and `service_role` were not available from a safe catalog query.

**REPOSITORY ONLY:** Migration 001 enables RLS on the initial Studio and commerce tables and grants authenticated Studio access through policies. Migration 003 adds checkout/customization policies and service-role-only checkout execution. Migration 004 adds RLS and a Studio-read policy for inventory reservations while revoking direct customer writes. Migration 005 grants authenticated EXECUTE only for the atomic Studio writer.

No policies or grants were changed.

## 9. Storage bucket and policy findings

**NOT VERIFIED:** Bucket existence, privacy, size limits, MIME restrictions, policy names, policy roles, and ownership expressions for `product-media` and `customer-customizations` were not obtained from live Storage metadata.

**REPOSITORY ONLY:** Migration 002 defines the two buckets and their Storage policies. Migration 004 tightens customer customization update/delete behavior so registered `ready` or `consumed` objects cannot be changed or removed by customers. The application uses `customer-customizations` and keeps registration behind `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED`.

No Storage objects were listed, downloaded, uploaded, deleted, or signed.

## 10. Migration 004 comparison

**VERIFIED REPOSITORY:** SHA-256 matches the protected value:

`456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB`

**VERIFIED LIVE:** Migration version `202610160004` is not recorded in remote migration history.

**NOT VERIFIED:** The live presence or absence of the customization registration helper, tightened Storage policies, reservation table, reservation indexes, or release/fulfillment functions.

**Status: DIFFERENT migration history; live objects NOT VERIFIED.** Do not deploy or repair this migration as part of this audit.

## 11. Migration 005 comparison

**VERIFIED REPOSITORY:** SHA-256 matches the protected value:

`FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC`

**VERIFIED LIVE:** Migration version `202610160005` is not recorded in remote migration history.

**NOT VERIFIED:** The live presence or absence of `store_products.write_version`, the positive check constraint, reservation compatibility helper, or `studio_save_product_atomic_v2`.

**Status: DIFFERENT migration history; live objects NOT VERIFIED.** Do not deploy or repair this migration as part of this audit.

## 12. CMS product API compatibility

**VERIFIED REPOSITORY:** `app/api/studio/store/route.ts` currently:

- Inserts and updates `store_products` directly.
- Calculates INR paise fields in application code.
- Inserts variants directly on product creation.
- Calls `studio_replace_product_variants` on product edits.
- Does not pass `write_version` or call `studio_save_product_atomic_v2`.
- Uses a compensating product delete when variant insertion fails, which is not atomic persistence.
- Does not express Migration 005 inventory initialization, normalized option declarations, stable RPC error categories, or reservation-aware archive checks.

**REPOSITORY ONLY:** Migration 005 expects the atomic writer to preserve identifiers, increment `write_version`, normalize `colour` to `color`, persist normalized option relationships, validate INR paise versus USD pricing, initialize inventory for new physical variants, and archive omitted variants only when fulfillment and reservation checks permit.

**NO-GO:** Live compatibility cannot be established until the live schema is catalog-verified and the CMS adapter is reviewed and implemented as a separate authorized application-code change.

## 13. Checkout/customization readiness

**REPOSITORY ONLY:** Checkout is gated by `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED` and calls `create_transactional_checkout` through a service-role client when enabled. Customization registration is gated by `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED` and uses the `customer-customizations` bucket plus `store_customizations` ownership metadata.

**UNKNOWN:** Deployed feature-flag values were not read. Live checkout function, reservation behavior, bucket policies, and ownership constraints were not catalog-verified.

**NO-GO:** Keep checkout and customization registration OFF until live schema, Storage metadata, Auth/RLS behavior, runtime adapter behavior, and explicit activation approvals are complete.

## 14. Security concerns

- **BLOCKED:** Full least-privilege catalog verification was unavailable; privilege drift cannot be ruled out.
- **VERIFIED REPOSITORY:** Migration 003 makes checkout RPC execution service-role-only, and Migration 004 makes reservation lifecycle functions service-role-only.
- **VERIFIED REPOSITORY:** The current product API performs multi-step writes and has a compensating-delete path, so it does not provide Migration 005 atomicity.
- **UNKNOWN:** Live RLS, FORCE RLS, function search paths, and grants may differ from repository definitions.
- No customer, Auth, Storage-object, or secret-bearing data was accessed by the audit.

## 15. Unknown or inaccessible metadata

The following remain **UNKNOWN** or **BLOCKED**:

- Live table and column definitions, defaults, keys, checks, indexes, and triggers.
- Live function owners, signatures, security mode, search paths, volatility, dependencies, and EXECUTE grants.
- Live RLS and FORCE RLS status, policies, and table grants.
- Live Storage bucket configuration and Storage policies.
- Deployed feature-flag values.
- Whether equivalent objects exist despite the missing 004/005 migration-history entries.

## 16. Recommended remediation order

1. Obtain a provider-supported catalog read path using an explicitly read-only role or a supported metadata interface.
2. Verify live tables, functions, policies, grants, Storage metadata, and migration preconditions without reading application rows.
3. Review Migration 004 reservation behavior and its relationship to the deployed checkout RPC.
4. Separately review and approve Migration 005, including lock order, constraints, grants, and error contracts.
5. Implement and review a CMS adapter for `studio_save_product_atomic_v2` with `write_version`, stable error mapping, identifiers, options, currency, and inventory payloads.
6. Run authenticated non-production smoke and concurrency tests.
7. Obtain separate approval before any migration deployment or feature activation.

## 17. Required future approvals

- Any new remote catalog connection or SQL query if the provider requires database access.
- Deployment of Migration 004 or 005.
- Any CMS application-code change to use the atomic writer.
- Enabling customization registration.
- Enabling transactional checkout.
- Any Auth, Storage, customer-data, or live-data mutation.
- Backup, rollback, recovery, or migration-history repair.

## 18. Integrity checks

**VERIFIED:**

- Local project reference and linked-project metadata match `jamyqssytdzbiiahtmsq`.
- Migration 004 checksum matches the protected value.
- Migration 005 checksum matches the protected value.
- `git diff --check` completed without whitespace errors; it reported pre-existing line-ending warnings.
- No migration, application file, environment file, or feature flag was changed by this audit.
- The temporary schema-dump file was removed.
- Existing worktree changes were preserved.

The audit report is the only file created by this audit.

## 19. Final GO / NO-GO decision

**NO-GO.**

The live project identity and migration history are verified, but the live schema and security metadata required for Migration 004/005 readiness are not verified. Migrations 004 and 005 are absent from remote migration history, the current CMS writer is incompatible with the Migration 005 contract, and deployed feature flags are unknown. Stop after this audit. Do not deploy migrations, activate checkout/customization, or enable CMS product writes through the new contract until the listed approvals and verification work are complete.
