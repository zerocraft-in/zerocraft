# Phase 4C — Live Supabase Final Reconciliation

Project: `jamyqssytdzbiiahtmsq`

Status: **Metadata reconciliation complete; behavior remains partially UNVERIFIED.**

No SQL was executed by this workspace, and no Supabase objects, data, policies, feature flags, or deployments were modified.

## Migration reconciliation

The repository contains 10 migration files, and the live Dashboard reports the same 10 recorded versions:

| Version | Repository file | Live recorded | Result |
|---|---|---:|---|
| `20261013043854` | `20261013043854_secure_studio_auth_and_commerce.sql` | Yes | VERIFIED |
| `202610160001` | `202610160001_commerce_foundation.sql` | Yes | VERIFIED |
| `202610160002` | `202610160002_storage_foundation.sql` | Yes | VERIFIED |
| `202610160003` | `202610160003_transactional_checkout.sql` | Yes | VERIFIED |
| `202610160004` | `202610160004_checkout_runtime_hardening.sql` | Yes | VERIFIED |
| `202610160005` | `202610160005_studio_product_write_hardening.sql` | Yes | VERIFIED |
| `202610160006` | `202610160006_purchase_orders.sql` | Yes | VERIFIED |
| `202610160007` | `202610160007_purchase_order_receiving.sql` | Yes | VERIFIED |
| `202610160008` | `202610160008_inventory_transfers.sql` | Yes | VERIFIED |
| `202610160009` | `202610160009_backfill_checkout_money.sql` | Yes | VERIFIED |

### Repository/live mismatch

The migration inventory matches exactly, but comments in the repository are stale relative to live state:

- [202610160002_storage_foundation.sql](../supabase/migrations/202610160002_storage_foundation.sql) says the storage foundation is intentionally not applied by that phase.
- [202610160003_transactional_checkout.sql](../supabase/migrations/202610160003_transactional_checkout.sql) labels transactional checkout as draft-only.

Live metadata confirms both migration versions are recorded and the related storage objects and checkout RPC exist. This is a documentation/release-state mismatch, not evidence that live schema objects differ from the repository definitions.

## Metadata comparison

| Area | Repository expectation | Live result | Classification |
|---|---|---|---|
| Migration history | 10 files, versions `20261013043854`–`202610160009` | 10 recorded versions with the same range | VERIFIED |
| Commerce/profile RLS | RLS enabled for repository-defined tables | 31 listed public commerce/profile tables have RLS enabled | VERIFIED for supplied scope |
| RLS policy inventory | Customer ownership and Studio membership policies | Live policies inspected | VERIFIED as inspected; behavior UNVERIFIED |
| `is_studio_member` | Staff membership function | Definition inspected | VERIFIED as present; behavior UNVERIFIED |
| `is_studio_admin` | Admin role function | Definition inspected | VERIFIED as present; behavior UNVERIFIED |
| Customer customization registration | `is_valid_customer_customization_registration` | Definition inspected | VERIFIED as present; behavior UNVERIFIED |
| Checkout RPC | `public.create_transactional_checkout(uuid,text,text,jsonb)` | Exists, returns `jsonb`, `SECURITY DEFINER`, empty `search_path` | VERIFIED |
| Checkout RPC grants | `anon=false`, `authenticated=false`, `service_role=true` | Same values confirmed | VERIFIED |
| Customer artwork bucket | Private `customer-customizations` | Private | VERIFIED |
| Product media bucket | Public `product-media` | Public | VERIFIED |
| Storage policies | Public active product-media reads; customer-owned private artwork; Studio controls | Policies inspected | VERIFIED as inspected; behavior UNVERIFIED |
| Admin role | `public.user_role` includes `admin`; administrator assignment is role-based | Individual profile not queried | UNVERIFIED |

The manually inspected 31-table RLS scope is broader than the original verification SQL’s focused table list. No policy mismatch can be concluded without the exact exported policy definitions and a table-by-table comparison.

## Checkout assessment

The live checkout RPC metadata matches the repository’s intended server-only design:

- The RPC exists with the expected signature.
- It returns `jsonb`.
- It is `SECURITY DEFINER` with an empty `search_path`.
- Anonymous and authenticated clients cannot execute it directly.
- Only `service_role` can execute it.

This supports the runtime path in [checkout-server.ts](../lib/commerce/checkout-server.ts), which calls the RPC using a server-side service-role client after authenticating the customer.

Checkout is still **not approved for enablement**. Remaining behavior-level checks include:

- End-to-end inventory locking and rollback behavior.
- Idempotency conflict behavior under retries.
- Customization ownership and consumed-state transitions.
- Order creation and reservation lifecycle behavior.
- Production payment/order policy approval.
- Verification that the deployed application flag remains disabled until approval.

## Role escalation and authorization risks

Metadata indicates the expected authorization functions and policies exist. The following remain behavior or operational risks:

1. The current administrator identity was not queried; a separate approved role verification is required.
2. Role changes must remain restricted to the live `is_studio_admin()` policy path.
3. The historical email-based profile bootstrap logic remains in repository migration history; the application runtime owner bypass was removed in Phase 4B.
4. Staff membership behavior was not tested with anonymous, customer, staff, and administrator sessions.
5. Service-role operations bypass RLS by design and require continued server-only enforcement.
6. Storage policy inspection confirms definitions were viewed, but object access behavior was not exercised.

No escalation was demonstrated by the supplied metadata. These risks are therefore **UNVERIFIED**, not confirmed vulnerabilities.

## Production-readiness checklist

Before production deployment:

- [ ] Review the stale draft/not-applied comments against the confirmed live migration state.
- [ ] Verify the intended administrator’s `profiles.role` through a separately approved non-disclosing check.
- [ ] Confirm all 31 RLS-enabled tables have the expected policies, not only enabled RLS.
- [ ] Confirm function owners, `SECURITY DEFINER`, `search_path`, and grants for every privileged function.
- [ ] Keep transactional checkout disabled until behavior tests and business approval are complete.
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is server-only and not returned by any route.
- [ ] Verify production environment variables and domain routing flags.
- [ ] Verify `zerocraft.in`, `store.zerocraft.in`, and `admin.zerocraft.in` separately.
- [ ] Test unknown-host rejection and cross-domain API rejection.
- [ ] Test authentication callbacks and safe return URLs.
- [ ] Run TypeScript, targeted ESLint, production build, security tests, and storefront regression tests.
- [ ] Capture a rollback deployment and feature-flag plan.

## Preview-deployment checklist

- [ ] Use preview-specific Supabase credentials and redirect URLs.
- [ ] Do not share production cookies or service-role secrets with previews.
- [ ] Keep transactional checkout disabled on previews unless explicitly approved.
- [ ] Confirm preview hosts use the intended legacy/preview routing behavior.
- [ ] Verify preview admin routes remain authenticated and staff-authorized.
- [ ] Verify preview storage uploads cannot access production private artwork.
- [ ] Test `www` canonical behavior, unknown hosts, and alternate Vercel hosts.
- [ ] Confirm preview environment flags cannot silently enable production checkout behavior.
- [ ] Remove or restrict preview access before production release.

## Final classification

- Migration versions: **VERIFIED**.
- Checkout RPC metadata: **VERIFIED**.
- RLS enablement and storage bucket visibility: **VERIFIED** from supplied Dashboard metadata.
- Policy/function definitions: **VERIFIED as inspected**.
- Authorization and storage behavior: **UNVERIFIED**.
- Administrator identity: **UNVERIFIED**.
- Checkout production readiness: **UNVERIFIED / not approved**.

No corrective SQL, migration, feature-flag change, deployment, or live-data operation was performed.
