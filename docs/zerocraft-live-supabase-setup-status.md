# Zerocraft Live Supabase Setup Status

Audit date: 2026-10-16  
Repository: `D:\projects\zerocraft`  
Authorized Supabase project: `jamyqssytdzbiiahtmsq`

## 1. Connection status

**MIGRATIONS DEPLOYED — RUNTIME ACTIVATION PENDING.** The configured URL is a valid HTTPS Supabase URL for the intended project reference. The linked project reference matches `jamyqssytdzbiiahtmsq`, and the remote migration-history metadata was freshly read successfully. No application data or customer records were accessed.

No Docker, local Supabase, local database, seed, application RPC, checkout, Storage-object access, Auth-user access, or customer-data access was performed. Migrations 004 and 005 were deployed only after explicit user approval.

## 2. Environment setup

Values were not printed, copied, or changed. Presence and basic formatting only:

| Variable | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Present; intended-project URL format |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Present; non-empty token-shaped value |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Absent; acceptable because publishable key is configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Present; non-empty token-shaped value |

`.env.local` remains uncommitted and was not modified. Do not commit it. The service-role key must remain server-only.

Manual setup if another environment is configured: set the four variable names above in the deployment/server environment, use the publishable key for browser/server SSR clients, and use the service-role key only in server routes. Do not invent or replace credentials.

## 3. Browser, server, proxy, and Auth status

- Browser client: `utils/supabase/client.ts` uses `createBrowserClient` with the public URL and publishable-key/anon-key fallback.
- Server client: `utils/supabase/server.ts` uses `createServerClient` with Next cookie access and the public key; it is cookie-aware for SSR sessions.
- Proxy: `proxy.ts` delegates to `utils/supabase/middleware.ts`, consistent with the installed Next.js 16 `proxy.ts` convention.
- Session refresh: middleware calls `supabase.auth.getUser()` and preserves refreshed cookies.
- Studio page protection: `app/(cms)/studio/layout.tsx` requires a user and `admin`, `manager`, or `staff` profile role.
- Studio API protection: `app/api/studio/store/route.ts` repeats the session and role check and applies same-origin validation to mutations.

**Status: structurally ready; live Auth, `profiles`, RLS, grants, and role data remain unverified.**

## 4. CMS integration status

The Studio catalog route supports categories, products, variants, media relationships, and inventory reads using the current schema assumptions. Product create/edit now calls the deployed `studio_save_product_atomic_v2` RPC, passes `write_version`, preserves existing variant IDs, sends INR paise fields, initializes new physical variants against an active inventory location, and maps stable RPC errors. Category and delete behavior remain unchanged.

**Status: atomic product writer wired locally; no live product mutation was performed.** The runtime path still needs an authenticated Studio smoke test after the safe live catalog/RLS verification path is available.

## 5. Store integration status

- Store/catalog routes assume the commerce tables, relationships, and currency columns defined by the repository migrations.
- Customer cart validation uses a server-only service-role client and is not a proof that live schema or policy state matches.
- `app/api/store/orders/route.ts` delegates to the transactional checkout server path.
- Checkout requires an authenticated customer, validates customization ownership, and uses a service-role RPC client only on the server.
- Transactional checkout is gated by `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED`.
- Customization registration is gated by `ZEROCRAFT_CUSTOMIZATION_REGISTRATION_ENABLED`.

**Status: integration paths are present but live schema, Storage metadata, deployed flags, RPCs, RLS, and grants are not fully verified. Keep both gates off.**

## 6. Migration history

The approved read-only CLI verification returned the following remote history:

| Migration | Local | Remote history |
|---|---:|---:|
| `20261013043854_secure_studio_auth_and_commerce.sql` | Present | Recorded |
| `202610160001_commerce_foundation.sql` | Present | Recorded |
| `202610160002_storage_foundation.sql` | Present | Recorded |
| `202610160003_transactional_checkout.sql` | Present | Recorded |
| `202610160004_checkout_runtime_hardening.sql` | Present | Recorded |
| `202610160005_studio_product_write_hardening.sql` | Present | Recorded |

Migration 004 and 005 are now recorded remotely. Migration 005 initially failed because its function referenced `v_variant` without declaring it as a record variable. The local migration was corrected by adding `v_variant record`, static checks passed, and Migration 005 was then applied successfully. This correction changes Migration 005's local checksum from the previous protected draft checksum and must be retained as the deployed source of truth.

## 7. Schema verification status

**BLOCKED / NOT VERIFIED.** Safe live catalog metadata for tables, columns, constraints, functions, function security/search paths, grants, RLS policies, Storage buckets, and Storage policies is not available from this audit. The installed CLI confirmed that its schema-only dump path requires `pg_dump`, which is not installed in the workspace. No privileged workaround or direct database query was used. Repository SQL is not evidence that equivalent live objects exist.

No customer rows, Auth records, Storage object contents, application RPCs, or remote data were read.

## 8. Security findings

Verified from repository code:

- Public browser/server SSR clients do not use the service-role key.
- Service-role clients occur in server-only modules/routes.
- Studio pages and the inspected product API enforce authentication and Studio roles.
- Checkout and customization registration are feature-gated.
- No secret values were printed or added to client code by this audit.

Remaining uncertainty: live RLS, FORCE RLS, grants, function security properties, Storage policies, deployed flags, and production bundle behavior require a safe verification path.

## 9. Local validation

- `npm run typecheck`: passed.
- Targeted ESLint for Supabase clients, proxy, Studio layout, Studio store route, store orders route, and checkout server: passed.
- `npm run lint`: failed on pre-existing unrelated repository issues, including unescaped entities, `no-img-element` warnings, and React set-state-in-effect errors. No unrelated fixes were made.
- Static checkout hardening checks: passed; reported zero remote calls and unapplied migration status.
- Static Studio product hardening checks: passed; reported zero remote calls.
- `git diff --check`: passed; Git reported existing line-ending warnings.

## 10. Files changed

Application/reporting work:

- `app/(cms)/studio/reports/page.tsx`
- `app/(cms)/studio/use-studio-overview.ts`
- `app/api/studio/overview/route.ts`
- `app/api/studio/store/route.ts` — switched product create/edit from legacy multi-step writes to the atomic RPC adapter.

Setup documentation and migration correction:

- `docs/zerocraft-live-supabase-setup-status.md`
- `supabase/migrations/202610160005_studio_product_write_hardening.sql` — added the missing `v_variant record` declaration after the first deployment attempt exposed the PostgreSQL compile error.

Existing unrelated worktree modifications were preserved. No environment file, feature flag, product, inventory, order, customer record, or Storage object was changed.

## 11. Remaining blockers and exact next steps

1. Establish a provider-supported, least-privilege read-only catalog inspection path without reading application rows or using privileged credentials to bypass restrictions.
2. Re-verify live tables, functions, grants, RLS, Storage metadata, and migration preconditions.
3. Review Migration 004 reservation behavior against the deployed checkout foundation.
4. Separately review Migration 005 and design the Studio adapter for `studio_save_product_atomic_v2`, including versions, identifiers, options, currency, inventory, and error mapping.
5. Resolve the missing safe catalog path, then verify live functions, grants, RLS, and Storage metadata.
6. Run an authenticated Studio smoke test for product create/edit with a disposable or approved test product; do not use a real customer order.
7. Obtain separate explicit approval before enabling customization registration or transactional checkout.

## 12. Final decision

**PARTIAL GO.** Migrations 004 and 005 are deployed and remote migration history is up to date. The CMS application writer is now wired to `studio_save_product_atomic_v2` locally. Checkout and customization flags remain absent/disabled; live schema/security verification and an authenticated Studio smoke test remain before runtime activation is considered complete.
