# Phase 4D — Security and Runtime Readiness Audit

**Project:** Zerocraft Studio  
**Audit date:** 2026-10-16  
**Scope:** Read-only repository and local runtime audit after Phase 4C

## 1. Executive summary

The repository is structurally ready for continued local preview work: hostname routing, Supabase SSR session refresh, server-side staff checks, integration-secret protections, and server-side checkout validation are present. TypeScript, the security checks, commerce correctness checks, and the production build passed.

Production release is **not approved**. Transactional checkout must remain disabled. The deployed checkout RPC metadata is verified, but the repository’s checkout-hardening migration documents that the active RPC does not write the inventory-reservation ledger. Enabling checkout before an approved atomic reservation/release design is implemented could make inventory reservations impossible to reconcile. Runtime behavior, policy enforcement under real sessions, cookie behavior, storage access, and payment-provider behavior remain unverified.

No live SQL, customer-record query, file access, database mutation, migration, feature-flag change, or deployment was performed for this audit. Existing working-tree changes were preserved.

## 2. Verified findings

### Repository and migration state

- The Phase 4C dashboard evidence records exactly ten applied migrations, versions `20261013043854` through `202610160009`. The repository contains the corresponding ten migration files; the inventory is consistent.
- The live metadata evidence supplied for Phase 4C confirms `create_transactional_checkout` exists in `public`, returns `jsonb`, is `SECURITY DEFINER`, uses an empty `search_path`, and grants `EXECUTE` only to `service_role`.
- The same evidence confirms RLS is enabled on the 31 reviewed public commerce/profile tables, the customer-customizations bucket is private, and product-media is public. These are **metadata VERIFIED**, not proof of runtime behavior.
- Historical comments are stale and were not edited: [202610160002_storage_foundation.sql](../supabase/migrations/202610160002_storage_foundation.sql) describes the migration as not applied, and [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql) calls the checkout migration draft-only. Phase 4C evidence says both versions are applied. This is a release-documentation mismatch, not a reason to rewrite migration history.

### Authentication and authorization

- [utils/supabase/middleware.ts](../utils/supabase/middleware.ts) refreshes Supabase SSR sessions with `auth.getUser()` and checks the profile role before allowing `/studio` access. The accepted staff roles are `admin`, `manager`, and `staff`.
- The historical owner-email exception is not used by current runtime authorization. New profile creation in [lib/supabase-client.ts](../lib/supabase-client.ts) defaults to a non-privileged client role.
- [proxy.ts](../proxy.ts), [lib/domains.ts](../lib/domains.ts), and [lib/request-origin.ts](../lib/request-origin.ts) implement host allowlisting, canonical `www` handling, wrong-host API blocking, exact origin/host checks, and a `421` response for unknown hosts. These controls are routing boundaries only; server-side authorization remains authoritative.
- The studio auth callback at [app/(cms)/studio/auth/callback/route.ts](../app/(cms)/studio/auth/callback/route.ts) requires the admin host and validates return paths before redirecting.
- Integration metadata endpoints are administrator-only and return status metadata rather than credentials. The key-status endpoints no longer return plaintext Supabase service-role or Gemini keys. Mutating integration endpoints use same-origin protection and administrator authorization.

### Authorization matrix

| Actor | Studio website | Storefront/catalog | Customer checkout/customizations | Admin/studio pages | Integration administration | Direct checkout RPC |
|---|---|---|---|---|---|---|
| Anonymous visitor | Allowed | Allowed | Denied | Denied | Denied | Denied by grant |
| Authenticated customer | Allowed | Allowed | Own customer context only | Denied | Denied | Denied by grant |
| Staff / manager | Allowed | Allowed | Staff access only where route permits | Allowed by profile role | Denied unless administrator | Denied by grant |
| Administrator | Allowed | Allowed | Administrator context where route permits | Allowed | Allowed | Server route only |

The matrix is based on source inspection and static/local checks. It is not a substitute for full integration tests with disposable users and real session cookies.

### Checkout and storage

- [lib/commerce/checkout-server.ts](../lib/commerce/checkout-server.ts) requires the transactional-checkout flag, authenticates the user server-side, validates customization ownership and readiness, checks storage presence, canonicalizes and fingerprints the request, and calls the RPC through a server-only service-role client.
- [app/api/store/orders/route.ts](../app/api/store/orders/route.ts) requires same-origin JSON requests and delegates checkout to the server helper. The RPC is not callable by anonymous or authenticated database roles according to the supplied live metadata.
- Cart validation and final checkout both validate catalog/customization state; final checkout repeats ownership checks instead of trusting the browser.
- [app/api/store/customizations/route.ts](../app/api/store/customizations/route.ts) validates customer identity, feature state, file size/type, published product/template state, ownership metadata, and private-bucket upload handling. Signed URLs are short-lived in the reviewed path.
- [lib/storage/server.ts](../lib/storage/server.ts) is server-only. Customer object paths are scoped to the authenticated user UUID; studio storage requires a server-side studio-member check.
- Static inspection found no current browser response that returns service-role, Gemini, or encrypted integration credentials.

### Environment and service-role boundaries

The documented variables in [.env.example](../.env.example) separate public URL/key variables from server-only credentials such as `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `STUDIO_CREDENTIALS_ENCRYPTION_KEY`, `CRON_SECRET`, and webhook URLs. The local environment contains these variable names; values were not printed. No secret value was accessed or disclosed.

The reviewed service-role uses are server-side catalog/cart reads, transactional checkout, studio integration/media operations, and storage operations after authorization. This is a source-level finding; production bundle, logging, and Vercel environment-scoping behavior still require deployment checks.

## 3. Unverified assumptions

- Phase 4C live metadata was supplied as completed dashboard evidence; no live SQL was re-executed in this audit.
- RLS policy definitions and function definitions were inspected in Phase 4C, but enforcement was not exercised with anonymous, customer, staff, and administrator sessions.
- The active RPC’s idempotency, row-locking, rollback, and concurrent-retry behavior was not executed. Metadata cannot prove those behaviors.
- The active RPC’s reservation-ledger behavior is not acceptable for production based on the repository’s hardening notes; the live metadata confirms existence and grants, not correct business behavior.
- Supabase SSR cookie `Secure`, `SameSite`, host-only behavior, expiration, refresh, and cross-domain session isolation were not verified against deployed responses.
- Preview-domain routing, callback redirects, Vercel environment separation, and return-URL behavior were not exercised against a deployed preview.
- Storage bucket privacy, signed URL expiry, object ownership, MIME enforcement, and public product-media exposure were not tested against live objects.
- Payment-provider signature verification, duplicate webhook handling, and real payment/order lifecycle behavior were not exercised. No payment was attempted.
- A safe administrator verification still requires an approved operator to confirm the intended profile has `role = 'admin'` without returning or disclosing personal profile data.

## 4. Security risks

| Severity | Finding | Impact and recommended action | Live change required? |
|---|---|---|---|
| **Critical production blocker** | Active checkout path does not write the inventory reservation ledger, as documented by [202610160004_checkout_runtime_hardening.sql](../supabase/migrations/202610160004_checkout_runtime_hardening.sql). | Reservation release/fulfillment reconciliation can be incomplete or impossible. Keep `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED=false`; design and review an atomic RPC replacement before enabling. | Likely an approved migration/RPC change, but do not apply automatically. |
| **High** | Runtime authorization and RLS behavior have not been exercised with real test identities. | A metadata match does not prove that every route, action, policy, or role boundary behaves correctly. Add disposable-user integration tests before release. | Staging/test identities only; no production customer data. |
| **High** | Historical owner-email bootstrap logic remains in [20261013043854_secure_studio_auth_and_commerce.sql](../supabase/migrations/20261013043854_secure_studio_auth_and_commerce.sql). | Historical SQL is not a current runtime bypass, but future reapplication or misunderstanding could create privilege drift. Verify the administrator role through an approved non-disclosing procedure and document ownership. | No automatic live change; role correction may require separate approval. |
| **Medium** | Service-role operations are intentionally server-side but broaden impact if a future route omits authorization. | A route review and negative tests must accompany every new service-role call; inspect production bundles and logs before release. | No database change. |
| **Medium** | Preview and production host/cookie behavior remains unverified. | Mis-scoped redirects or cookies could create login loops or cross-domain leakage. Test each host with separate preview credentials and exact allowed return paths. | Vercel/Supabase configuration may be required. |
| **Medium** | Public product-media URLs are intentionally public. | URLs may remain readable after an object is no longer intended for public display. Confirm that only publishable media enters this bucket and that private assets never fall back to it. | Storage policy/configuration review may be required. |
| **Low** | Applied migration comments are stale. | Operators may incorrectly believe storage/checkout objects are not deployed. Update release documentation only after the migration state is accepted; do not alter historical migration files. | Documentation only. |

## 5. Test results

Commands run locally:

| Command | Result |
|---|---|
| `npm.cmd run typecheck` | **PASS** — Next route type generation and TypeScript completed. |
| `npm.cmd run test:security` | **PASS** — 5 static security checks, including admin-only integrations, no secret reveal, trusted role authorization, host/callback safety, and admin navigation. |
| `npm.cmd run verify:cart-correctness` | **PASS** — 12 checks; `remoteCalls: 0`. |
| `npm.cmd run verify:checkout-correctness` | **PASS** — 6 checks. |
| `npm.cmd run verify:commerce-correctness` | **PASS** — 13 checks. |
| `npx.cmd eslint lib/commerce/checkout-server.ts app/api/store/orders/route.ts app/api/store/cart/validate/route.ts app/api/store/customizations/route.ts lib/storage/server.ts utils/supabase/middleware.ts lib/request-origin.ts proxy.ts` | **PASS** — focused runtime/security lint completed without reported errors. |
| `npm.cmd run lint` | **FAIL** — 28 errors and 20 warnings, in pre-existing unrelated demo/UI files and hook patterns. No unrelated lint fixes were made. |
| `npm.cmd run build` | **PASS** — Next.js 16.3.0 production build compiled, type-checked, collected page data, and exited successfully. |

The Node module-type and experimental warnings emitted by the verification scripts were non-fatal. No live SQL, payment, order creation, or customer-file access was performed.

## 6. Production blockers

1. Keep transactional checkout disabled until the reservation ledger is written atomically with order/inventory state and the release/fulfillment lifecycle is tested.
2. Complete disposable-identity integration tests for anonymous, customer, staff, manager, and administrator sessions across all admin APIs and server actions.
3. Verify the intended administrator role through an approved non-disclosing procedure; do not use an email-based runtime exception.
4. Validate production and preview cookie, callback, redirect, and hostname behavior using separate non-production accounts.
5. Resolve or formally accept the full-lint baseline before release. The focused security/runtime files pass, but the repository-wide lint command does not.

## 7. Preview deployment checklist

### Vercel

- Add and verify `zerocraft.in`, `store.zerocraft.in`, and `admin.zerocraft.in` on the intended project.
- Confirm the apex/`www` canonical policy and TLS certificates.
- Use preview-only hostnames or a documented preview URL strategy; do not treat arbitrary `*.vercel.app` hosts as production admin domains.
- Set public URL variables to the matching preview origins and keep server-only values scoped to the correct Vercel environment.
- Keep `ZEROCRAFT_TRANSACTIONAL_CHECKOUT_ENABLED=false` in preview until checkout behavior is approved.
- Confirm unknown hosts receive the intended rejection and that cross-domain API calls are not accepted.

### Supabase Auth

- Add only approved preview callback URLs and the three production callback URLs.
- Verify callback paths use the admin origin for admin login and reject unsafe return paths.
- Confirm password-reset, invite, email-confirmation, and OAuth redirects do not fall back to an untrusted `Host` or arbitrary query parameter.
- Use separate preview test users; never use customer production records.

### Runtime smoke tests

- Studio root and portfolio routes stay on `zerocraft.in`.
- Store root, shop, product, cart, and catalog routes stay on `store.zerocraft.in`.
- Admin root and studio modules stay on `admin.zerocraft.in`.
- `/studio`, `/login`, `/store`, and API compatibility paths preserve intended legacy behavior without unsafe POST/server-action redirects.
- Anonymous admin requests, customer admin requests, wrong-host admin API requests, and direct RPC attempts are rejected.
- Staff can access permitted modules but cannot access administrator-only integrations.
- Customer customization access is limited to the owning customer and private bucket.
- No service-role, Gemini, encrypted integration, or webhook secret appears in HTML, JSON, browser bundles, logs, or error pages.
- Confirm logout, session expiry, refresh, and cross-domain navigation do not reuse a session cookie outside its intended host.

## 8. Recommended next implementation phase

### Phase 4E — Checkout lifecycle hardening and behavioral authorization verification

1. Design and review a replacement transactional RPC that creates the order, inventory reservation ledger entry, idempotency record, and customization linkage atomically.
2. Define reservation release, expiration, fulfillment, cancellation, and retry semantics, then test concurrent and duplicate requests with disposable data.
3. Add integration tests with non-production anonymous/customer/staff/manager/admin identities for every admin API method and sensitive server action.
4. Add storage tests for private customer objects, public product media, signed URL expiry, ownership paths, and forbidden cross-user access without reading production files.
5. Exercise preview host routing and Supabase callback behavior in a disposable Vercel preview environment.
6. Reconcile stale operational documentation after the live migration state is accepted; do not rewrite historical migrations.
7. Obtain explicit security and product approval before changing the checkout feature flag.

**Release recommendation:** studio, storefront, and admin routing may continue through controlled preview validation, but the production release is **not ready** while transactional checkout remains dependent on an unverified/non-reconciling reservation lifecycle and runtime authorization behavior has not been integration-tested.
