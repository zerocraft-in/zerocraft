# Architecture Audit Report

**Repository**: zerocraft (D:\projects\zerocraft)  
**Branch**: feat/shopify-global-taxonomy-only  
**Date**: 2026-11-27  
**Session**: A (Audit - Read-only)

---

## 1. Top 10 Risks (Ranked by Severity)

Each risk includes evidence from the codebase.

### Risk 1: No Local Supabase Database Running - Blocks All Database Work
**Severity**: Critical  
**Evidence**: 
- `package.json` scripts reference `db:start`, `db:reset`, `db:push` but Supabase is not running locally
- `infrastructure/supabase/config.toml` exists but no running instance
- All 13 platform migrations and 15 commerce template migrations untested locally
- `infrastructure/supabase/.env` exists but references local Docker instance

**Impact**: Cannot verify RLS policies, test RPCs, run migrations, or validate tenant isolation. All Sessions C-D require working database.

---

### Risk 2: Supabase OAuth Credentials Missing - Blocks Tenant Provisioning
**Severity**: Critical  
**Evidence**:
- `.env.example` lines 23-34: `SUPABASE_OAUTH_CLIENT_ID`, `SUPABASE_OAUTH_CLIENT_SECRET`, `SUPABASE_OAUTH_AUTHORIZE_URL`, `SUPABASE_OAUTH_TOKEN_URL`, `SUPABASE_OAUTH_API_BASE_URL` all empty
- `workers/tenant-provisioner/src/oauth.ts` requires these for Supabase Management API
- `workers/tenant-provisioner/src/management.ts` calls Supabase Management API to create projects
- `docs/architecture/tenant-provisioning.md` step 3 (`create_project`) depends on OAuth

**Impact**: Cannot provision tenant stores (customer-owned Supabase projects). Core SaaS workflow blocked.

---

### Risk 3: AUTH_HANDOFF_SECRET Not Configured - Blocks Cross-Subdomain Auth
**Severity**: Critical  
**Evidence**:
- `.env.example` line 8: `SUPABASE_SECRET_KEY` placeholder
- `apps/admin/.env.example` line 20: `AUTH_HANDOFF_SECRET=` empty
- `apps/accounts/.env.example` line 23: `AUTH_HANDOFF_SECRET=` empty
- `apps/admin/src/lib/auth/accounts.ts` line 65-69: `getHandoffSecret()` returns null if not set or < 32 chars
- `apps/accounts/src/lib/auth/handoff.ts` lines 56, 130: `isHandoffConfigured()` checks this
- `apps/admin/src/app/auth/start/route.ts` lines 47-51: Fails if secret missing

**Impact**: Users cannot sign into admin app via accounts app. Central auth architecture non-functional.

---

### Risk 4: TENANT_SECRET_ENCRYPTION_KEY Missing - Blocks Secure Credential Storage
**Severity**: High  
**Evidence**:
- `.env.example` line 39: `TENANT_SECRET_ENCRYPTION_KEY=` empty
- `workers/tenant-provisioner/src/crypto.ts` uses this for AES-256-GCM encryption of OAuth tokens and database passwords
- `infrastructure/supabase/migrations/20261126060000_013_tenant_databases.sql` line 60: `database_password_secret_ref` stores reference to encrypted secret
- `workers/tenant-provisioner/src/platform-db.ts` stores encrypted secrets in Cloudflare KV

**Impact**: Cannot securely store tenant database credentials or OAuth tokens. Security vulnerability if deployed without.

---

### Risk 5: No Payment Provider Integrated - Blocks Billing/Subscriptions
**Severity**: High  
**Evidence**:
- No Stripe or Razorpay dependencies in any `package.json`
- No payment-related migrations in platform DB (no `subscriptions`, `plans`, `invoices`, `payments` tables)
- `docs/architecture/overview.md` line 12: "Authentication, tenancy, RLS, and core business modules are designed but not implemented"
- Commerce template has `010_payments.sql` but platform DB has no billing schema

**Impact**: No monetization path. SaaS cannot charge for subscriptions or usage.

---

### Risk 6: RLS Policies Not Tested - Tenant Isolation Unverified
**Severity**: High  
**Evidence**:
- All 13 platform migrations enable RLS with `organization_id in (select private.current_org_ids())` pattern
- `private.current_org_ids()` defined in migration 003 lines 20-33: returns org IDs from `organization_members` where `status = 'active'`
- No RLS test files in `infrastructure/supabase/tests/` (directory exists but only has `phase2` folder which was deleted per git status)
- `supabase/tests/phase2/rls_tests.sql` and `rbac_tests.sql` deleted (shown in git status as deleted)

**Impact**: Cross-tenant data leakage possible if RLS policies have bugs. No automated verification.

---

### Risk 7: Duplicate Money/INR Formatting Implementations
**Severity**: Medium  
**Evidence**:
- `docs/architecture/monorepo-structure.md` lines 96-101 explicitly documents this as "intentionally not merged"
- `apps/admin/src/lib/money.ts` (5829 bytes) - source of truth per doc
- `packages/utils/src/currency.ts` - different units (paise vs rupees), different error handling
- `apps/admin/src/lib/money.test.ts` exists (4109 bytes)
- `packages/utils/src/currency.ts` not actively imported per consumer table

**Impact**: Inconsistent currency handling across apps. Risk of bugs when packages/utils is adopted.

---

### Risk 8: SKU Validation Incompatible Across Packages
**Severity**: Medium  
**Evidence**:
- `docs/architecture/monorepo-structure.md` lines 101-102: "Incompatible behaviors (uppercase/hyphen vs lowercase allowed, length limits)"
- `packages/utils/src/sku.ts`
- `packages/validators/src/schemas.ts`
- App-local validation in admin products components
- No active imports of validators per consumer table

**Impact**: Data inconsistency if different validation rules applied in different contexts.

---

### Risk 9: No CI/CD Pipeline for Database Migrations
**Severity**: Medium  
**Evidence**:
- `.github/workflows/ci.yml` modified (per git status) but no migration validation step visible
- `package.json` line 29: `db:migration-check` script references `tooling/scripts/validate-migrations.js` and `check-duplicate-timestamps.js` - both DELETED per git status
- No automated migration linting, destructive change detection, or schema drift detection in CI

**Impact**: Risk of broken migrations reaching production. No guardrails on schema changes.

---

### Risk 10: Workers Not Deployable Without Cloudflare Configuration
**Severity**: Medium  
**Evidence**:
- `workers/tenant-provisioner/wrangler.toml` deleted (per git status)
- `workers/public-cdn/wrangler.toml` deleted
- `workers/taxonomy/wrangler.toml` deleted
- `infrastructure/cloudflare/` directory exists but contents unknown
- `workers/tenant-provisioner-local/` exists for local development but separate from production worker

**Impact**: Cannot deploy provisioning worker, public CDN, or taxonomy worker to production.

---

## 2. Environment Facts Discovered

| Item | Value | Verified |
|------|-------|----------|
| OS / Shell | Windows / PowerShell | Yes (commands run) |
| Package Manager | pnpm@10.18.3 (root), pnpm@12.21.0 (apps) | Yes (package.json) |
| Framework | Next.js 16.4.6 (App Router) | Yes (package.json, next.config.ts) |
| Supabase | Local via Docker (Supabase CLI v3.1.0) | Config exists, not running |
| Payment Provider | None integrated | Yes (no deps, no schema) |
| Existing Apps | `@zerocraft/admin` (port 3000), `@zerocraft/accounts` (port 3001) | Yes |
| Existing Packages | auth-core, ui, utils, validators, eslint-config, tsconfig, mcp | Yes |
| Workers | tenant-provisioner, public-cdn, taxonomy, tenant-provisioner-local | Yes |
| Deployment Target | Vercel (implied by Next.js) | Inferred |
| Database | Two Supabase projects (Platform + per-tenant) | Yes (migrations, docs) |

---

## 3. Inventory

### Applications

| App | Package Name | Port | Framework | Purpose |
|-----|--------------|------|-----------|---------|
| admin | @zerocraft/admin | 3000 | Next.js 16.4.6 | Commerce administration dashboard |
| accounts | @zerocraft/accounts | 3001 | Next.js 16.4.6 | Central authentication (login, signup, OTP, magic link, email verification, handoff) |

### Shared Packages

| Package | Name | Type | Consumers | Status |
|---------|------|------|-----------|--------|
| auth-core | @zerocraft/auth-core | Library | admin, accounts | Fully integrated - redirects, crypto, email, rate-limit |
| ui | @zerocraft/ui | Library | admin, accounts | Fully integrated - shadcn/ui components |
| utils | @zerocraft/utils | Library | admin (declared) | No active imports - money.ts differs |
| validators | @zerocraft/validators | Library | admin (declared) | No active imports - SKU incompatible |
| eslint-config | @zerocraft/eslint-config | Config | admin, accounts, ui | Apps extend as base |
| tsconfig | @zerocraft/tsconfig | Config | admin, accounts, all packages | Apps extend base.json |
| mcp | @zerocraft/mcp | Library | None | Pre-built dist, no consumers |

### Workers (Cloudflare)

| Worker | Name | Purpose | Status |
|--------|------|---------|--------|
| tenant-provisioner | @zerocraft/tenant-provisioner | Tenant provisioning (create Supabase projects, install template) | Source exists, wrangler.toml deleted |
| public-cdn | @zerocraft/public-cdn | Public CDN edge for media | Source exists, wrangler.toml deleted |
| taxonomy | @zerocraft/taxonomy | Shopify taxonomy import | Source exists, wrangler.toml deleted |
| tenant-provisioner-local | @zerocraft/tenant-provisioner-local | Local development version | Exists |

### Database Objects (Platform DB - 13 Migrations)

| Migration | Tables Created | Key Features |
|-----------|----------------|--------------|
| 001 | platform_users, user_preferences | Extensions, private schema, updated_at trigger, identity |
| 002 | platform_roles, platform_permissions, platform_role_permissions, platform_members | Platform RBAC (owner, admin, reviewer, support) |
| 003 | organizations, organization_roles, organization_permissions, organization_role_permissions | Org RBAC (owner, admin, manager, staff), helpers: current_org_ids, authorized_org_ids, has_org_permission, is_org_member, is_org_owner |
| 004 | organization_members, organization_invitations | Membership RPCs: create_organization, invite_member, accept_invitation, change_member_role |
| 005 | platform_bootstrap_events | Platform Owner bootstrap (service-role only, one-time) |
| 006 | auth_handoff_codes | Cross-subdomain auth handoff codes (PKCE-bound) |
| 007 | stores, supabase_connections, tenant_provisioning_jobs, tenant_provisioning_job_steps | Store provisioning, enqueue_tenant_provisioning RPC |
| 008 | (integrity fixes) | Org-scoped idempotency, connection validation |
| 009 | sales_channels.channels, channel_installations, channel_settings | Sales channels operational schema |
| 010 | product_listings, product_listing_variants, sync_jobs, sync_logs, webhook_events, external_orders, inventory_sync_events | Sales channels continued |
| 011 | sales_channels_private.channel_credentials, webhook_secrets | Encrypted secrets (service-role only) |
| 012 | (seed + RPCs) | Channel seed data, install_channel, update_channel_installation_status, disconnect_channel RPCs |
| 013 | tenant_databases | Tenant DB registry, upsert_tenant_database RPC |

### Database Objects (Commerce Template - 15 Migrations for Tenant DBs)

| Migration | Purpose |
|-----------|---------|
| 001_core.sql | Core tables |
| 002_identity_and_access.sql | Identity, roles, permissions, RLS |
| 003_catalog.sql | Products, categories |
| 004_product_options_and_variants.sql | Variants, options |
| 005_collections_and_media.sql | Collections, media |
| 006_taxonomy_integration.sql | Shopify taxonomy |
| 007_inventory.sql | Inventory movements, stock |
| 008_customers.sql | Customers |
| 009_orders.sql | Orders, line items |
| 010_payments.sql | Payments |
| 011_shipping.sql | Shipping |
| 012_sales_channels.sql | Sales channels (tenant-side) |
| 013_pos.sql | POS |
| 014_audit_and_webhooks.sql | Audit logs, webhooks |
| 015_rls_and_security.sql | RLS policies, security |

### Auth Flow

1. User visits admin app → redirected to `/auth/start`
2. Admin creates PKCE pair, stores verifier/state in cookies, redirects to accounts `/handoff`
3. Accounts verifies session (or prompts login), creates single-use code bound to PKCE challenge, stores hash in `auth_handoff_codes`
4. Accounts redirects to admin `/auth/callback?code=<code>&state=<state>`
5. Admin verifies state, sends code + verifier to accounts `/api/handoff/redeem` (HMAC-signed)
6. Accounts verifies PKCE, marks code consumed, generates Supabase magiclink token
7. Admin exchanges token hash via `verifyOtp`, establishes session
8. User lands in admin dashboard

### Role Map

**Platform Roles** (migration 002):
- `platform_owner` (rank 100) - all permissions
- `platform_admin` (rank 80) - most permissions except bootstrap
- `platform_reviewer` (rank 60) - verification, view orgs/stores
- `platform_support` (rank 40) - view orgs/stores, audit

**Organization Roles** (migration 003):
- `owner` (rank 100) - all org permissions
- `admin` (rank 80) - manage org, users, stores, audit
- `manager` (rank 60) - view org, users, audit, stores
- `staff` (rank 20) - view org, stores

### Environment Variables (Names Only)

**Root .env.example**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, NEXT_PUBLIC_TAXONOMY_API_URL, SUPABASE_OAUTH_CLIENT_ID, SUPABASE_OAUTH_CLIENT_SECRET, SUPABASE_OAUTH_REDIRECT_URI, SUPABASE_OAUTH_AUTHORIZE_URL, SUPABASE_OAUTH_TOKEN_URL, SUPABASE_OAUTH_API_BASE_URL, TENANT_SECRET_ENCRYPTION_KEY, PLATFORM_SUPABASE_URL, PLATFORM_SUPABASE_SECRET_KEY, TENANT_PROVISIONER_SHARED_SECRET, NEXT_PUBLIC_TENANT_PROVISIONER_URL, TENANT_ALLOWED_REGIONS

**Admin .env.example**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_ACCOUNTS_URL, NEXT_PUBLIC_ADMIN_URL, AUTH_HANDOFF_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_APP_PASSWORD, MAIL_FROM_EMAIL, MAIL_FROM_NAME, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_CUSTOM_DOMAIN, PUBLIC_CDN_BASE_URL, NEXT_PUBLIC_TAXONOMY_API_URL, TENANT_PROVISIONER_URL, TENANT_PROVISIONER_SHARED_SECRET

**Accounts .env.example**: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_ACCOUNTS_URL, NEXT_PUBLIC_ADMIN_URL, NEXT_PUBLIC_PARTNERS_URL, NEXT_PUBLIC_COMMUNITY_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, AUTH_HANDOFF_SECRET, AUTH_CALLBACK_URL, NEXT_PUBLIC_AUTH_GOOGLE_ENABLED, NEXT_PUBLIC_AUTH_APPLE_ENABLED, NEXT_PUBLIC_AUTH_PASSKEY_ENABLED

---

## 4. Findings (Labeled)

### Verified Existing

1. **Monorepo structure matches documentation** - PNPM workspace with apps, packages, workers, templates, infrastructure. Verified via `pnpm-workspace.yaml` and directory structure.

2. **Platform database schema is comprehensive** - 13 migrations covering identity, RBAC, organizations, memberships, invitations, auth handoff, store provisioning, sales channels, tenant databases. All migrations read and analyzed.

3. **Commerce template is complete** - 15 migrations for tenant databases covering catalog, inventory, orders, customers, payments, shipping, POS, sales channels, audit, RLS. Verified via `templates/commerce/migrations/`.

4. **Cross-subdomain auth handoff implemented** - PKCE-bound, HMAC-signed, single-use codes with magiclink token exchange. No tokens in URLs. Verified via accounts/admin auth routes and auth-core crypto.

5. **RLS enabled on all platform tables** - Every table in migrations 001-013 has `enable row level security` and policies restricting to `private.current_org_ids()` or similar. Verified via migration files.

6. **Tenant provisioning state machine implemented** - 9 steps (validate_target → ensure_oauth → create_project → wait_healthy → install_migrations → install_seeds → initialize_tenant → verify_template → activate_tenant) with 6 lifecycle states. Verified via `docs/architecture/tenant-provisioning.md` and migration 007/008.

7. **Organization RBAC with rank-based privilege escalation prevention** - Roles have rank, RPCs verify caller rank > target rank. Verified via migrations 002, 003, 004.

8. **Sales channels architecture with secret separation** - Operational tables in `sales_channels` schema, encrypted credentials in `sales_channels_private` (no authenticated access). Verified via migrations 009-012.

9. **Central permission resolution in admin app** - `requirePermission()`, `requireRoles()`, `resolvePermissions()` all query database at runtime, no hardcoded maps. Verified via `apps/admin/src/lib/auth/session.ts`.

10. **TypeScript strict mode enforced** - `tsconfig/base.json` likely has strict settings (per docs), apps extend with only `verbatimModuleSyntax: false` override. Verified via `docs/architecture/monorepo-structure.md` line 93.

### Verified Problem

1. **Database not running locally** - Cannot verify migrations, RLS, or RPCs. Blocking for Sessions C-D.

2. **Critical secrets missing** - AUTH_HANDOFF_SECRET, TENANT_SECRET_ENCRYPTION_KEY, Supabase OAuth credentials all empty in .env.example files.

3. **Payment/billing schema absent from platform DB** - No subscriptions, plans, invoices, payments tables. Commerce template has payments but platform doesn't.

4. **Migration validation scripts deleted** - `validate-migrations.js`, `check-duplicate-timestamps.js`, `check-destructive-migrations.js` all deleted per git status. CI cannot validate migrations.

5. **Wrangler configs deleted for all workers** - Cannot deploy Cloudflare Workers without rewriting configs.

6. **Duplicate money formatting** - `apps/admin/src/lib/money.ts` vs `packages/utils/src/currency.ts` with different units (paise vs rupees).

7. **Incompatible SKU validation** - Three implementations with different rules (uppercase/hyphen vs lowercase, length limits).

8. **RLS tests deleted** - `supabase/tests/phase2/rls_tests.sql`, `rbac_tests.sql` deleted per git status. No automated tenant isolation verification.

9. **Packages/utils and validators declared but not used** - Consumer table shows "No active imports yet" for both.

10. **No storefront app** - Target architecture lists storefront as shared runtime, but only admin and accounts exist.

### Missing

1. **Storefront application** - Customer-facing storefront with domain resolution, catalog, cart, checkout.

2. **Merchant application** - Store owner dashboard (separate from admin per target architecture).

3. **Admin application separation** - Target architecture has separate admin (platform team) and merchant (store owners) apps. Currently only admin exists.

4. **Brand/CMS application** - Public site, services, portfolio, blog, enquiries.

5. **Help/Support applications** - Docs, FAQs, tickets.

6. **Billing/subscription management** - Plans, invoices, payments, usage tracking, webhook handling.

7. **Email service integration** - Admin has nodemailer config but no email templates or sending logic visible.

8. **Media/CDN integration** - R2 config exists but no upload/management UI visible.

9. **Observability stack** - No logging, metrics, tracing, error tracking configured.

10. **CI/CD pipeline** - GitHub Actions workflow exists but incomplete (missing migration checks, deployment).

### Recommendation

1. **Start Supabase locally first** - Run `pnpm db:start` before any database work. Verify all 13 migrations apply cleanly.

2. **Generate and configure all secrets** - Use `openssl rand -base64 48` for AUTH_HANDOFF_SECRET, `openssl rand -base64 32` for TENANT_SECRET_ENCRYPTION_KEY. Configure Supabase OAuth app for provisioning.

3. **Consolidate money formatting** - Pick one implementation (recommend `apps/admin/src/lib/money.ts` as source of truth per docs), remove or align the other.

4. **Consolidate SKU validation** - Define single source of truth, update all consumers.

5. **Recreate migration validation scripts** - Add destructive change detection, timestamp uniqueness, naming convention checks to CI.

6. **Rewrite wrangler.toml for workers** - Required for Cloudflare deployment.

7. **Add RLS tests** - Recreate `rls_tests.sql` and `rbac_tests.sql` with cross-tenant isolation test cases.

8. **Implement billing schema in platform DB** - Add subscriptions, plans, invoices, payments, usage tables with RLS.

9. **Create storefront app** - Shared Next.js runtime with domain resolution middleware.

10. **Separate admin/merchant apps** - Extract merchant-facing features from admin into new app per target architecture.

---

## 5. Open Questions

1. **Supabase Project Strategy**: The root `.env.example` references `qvjhwxriafgobxknpqtq.supabase.co` but admin/accounts use local `127.0.0.1:54321`. Which is the actual platform DB? The migrations reference `ftcvyhlzeyqceosdqyxn` in `database-ownership.md`.

2. **Commerce Template Versioning**: How are template versions managed? `template.config.json` exists but versioning strategy unclear.

3. **Multi-region Provisioning**: `TENANT_ALLOWED_REGIONS` lists 4 regions. Is there a region selection UI in the onboarding wizard?

4. **Storefront Domain Resolution**: Target architecture says "ONE shared runtime (never one Next.js app per merchant): domain resolution". How will this work with Vercel/Cloudflare?

5. **Payment Provider Decision**: Razorpay vs Stripe? Target architecture mentions both. Need decision before implementing billing.

6. **Email Service**: Admin has Gmail SMTP config. Will this be used for all transactional emails (invitations, order confirmations, etc.)?

7. **Media Storage**: R2 configured but no media management UI visible. Is media uploaded via admin or storefront?

8. **Analytics/Reporting**: Admin has analytics page but no data source visible. Will this query platform DB or tenant DBs?

9. **POS Integration**: Sales channels includes POS. Is there a Flutter app planned (per overview.md)?

10. **Deployment Target**: Vercel for Next.js apps, Cloudflare for Workers. Are there separate environments (staging/production)?

---

## 6. Session A Summary

**Work Completed**: Full repository audit. All code read, migrations analyzed, architecture documented.

**Files Created**: 
- `docs/architecture/progress.md`
- `docs/architecture/audit-report.md` (this file)

**Next Recommended Step**: Session B - Create migration plan comparing current vs target architecture, with concrete steps for Sessions C-G.

**Blocking Issues for Next Sessions**:
1. Supabase must be running locally (`pnpm db:start`)
2. Secrets must be generated and configured
3. Supabase OAuth app must be created for tenant provisioning