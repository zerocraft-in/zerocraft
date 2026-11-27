# Architecture Audit Progress

## Session A: Audit (Read-only)

**Started:** 2026-11-27
**Status:** Complete

### Work Completed
- Repository structure discovery
- Monorepo configuration analysis (pnpm-workspace.yaml, package.json)
- Applications inventory (admin, accounts)
- Shared packages inventory (auth-core, ui, utils, validators, eslint-config, tsconfig, mcp)
- Workers inventory (tenant-provisioner, public-cdn, taxonomy, tenant-provisioner-local)
- Infrastructure analysis (Supabase migrations, Cloudflare config)
- Database schema analysis (13 platform migrations, 15 commerce template migrations)
- Auth system analysis (cross-subdomain handoff with PKCE)
- Tenant model analysis (User → Org Membership → Org → Stores)
- Environment facts verification

### Files Created in Session A
- `docs/architecture/progress.md`
- `docs/architecture/audit-report.md`
- `docs/architecture/application-boundaries.md`
- `docs/architecture/commerce-template.md`
- `docs/architecture/database-ownership.md`
- `docs/architecture/monorepo-architecture.md`
- `docs/architecture/monorepo-structure.md`
- `docs/architecture/overview.md`
- `docs/architecture/package-architecture.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/prototype-inspection.md`
- `docs/architecture/prototype-mapping.md`
- `docs/architecture/public-cdn.md`
- `docs/architecture/system-architecture.md`
- `docs/architecture/system-flows.md`
- `docs/architecture/tenant-provisioning.md`

### Checks Run (Session A)
- `git status` — working tree has uncommitted docs changes (expected)
- Repository structure verified via directory listing
- All package.json files read and verified
- All 13 platform migration files read and analyzed
- All 15 commerce template migration files read and analyzed
- Auth flow source code read and verified
- Worker source files read and verified

### Not Verified (Session A)
- Local Supabase database connection (Docker not confirmed running)
- Cloudflare Workers deployment (wrangler.toml missing for all three CF workers)
- End-to-end auth flow (requires both apps running and secrets configured)
- Tenant provisioning workflow (requires Supabase OAuth credentials)

---

## Session B: Mapping and Plan (Read-only)

**Started:** 2026-11-27
**Status:** Complete — awaiting approval before Session C

### Key Findings (Session B)

**apps/admin classification (Verified):**
`apps/admin` is a merchant dashboard, not a platform administration tool. Evidence:
- All 15 dashboard routes are merchant-scoped: products, customers, orders, discounts,
  gift cards, analytics, sales channels, POS, locations, store settings.
- `organizations/page.tsx` and `select-organization/page.tsx` are org-switching UI,
  not platform org management.
- Onboarding API routes (`/api/onboarding/`) are merchant store-creation flows.
- `settings/audit-logs/` is store-scoped, not platform audit.
- Zero routes for platform-team functions (cross-org user management, subscription
  billing admin, provisioning monitoring, platform RBAC).
- The app was built against prototype at `D:\projects\maara` per prototype-inspection.md
  and prototype-mapping.md. The prototype is a merchant commerce tool.

**Worker classification (Verified):**
- `tenant-provisioner`: CF Worker, provisions customer Supabase projects via Management API.
  Source exists. No wrangler.toml.
- `tenant-provisioner-local`: Node.js HTTP server, local dev mirror. Fully functional
  with compiled dist/, maintenance-lock, secret-rotation-cli. Active local tool.
- `public-cdn`: CF Worker. Source exists. No wrangler.toml.
- `taxonomy`: CF Worker. Source exists. No wrangler.toml.

**Missing wrangler.toml (Verified problem):**
All three CF workers have `wrangler dev` in their package.json scripts but no wrangler.toml.
Cannot be run or deployed.

### Files Created in Session B
- `docs/architecture/migration-plan.md`
- `docs/architecture/progress.md` (this file, updated)

### Checks Run (Session B)
- Read all Session A architecture docs to avoid duplication
- Read `apps/admin` route tree (155 files) — classified as merchant
- Read all 4 worker package.json files — classified workers
- Read `apps/admin/package.json` — confirmed dependencies (Next.js 16, React 19,
  Supabase SSR, TipTap, shadcn/ui, Zustand, Recharts, dnd-kit)
- Read existing docs (16 files) — confirmed Session A work, identified prototype context

### Not Verified (Session B)
- Worker source code content beyond entry point names (index.ts confirmed present,
  content not read in full — required for Step D-4)
- `@zerocraft/mcp` package content — purpose unknown (Step C-7)
- `apps/accounts` route structure — not inspected in Session B

### Decisions Required Before Session C
See `migration-plan.md` Section 7:
1. Confirm no open PRs reference `apps/admin` before rename
2. Confirm Docker Desktop is running for local Supabase
3. Confirm Wrangler CLI availability
4. Confirm Maara vs Zerocraft naming convention
5. Confirm no remote Supabase projects exist for staging/production
6. Confirm target deployment platform for merchant/accounts apps

### Next Recommended Step
**Session C, Step C-0:** Pre-flight checks (git, Supabase CLI, config, linked projects).
Branch: `arch/session-c-foundation`

---

## Session C: Foundation

**Status:** Not Started
**Planned branch:** `arch/session-c-foundation`

**Planned steps (in order):**
- C-0: Pre-flight checks (git, Supabase CLI version, config dir, linked projects, local status)
- C-1: Start local Supabase Platform project, verify 13 migrations
- C-2: Rename `apps/admin` → `apps/merchant`
- C-3: Resolve money/currency duplication (evidence-first)
- C-4: Resolve SKU validation conflict (evidence-first)
- C-5: Create `@zerocraft/database-types` package (Platform types only)
- C-6: Restore Wrangler config stubs for CF workers (evidence-first)
- C-7: Inspect and disposition `@zerocraft/mcp`
- C-8: Commit and verify all checks

---

## Session D: Security and Database

**Status:** Not Started
**Planned branch:** `arch/session-d-security`

**Planned steps:**
- D-1: Write RLS isolation tests
- D-2: Verify and harden existing RLS policies
- D-3: Create `@zerocraft/permissions` package
- D-4: Restore and verify `tenant-provisioner` wrangler configuration
- D-5: Test Commerce template migrations in dedicated customer DB
- D-6: Commit and verify

---

## Session E: Application Work

**Status:** Not Started

**Priority order (in-scope only):**
- E-1: Platform core (`@zerocraft/tenancy`, org/store data access hardening)
- E-2: Merchant app (vertical implementation, products module first)
- E-3: Platform admin app (`apps/platform`, first screen)

**Deferred (Planned-only, not in Sessions C–G):**
- Storefront (Priority 5)
- Brand and CMS (Priority 7)
- Help (Priority 8)
- Support (Priority 8)

---

## Session F: Cleanup and Documentation

**Status:** Not Started

---

## Session G: Final Verification and Report

**Status:** Not Started

---

## External Configuration Still Required

These must be provided before the corresponding features can be tested.
They are never committed to the repository.

| Variable | Required for | Where to set |
|---|---|---|
| `AUTH_HANDOFF_SECRET` | Cross-subdomain auth handoff | Both apps' `.env.local` |
| `TENANT_SECRET_ENCRYPTION_KEY` | Provisioner AES-256-GCM encryption | `tenant-provisioner-local` env |
| `SUPABASE_OAUTH_CLIENT_ID` | Tenant provisioning via CF Worker | `tenant-provisioner` `.dev.vars` |
| `SUPABASE_OAUTH_CLIENT_SECRET` | Tenant provisioning via CF Worker | `tenant-provisioner` `.dev.vars` |
| `SUPABASE_OAUTH_AUTHORIZE_URL` | Tenant provisioning via CF Worker | `tenant-provisioner` `.dev.vars` |
| `SUPABASE_OAUTH_TOKEN_URL` | Tenant provisioning via CF Worker | `tenant-provisioner` `.dev.vars` |
| `CLOUDFLARE_ACCOUNT_ID` | CF Worker deployment | CI environment / local env |

---

## Corrections Applied After Session B Review

The following corrections were made to the migration plan after Session B review (2026-11-27):

### 1. Application and Domain Naming (Corrected)
**Before:** Implicit mapping between repository apps and domains.
**After:** Explicit table in `migration-plan.md` §1.1 and §2.1 mapping:
- `apps/merchant` → `app.zerocraft.in` (store owners)
- `apps/accounts` → `accounts.zerocraft.in` (central auth)
- `apps/platform` → `admin.zerocraft.in` (platform team, future)

### 2. Supabase Migration Safety (Corrected)
**Before:** `supabase start` then `supabase db push` blindly.
**After:** Step C-0 pre-flight checks (CLI version, config dir, linked projects, local status). Step C-1 targets Platform DB only (13 migrations). Commerce template tested separately in Session D. No `supabase db reset` on non-local. No blind `db push`.

### 3. Money and Currency (Corrected)
**Before:** Declare merchant-local `money.ts` as source of truth.
**After:** Step C-3 requires full inspection of both implementations, DB column types, data conventions, callers, and API boundaries before establishing canonical representation. Tests required for conversion, formatting, rounding, zero, large amounts.

### 4. SKU Validation (Corrected)
**Before:** Consolidate immediately using production rule from code.
**After:** Step C-4 requires full inspection of all three implementations, DB constraints, existing data, and callers. Production rule determined from database constraints, not code. No product data modified.

### 5. Database Types (Corrected)
**Before:** Generate types from local Supabase (ambiguous which DB).
**After:** Step C-5 generates Platform DB types only. Commerce template types deferred. Regeneration command documented. No combined/ambiguous schema.

### 6. Wrangler Configuration (Corrected)
**Before:** Create stub configs with all possible bindings.
**After:** Step C-6 inspects each worker's source first. Only verified bindings (from `env.*` references) included. No fake KV/DO/service bindings. Verified vs unverified documented.

### 7. Brand Database and Payment Provider (Corrected)
**Before:** Decision items in Section 7.
**After:** Moved to Section 8 as Deferred ADRs (ADR-002, ADR-006). Non-blocking for Sessions C–D.

### 8. Session C Execution Safety (Corrected)
**Before:** Sequential steps, all must succeed.
**After:** Step C-0 pre-flight. Step C-8 records partial failures: if a prerequisite fails, stop only dependent task, record exact error, continue with independent safe tasks. No completion claim without actual test results.

### 9. Documentation Updates (Corrected)
**Before:** Silent rewrites.
**After:** Original audit findings preserved. Corrections recorded as new entries in progress.md and migration-plan.md with "Corrected" labels and before/after descriptions.

---

## Deferred Architectural Decisions (Recorded as ADRs)

| ADR | Decision | Status |
|---|---|---|
| ADR-002 | Brand DB as separate Supabase project | Recommended — deferred, non-blocking |
| ADR-006 | Payment provider interface designed provider-agnostically; Razorpay first | Recommendation — pending decision #5 (Session E) |

Neither blocks Sessions C or D.