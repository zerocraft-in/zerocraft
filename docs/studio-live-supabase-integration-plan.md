# Studio Live Supabase Integration Plan

Audit date: 2026-10-16  
Repository: `D:\projects\zerocraft`  
Live project reference: `jamyqssytdzbiiahtmsq`  
Scope: repository-only audit and staged deployment planning.

## 1. Executive summary

Zerocraft has an existing Next.js/Supabase integration aimed at the live project, but the live database has not been queried in this audit. The repository contains browser and server SSR clients, server-only service-role paths, Auth/Studio route protection, catalog APIs, customization Storage flows, and a transactional checkout path guarded by an environment flag.

The integration is not ready for Migration 005 deployment or CMS product-writer activation. The Studio product API currently writes product rows directly and uses the legacy `studio_replace_product_variants` RPC; Migration 005 instead introduces `studio_save_product_atomic_v2`. This contract mismatch must be resolved and reviewed before activation.

Checkout remains OFF. No Docker, local database, SQL, migration deployment, remote query, live-data mutation, Auth change, or Storage change was performed.

## 2. Existing integration status

### Clients

- Browser client: [`utils/supabase/client.ts`](../utils/supabase/client.ts) uses `createBrowserClient` from `@supabase/ssr`.
- Server client: [`utils/supabase/server.ts`](../utils/supabase/server.ts) uses `createServerClient`, Next cookies, and the public Supabase key.
- Middleware client: [`utils/supabase/middleware.ts`](../utils/supabase/middleware.ts) refreshes the session and queries `profiles` for Studio route authorization.
- Service-role clients are created only in server paths such as checkout/cart validation and integration management; the service key is not intended for browser use.

### Environment names

Repository evidence references these names without exposing values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with legacy fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED`
- `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED`
- `STUDIO_CREDENTIALS_ENCRYPTION_KEY`
- `STUDIO_AUTOMATION_WEBHOOK_URL`
- `NEXT_PUBLIC_SITE_URL`

The audit did not read `.env.local` or verify deployed environment values.

### Auth and Studio authorization

[`proxy.ts`](../proxy.ts), [`utils/supabase/middleware.ts`](../utils/supabase/middleware.ts), and [`app/(cms)/studio/layout.tsx`](../app/(cms)/studio/layout.tsx) require an authenticated user and a profile role of `admin`, `manager`, or `staff`. The middleware also contains an owner-email exception. Studio API routes repeat a profile-role check and use same-origin validation where implemented.

This is repository behavior only. It does not verify that the live project's Auth trigger, `profiles` rows, roles, RLS policies, or grants match.

## 3. Existing live schema assumptions

The application assumes the live project provides:

- `public.profiles` with `role`, `full_name`, and identity rows linked to `auth.users`.
- Core CMS tables: `blogs`, `works`, `reviews`, `clients`, `appointments`, and `notifications`.
- Commerce tables: `store_categories`, `store_products`, `store_product_variants`, `store_orders`, `store_order_items`, collections, normalized option tables, inventory tables, media, carts, wishlists, templates, and audit logs.
- Supabase Auth functions and identity context, including `auth.uid()`.
- Supabase Storage schemas/functions and buckets for product media and customer customizations.
- RPCs including `studio_store_order_summary`, `studio_replace_product_variants`, and, after Migration 005, `studio_save_product_atomic_v2`.
- RLS policies, authenticated grants, service-role execution grants, UUID/JSONB/Postgres transaction behavior, and currency columns such as `price_paise` and `currency_code`.

These are inferred from repository code and migration text. They are not claims about current live state. Only an authorized read-only remote verification can confirm them.

## 4. Migration review and checksums

Static migration order is:

1. `20261013043854_secure_studio_auth_and_commerce.sql`
2. `202610160001_commerce_foundation.sql`
3. `202610160002_storage_foundation.sql`
4. `202610160003_transactional_checkout.sql`
5. `202610160004_checkout_runtime_hardening.sql`
6. `202610160005_studio_product_write_hardening.sql`

Migration 001 adds commerce tables, currency columns, RLS policies, and Studio grants. Migration 002 configures Storage buckets and policies. Migration 003 adds checkout request/customization tables and the transactional checkout RPC. Migration 004 hardens customization Storage behavior and adds inventory reservations/release/fulfillment functions. Migration 005 adds `write_version`, reservation-aware checks, and the atomic Studio product writer.

Protected checksums verified from the repository:

- Migration 004: `456812B85635D5AFEED9F86AA113B0A906CBC1D5DD47A34101415C03C0621EEB` — match.
- Migration 005: `FE3746FD66E9A112B249D0D6AE0566D68C307CF8FEA931CD9829B6012F00F2BC` — match.

No migration was deployed or edited.

## 5. Product API blockers

### Product create/edit

[`app/api/studio/store/route.ts`](../app/api/studio/store/route.ts) currently inserts and updates `store_products` directly. It calculates INR paise fields in the route, but it does not call `studio_save_product_atomic_v2`, pass `write_version`, or provide the Migration 005 error contract. Product create can also insert the product before variant insertion and then attempt a compensating delete, which is not equivalent to the new atomic RPC.

Blocker: reconcile the API with the reviewed Migration 005 RPC contract before enabling the new writer.

### Product variants

The route calls legacy `studio_replace_product_variants` on edit. Migration 005 is designed to preserve identifiers, normalize options, handle inventory, and archive omitted variants safely. The route's `VariantInput` does not fully express the new RPC payload, including paise/currency and per-location inventory.

Blocker: define and review a CMS adapter for create/edit, variant IDs, normalized options, inventory payloads, and stable SQL error mapping.

### Inventory management

Cart validation reads `store_inventory_levels`, but the Studio product route does not persist inventory through Migration 005. Reservation safety depends on Migration 004's optional reservation ledger and live checkout compatibility.

Blocker: verify live inventory tables/constraints and wire the approved atomic writer before treating inventory edits as safe.

### Customization

[`app/api/store/customizations/route.ts`](../app/api/store/customizations/route.ts) is gated by `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED`, requires an authenticated customer, checks published templates, uploads to `customer-customizations`, creates a `store_customizations` ownership row, and returns a short-lived signed URL.

Blocker: verify Migration 002/003/004 Storage buckets, policies, template rows, ownership policies, and cleanup behavior remotely. Keep the registration flag OFF until approved.

### Orders and transactional checkout

[`app/api/store/orders/route.ts`](../app/api/store/orders/route.ts) delegates to [`lib/commerce/checkout-server.ts`](../lib/commerce/checkout-server.ts). The server path requires an authenticated user, validates customization ownership, uses the service-role client for `create_transactional_checkout`, and is gated by `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED`.

Blocker: verify Migration 003's RPC and Migration 004's runtime hardening in the live project, then obtain explicit deployment and activation approvals. The gate must remain OFF.

### Studio CMS integration

Studio pages and APIs assume role-protected access to the commerce tables, `studio_store_order_summary`, product relationships, media relationships, normalized options, and inventory relationships. The current product writer is not yet wired to Migration 005's atomic RPC.

Blocker: complete adapter work and contract tests before activating live product writes through the new schema.

## 6. Migration 004/005 readiness

Migration 004 and Migration 005 are checksum-intact in the repository, but repository checksums do not establish their live application state. Readiness is therefore **not verified**.

Required evidence before deployment:

- An authorized, read-only live migration-history result.
- Read-only catalog evidence for required tables, columns, functions, owners, security-definer settings, search paths, grants, RLS, Storage buckets, and policies.
- Confirmation that the live schema is at a compatible precondition for 004 and 005.
- Review of the 004 reservation behavior and checkout compatibility.
- Review of the 005 `studio_save_product_atomic_v2` contract and CMS adapter.

Do not deploy 005 alone if its live prerequisites are absent. Do not infer live state from the repository, dashboard assumptions, or client success responses.

## 7. Staged live deployment plan

### Gate 1 — Read-only remote verification

Separately authorize a least-privilege read-only inspection of the live project. Capture only redacted metadata: migration history, required catalog objects, RLS/grants, function properties, Storage bucket/policy metadata, and feature-flag configuration state. Do not select customer data, Auth secrets, Storage objects, or credentials.

### Gate 2 — Migration review

Review the exact checksum-verified SQL, dependency order, rollback/recovery implications, and expected API contract. Confirm whether 004 is already live and whether 005 is unapplied. Resolve any mismatch by stopping; do not overwrite or restore migration files.

### Gate 3 — Explicit migration deployment approval

Obtain a separate approval naming the exact migration(s), project, operator, window, backup/recovery plan, and verification queries. This gate authorizes deployment only if explicitly granted; it is not authorized by this audit.

### Gate 4 — CMS runtime wiring

After schema verification, update the Studio API to call the reviewed atomic RPC, pass `write_version`, map stable errors, preserve response compatibility, and remove dependence on destructive legacy replacement behavior. This is an application-code change requiring its own review and validation.

### Gate 5 — Feature flag activation

Keep `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED` and `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED` OFF until migration, schema, Auth, Storage, and runtime verification are complete. Activate one feature at a time with an explicit approval and an observed rollback path.

### Gate 6 — Recovery and rollback

Before deployment, document the provider-supported backup/restore path and the exact application rollback. Prefer disabling the new CMS adapter or feature gate over editing live schema. Do not assume destructive SQL rollback is safe for data-bearing migrations. Preserve migration history and error evidence.

## 8. Required user approvals

- Read-only remote metadata verification.
- Any remote SQL or migration-history query, even if read-only, if the chosen tool requires database access.
- Deployment of Migration 004 or 005.
- CMS runtime changes to use the atomic product RPC.
- Enabling customization registration.
- Enabling transactional checkout.
- Any remote Auth, Storage, customer data, or live-data mutation.
- Backup, rollback, or recovery actions.

This audit authorizes none of these operations.

## 9. Repository integrity

- Only [`docs/studio-live-supabase-integration-plan.md`](../docs/studio-live-supabase-integration-plan.md) was created for this request.
- Existing worktree changes were preserved.
- No application code, migration, package file, seed, or environment file was changed.
- No `.env.local` value was read or printed.
- No Docker or local database workflow was used.
- No SQL was executed.
- No remote Supabase endpoint was contacted.
- `git diff --check` was run; it passed with pre-existing line-ending warnings.
- Migration 004 and 005 checksums match the required values.

## 10. Final report

- Existing integration status: structurally wired, live state unverified.
- Live schema assumptions: documented from repository evidence only.
- Product API blockers: direct writes and legacy variant RPC are not aligned with Migration 005's atomic writer.
- Migration 004/005 readiness: checksum-ready, deployment-readiness unknown.
- Recommended next development phase: obtain read-only remote verification, then review and wire the Migration 005 CMS adapter while keeping checkout/customization gates OFF.
- Required approvals: remote read-only verification, migration deployment, CMS runtime wiring, and feature activation must remain separate.
- Repository integrity: preserved; no live or local runtime mutation occurred.

**FINAL STATUS: UNKNOWN — LIVE SCHEMA VERIFICATION REQUIRED**
