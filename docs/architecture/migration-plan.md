# Zerocraft: Migration Plan

**Session B — Mapping and Plan (Corrected)**
**Date:** 2026-11-27
**Status:** Awaiting approval before Session C begins

---

## 0. How to read this document

Every item is labelled with one of:

- **Verified existing** — confirmed in the repository right now
- **Verified problem** — confirmed gap or defect
- **Missing** — not present, needed for target architecture
- **Recommendation** — proposed action, not yet approved
- **Decision required** — must be resolved before proceeding
- **Deferred** — explicitly out of scope for Sessions C–G
- **Corrected** — updated after Session B review (this revision)

Statements without labels are structural (headings, tables, ordering logic).

---

## 1. Current state summary

### 1.1 Applications

| Repository app | Domain | Responsibility | Target alignment |
|---|---|---|---|
| `admin` | `app.zerocraft.in` | Merchant dashboard (products, orders, customers, inventory, sales channels, POS, settings, onboarding) | **Misnamed.** Rename to `apps/merchant` in Session C. |
| `accounts` | `accounts.zerocraft.in` | Central auth: login, signup, OTP, magic link, session, cross-subdomain handoff, logout | Matches target `accounts` app. Keep as-is. |
| *(future)* | `admin.zerocraft.in` | Internal Zerocraft platform team: orgs, users across orgs, subscriptions, billing admin, platform audit logs, provisioning monitoring | Create as `apps/platform` in Session E (Priority 6). |

**Verified existing:** `apps/admin` contains zero platform-team routes. Its dashboard covers: overview, products/variants/collections, customers, orders, discounts, gift cards, analytics, growth, markets, sales channels (including POS devices/register sessions/settings), locations, store settings, store contact details, product categories, audit logs (store-scoped), users (store members), and organization-account settings. All server actions operate on store- or org-scoped data.

**Verified existing:** `apps/admin/src/app/organizations/page.tsx` and `select-organization/page.tsx` exist. These are org-selection UI for switching context, not platform administration.

**Verified existing:** `apps/admin/src/app/api/onboarding/` routes handle store provisioning flow: OAuth start/finalize/pending, job-status polling, provision trigger, provisioner-status, connections, regions. These are merchant-facing onboarding steps, not platform-admin provisioning controls.

**Verified problem:** The name `apps/admin` will cause persistent confusion between merchant functionality and future platform administration. Every developer reading the name will assume platform scope.

**Missing:** `apps/merchant` — the correctly-named home for existing dashboard content.
**Missing:** `apps/platform` — the future platform administration application (orgs, users across orgs, subscriptions, billing admin, platform audit logs, provisioning monitoring). No routes for this exist anywhere.
**Missing:** `apps/brand` — public website and CMS. Deferred per Session B decision #2.
**Missing:** `apps/storefront` — shared storefront runtime. Deferred per Session B decision #1.
**Missing:** `apps/help`, `apps/support` — deferred per Session B decision #3.

### 1.2 Shared packages

| Package | Path | Status |
|---|---|---|
| `@zerocraft/auth-core` | `packages/auth-core` | **Verified existing.** Used by both apps. Stable public API. |
| `@zerocraft/ui` | `packages/ui` | **Verified existing.** shadcn/ui component library. Used by admin. |
| `@zerocraft/utils` | `packages/utils` | **Verified existing.** INR formatting, SKU utilities. Missing functions vs `apps/admin/src/lib/money.ts`. |
| `@zerocraft/validators` | `packages/validators` | **Verified existing.** Zod schemas. SKU validation conflicts with admin's local schema. |
| `@zerocraft/eslint-config` | `packages/eslint-config` | **Verified existing.** Used by both apps. |
| `@zerocraft/tsconfig` | `packages/tsconfig` | **Verified existing.** Used by both apps. |
| `@zerocraft/mcp` | `packages/mcp` | **Verified existing.** Purpose to be confirmed in Session C before any changes. |

**Verified problem:** `apps/admin/src/lib/money.ts` duplicates and partially conflicts with `@zerocraft/utils` currency functions (paise vs rupees unit assumption). Documented in audit-report.md Risk #7.

**Verified problem:** SKU validation has three implementations with incompatible rules. Documented in audit-report.md Risk #8.

**Missing:** `@zerocraft/database-types` — generated Supabase types shared across apps. Currently each app generates or copies its own.
**Missing:** `@zerocraft/permissions` — central permission/role module. Currently no centralized authz enforcement exists.
**Missing:** `@zerocraft/tenancy` — tenant context utilities (org resolution, store resolution, tenant-aware Supabase client). Currently duplicated between apps.

Packages listed under Section 5 (Target) that are not listed above are **Deferred** — they will be created only when a feature requiring them is implemented in Session E.

### 1.3 Workers

| Worker | Path | Runtime | Function | wrangler.toml |
|---|---|---|---|---|
| `tenant-provisioner` | `workers/tenant-provisioner` | Cloudflare Workers | Provisions customer-owned Supabase projects via Management API; 9-step state machine | **Missing** |
| `tenant-provisioner-local` | `workers/tenant-provisioner-local` | Node.js (HTTP server) | Local dev mirror of CF provisioner; uses `pg` direct connection; has maintenance-lock and secret-rotation-cli | n/a (Node process) |
| `public-cdn` | `workers/public-cdn` | Cloudflare Workers | Static asset serving / CDN routing | **Missing** |
| `taxonomy` | `workers/taxonomy` | Cloudflare Workers | Product taxonomy service | **Missing** |

**Verified existing:** `tenant-provisioner-local` has compiled `dist/` output, full dependency tree installed, and working `dev`/`build`/`test`/`rotate`/`verify` scripts. It is the active local development tool.

**Verified problem:** `workers/tenant-provisioner`, `workers/public-cdn`, and `workers/taxonomy` have no `wrangler.toml`. Their `package.json` scripts reference `wrangler dev` but nothing configures account ID, routes, bindings, or compatibility flags. These workers cannot be deployed or run locally via Wrangler. Documented in audit-report.md Risk #10.

**Verified existing:** All three CF workers have `src/index.ts` and `src/index.test.ts`. The source code exists; only the deployment configuration is missing.

**Verified existing:** `tenant-provisioner-local` node_modules use `.ignored_` prefix on several packages (pg, uuid, typescript, vitest). This is pnpm's hoisting behavior — the packages are present and functional via the workspace, not absent.

### 1.4 Database

**Verified existing:** Platform DB — 13 forward-only migrations covering identity, RBAC, organizations, memberships, auth handoff tokens, store registry, tenant DB registry, sales channels, provisioning jobs, audit logging.

**Verified existing:** Commerce template — 15 migrations applied to each customer-owned Supabase project at provisioning time, covering catalog, inventory, orders, customers, payments, shipping, POS, discounts, RLS.

**Verified problem:** Local Supabase is not running. Migrations are unverified against an actual database. No RLS tests have been run. Documented in audit-report.md Risks #1, #6.

**Verified problem:** RLS test files were deleted (`supabase/tests/phase2/rls_tests.sql`, `rbac_tests.sql`). No automated tenant-isolation tests exist.

**Missing:** Billing schema — no tables for subscriptions, plans, invoices, or payments exist in the platform DB.

**Missing:** Payment provider integration — no Razorpay or Stripe SDK, no webhook handler routes. Documented in audit-report.md Risk #5.

### 1.5 Auth and security

**Verified existing:** Cross-subdomain auth handoff: PKCE-bound, HMAC-signed tokens, server-side validation, secure redirect, no tokens in URLs. Architecture is sound.

**Verified problem:** `AUTH_HANDOFF_SECRET` is not configured in either app's `.env.example` (empty string). Cross-subdomain auth will fail without it. Documented in audit-report.md Risk #3.

**Verified problem:** `TENANT_SECRET_ENCRYPTION_KEY` is not configured. AES-256-GCM encryption of OAuth tokens and tenant DB passwords in the provisioner will fail. Documented in audit-report.md Risk #4.

**Verified problem:** Supabase OAuth credentials (`SUPABASE_OAUTH_CLIENT_ID`, `SUPABASE_OAUTH_CLIENT_SECRET`, `SUPABASE_OAUTH_AUTHORIZE_URL`, `SUPABASE_OAUTH_TOKEN_URL`) are empty. Tenant provisioning workflow cannot run. Documented in audit-report.md Risk #2.

**Missing:** Central permission module. Role checks are currently string comparisons scattered across server actions. No single enforcement point exists.

**Missing:** Platform-level roles (`platform_super_admin`, `platform_admin`, etc.) are defined in migration SQL but no application code enforces them or routes based on them.

---

## 2. Target state summary

### 2.1 Application dispositions

| App | Disposition | Justification |
|---|---|---|
| `apps/admin` → `apps/merchant` | **Rename** | Verified: contains 100% merchant content. Renaming prevents permanent confusion with future platform admin. |
| `apps/accounts` | **Keep, extend** | Verified: correct responsibility. Needs SESSION_B-identified gaps filled (secrets, tested auth flow). |
| `apps/platform` | **Create (Session E, priority 6)** | Missing. No platform-admin routes exist anywhere. Create only after merchant app is stable. |
| `apps/brand` | **Deferred — Planned only** | Per Session B decision #2. Document architecture; do not implement in Sessions C–G. |
| `apps/storefront` | **Deferred — Planned only** | Per Session B decision #1. Document architecture; do not implement in Sessions C–G. |
| `apps/help` | **Deferred — Planned only** | Per Session B decision #3. |
| `apps/support` | **Deferred — Planned only** | Per Session B decision #3. |

### 2.2 Package dispositions

| Package | Disposition | Session |
|---|---|---|
| `@zerocraft/auth-core` | Keep, extend with permission helpers | C |
| `@zerocraft/ui` | Keep as-is | — |
| `@zerocraft/utils` | Extend: add missing money functions, resolve SKU conflict | C |
| `@zerocraft/validators` | Extend: resolve SKU validation conflict | C |
| `@zerocraft/eslint-config` | Keep as-is | — |
| `@zerocraft/tsconfig` | Keep as-is | — |
| `@zerocraft/mcp` | Inspect, keep or remove based on evidence | C |
| `@zerocraft/permissions` | Create: central role/permission module | D |
| `@zerocraft/database-types` | Create: shared generated Supabase types (Platform only in C) | C |
| `@zerocraft/tenancy` | Create: tenant context resolution | E (priority 3) |

All other packages listed in Section 5 of the system prompt are **Deferred** — created only when the feature requiring them is implemented.

### 2.3 Worker dispositions

| Worker | Disposition | Session |
|---|---|---|
| `tenant-provisioner` | Restore `wrangler.toml`; verify bindings and env vars; test locally | D |
| `tenant-provisioner-local` | Keep as-is; ensure it starts cleanly before Session D DB work | C |
| `public-cdn` | Restore `wrangler.toml`; verify source; document bindings | C |
| `taxonomy` | Restore `wrangler.toml`; verify source; document bindings | C |

### 2.4 Database dispositions

| Area | Disposition | Session |
|---|---|---|
| Local Supabase Platform project | Start, apply all 13 migrations, verify | C (prerequisite) |
| Commerce template migrations | Test separately in dedicated local customer DB environment | D |
| Platform DB schema | Keep existing; add billing tables in Session E | D/E |
| RLS policies | Verify existing; write isolation tests | D |
| Billing schema | Design and migrate (forward-only) | E (priority 3) |
| Payment provider | Architecture documented; implementation deferred pending provider decision | E (priority 3) |

---

## 3. Migration dependencies and ordering

The dependency graph is strict. Each session has a required precondition.

```
Session C (Foundation)
  Prerequisite: git branch created, working tree clean
  Prerequisite: local Supabase Platform project starts successfully
  Prerequisite: pnpm install completes cleanly
  Prerequisite: Supabase CLI version identified, config directory identified
  Prerequisite: No remote project linked for local development
  Outputs: renamed app, resolved package conflicts, wrangler.toml stubs,
           Platform database-types package, local Supabase verified

Session D (Security and Database)
  Prerequisite: Session C complete and committed
  Prerequisite: local Supabase running with all 13 Platform migrations applied
  Outputs: permissions package, RLS tests passing, isolation verified,
           tenant-provisioner wrangler.toml restored and locally verified

Session E (Application work — one priority area per run)
  Prerequisite: Session D complete
  Priority order: Foundation → Identity → Platform core → Merchant → Storefront
                  → Platform admin → Brand → Help/Support → Production readiness
  Note: Storefront, Brand, Help, Support are Planned-only. Skip to next.
  Actual execution order: Platform core (orgs/stores/provisioning) → Merchant app
                           → Platform admin app

Session F (Cleanup and documentation)
  Prerequisite: Session E complete for all in-scope priorities

Session G (Final verification)
  Prerequisite: Session F complete
```

---

## 4. Session C — Foundation (detailed plan)

### Step C-0: Pre-flight checks (must complete before any other step)

**Why:** Ensure the environment is in a known state before any mutation.

Actions:
1. `git status` — confirm working tree is clean or only has docs changes.
2. `git branch` — confirm we are on `main` or a known branch.
3. `pnpm --version` — record version.
4. `supabase --version` — record CLI version.
5. Identify Supabase configuration directory: `infrastructure/supabase/` (from audit).
6. Check for linked remote project: `supabase projects list` and inspect `infrastructure/supabase/config.toml` for `project_id`.
7. Check if local stack is already running: `supabase status`.
8. Record all findings in `progress.md`.
9. Create branch: `git checkout -b arch/session-c-foundation`.

Acceptance criteria:
- All pre-flight facts recorded.
- Branch `arch/session-c-foundation` created.

Rollback: `git checkout main` + `git branch -D arch/session-c-foundation`.

### Step C-1: Start local Supabase Platform project and verify 13 migrations

**Why first:** Every database step in Sessions C–G depends on a running local instance. Nothing else proceeds without this. The Platform DB and Commerce template DB are separate; only the Platform DB is started here.

Actions:
1. `cd infrastructure/supabase && supabase start` (or `pnpm db:start` from root if it targets this directory).
2. Wait for `supabase status` to show all services healthy.
3. Verify the 13 Platform migrations are applied: `supabase migration list` should show all 13 with "Applied" status.
4. If `supabase start` does not auto-apply migrations, run `supabase db reset` **only against the local Platform project** and confirm it applies all 13 cleanly.
5. Record the local connection string, anon key, and service-role key names (not values) in `progress.md`.
6. If any step fails, diagnose Docker state, CLI version mismatch, or port conflicts and record the exact error in progress.md before continuing.

**Acceptance criteria:**
- `supabase status` shows all services running.
- All 13 Platform migrations are confirmed applied.
- No migration errors or conflicts.
- Connection details recorded (names only).

**Prohibited commands (do not run):**
- `supabase db reset` against any non-local database.
- `supabase db push` without confirming target project.
- Any command targeting a remote Supabase project.

**Rollback:** `supabase stop` — no data at risk, local only.

### Step C-2: Rename `apps/admin` to `apps/merchant`

**Why:** Verified misname. Every subsequent session will reference the correct name. Do this before any code changes so the branch history is clean.

Actions:
1. `git mv apps/admin apps/merchant`
2. Update `pnpm-workspace.yaml` if it references `apps/admin` by path.
3. Update root `package.json` scripts that reference `apps/admin`.
4. Update `package.json` `name` field: `@zerocraft/admin` → `@zerocraft/merchant`.
5. Find and replace all workspace references: `grep -r "zerocraft/admin" --include="*.json" --include="*.ts" --include="*.tsx" --include="*.mjs"`.
6. Update any import aliases or Next.js config that hardcodes the app path.
7. Run `pnpm install` to update the lockfile.
8. Run `pnpm --filter @zerocraft/merchant typecheck`. Verify zero new errors.
9. Run `pnpm --filter @zerocraft/merchant lint`. Verify zero new errors.

Acceptance criteria:
- `apps/merchant` exists, `apps/admin` does not.
- `pnpm install` exits 0.
- `typecheck` and `lint` pass with no new failures (pre-existing failures recorded separately).
- `git status` shows only the rename and updated config files.

Rollback: `git mv apps/merchant apps/admin` + reverse config changes + `pnpm install`.

### Step C-3: Resolve money/currency duplication (evidence-first)

**Why:** Two implementations with incompatible unit assumptions (`apps/admin/src/lib/money.ts` uses paise as integers; `@zerocraft/utils` has rupee-based formatting). Both are used. Leaving both risks silent data corruption when new code picks the wrong one.

**Corrected approach:** Do not pre-declare a source of truth. Inspect all evidence first.

Actions:
1. Read `apps/merchant/src/lib/money.ts` in full. Catalog every exported function, its signature, unit assumption (paise/rupees/decimal), and error handling.
2. Read `@zerocraft/utils/src/currency.ts` in full. Same catalog.
3. Inspect Platform DB monetary column types: query `information_schema.columns` for `numeric`, `integer`, `bigint` columns in tables related to money (products, orders, payments, discounts). Record each column's type and any CHECK constraints.
4. Inspect Commerce template monetary column types (same method, against a test customer DB if available, otherwise from migration SQL).
5. Inspect existing product, order, payment, and discount data conventions (if sample data exists).
6. Identify all callers of both implementations across the monorepo: `grep -r "from.*money" --include="*.ts" --include="*.tsx"` and `grep -r "from.*utils.*currency" --include="*.ts" --include="*.tsx"`.
7. Identify serialization and API boundaries: where does money leave the system (API responses, webhooks, payment provider payloads)?
8. Based on evidence, establish one canonical internal money representation and safe conversion functions.
9. Implement the chosen consolidation: add missing functions to `@zerocraft/utils`, make the other re-export where signatures are compatible, document conflicts explicitly with deprecation comments (no silent caller changes).
10. Add `CURRENCY_UNIT.md` in `packages/utils/` documenting the canonical representation.
11. Add tests covering conversion, formatting, rounding, zero values, and large amounts.
12. Run `pnpm --filter @zerocraft/utils typecheck`.
13. Run `pnpm --filter @zerocraft/merchant typecheck`.

Acceptance criteria:
- No duplicate implementations with conflicting units.
- All callers in `apps/merchant` continue to compile.
- Canonical representation documented with evidence trail.
- Conversion/formatting tests pass.

Rollback: Revert `@zerocraft/utils/src/currency.ts` and `money.ts` changes.

### Step C-4: Resolve SKU validation conflict (evidence-first)

**Why:** Three implementations with different rules. Any new code picking one at random will produce incompatible SKUs in the database.

**Corrected approach:** Full inspection before any consolidation.

Actions:
1. Read `apps/merchant` SKU schema (local to products components).
2. Read `@zerocraft/validators/src/product.ts` (or `schemas.ts`) `skuSchema`.
3. Read `@zerocraft/utils` `buildSku`/`validateSku`/`parseSku`.
4. Inspect database constraints: Platform DB and Commerce template `products`/`product_variants` table `sku` column types, CHECK constraints, and indexes.
5. Inspect existing product data and conventions (if sample data exists in local DB).
6. Identify every caller across the monorepo.
7. Determine the actual production-compatible rule from the database constraints (not from code).
8. Update `@zerocraft/validators/src/product.ts` to match the production rule.
9. Update `@zerocraft/utils` SKU functions to match.
10. Update any merchant-local schema to import from `@zerocraft/validators` rather than redefining.
11. Document the canonical SKU format in `packages/validators/SKU.md` with evidence.
12. Run typecheck and lint on affected packages and apps.

Acceptance criteria:
- One SKU validation implementation.
- All callers compile.
- Format rule documented with evidence from database constraints.
- No existing product data modified.

Rollback: Revert validators and utils changes.

### Step C-5: Create `@zerocraft/database-types` package (Platform only)

**Why:** Each app currently has its own copy or generates its own Supabase types. When schema changes, only the app that regenerated its types is updated.

**Corrected:** Generate only Platform DB types in Session C. Commerce template types are separate and deferred.

Actions:
1. Create `packages/database-types/` with `package.json` (`@zerocraft/database-types`), `tsconfig.json` extending `@zerocraft/tsconfig`, and `src/index.ts`.
2. After Step C-1 (local Supabase Platform project running and verified): run `supabase gen types typescript --local --project-ref <platform-local-ref> > packages/database-types/src/platform.ts`.
3. Export from `src/index.ts`: `export * from './platform'`.
4. Add `@zerocraft/database-types` to `pnpm-workspace.yaml`.
5. Add as a dependency in `apps/merchant/package.json` and `apps/accounts/package.json`.
6. Remove or alias any existing local type generation in the apps.
7. Document the regeneration command in `packages/database-types/REGENERATE.md`.
8. Run `pnpm --filter @zerocraft/database-types typecheck`.

Acceptance criteria:
- `packages/database-types` exists with generated Platform types only.
- Both apps import from `@zerocraft/database-types` without errors.
- No duplicate type definitions.
- Regeneration command documented.

Rollback: Remove package, restore app-local type files.

### Step C-6: Restore Wrangler configuration stubs for CF workers (evidence-first)

**Why:** `tenant-provisioner`, `public-cdn`, and `taxonomy` have no `wrangler.toml`. Their source code exists but they cannot be run locally or deployed.

**Corrected:** Inspect each worker's actual source before defining bindings. No fake bindings.

Actions (per worker):
1. Read `src/index.ts` in full to identify: required bindings (env vars, KV namespaces, Durable Objects, service bindings), compatibility requirements, and routes.
2. Create a minimal `wrangler.toml` with:
   - `name`, `main`, `compatibility_date` (use current date)
   - All `env.*` references from source as `[vars]` stubs with empty string values
   - KV/DO/service bindings **only if actually referenced in source code**
   - A `[dev]` section for local development port
3. Create a matching `.dev.vars.example` listing all required secrets (from `env.*` usage).
4. Do NOT put real values in any config file.
5. Run `wrangler dev --dry-run` (if Wrangler is installed) to verify config parses correctly.
6. Document in `docs/deployment/worker-requirements.md` which configuration is verified (parses) vs which requires external Cloudflare setup (KV namespace creation, DO migration, service binding targets).

Acceptance criteria:
- All three CF workers have `wrangler.toml`.
- All three have `.dev.vars.example`.
- No real credentials in any file.
- No fake bindings — every binding corresponds to a source code reference.
- Wrangler dry-run passes OR verification explicitly marked as requiring Session D with Wrangler installed.

Rollback: Delete the new config files.

### Step C-7: Inspect and disposition `@zerocraft/mcp`

**Why:** Package exists but its purpose and usage were not fully characterized in Session A.

Actions:
1. Read `packages/mcp/src/index.ts` and all exports.
2. `grep -r "@zerocraft/mcp"` across the entire monorepo.
3. If used: document what it does and keep it.
4. If unused: document the finding in progress.md. Do not delete — mark for Session F.

Acceptance criteria:
- Usage status is documented with evidence.
- No code changed in this step.

### Step C-8: Commit and verify

Actions:
1. Run full affected-package checks: `pnpm --filter @zerocraft/merchant typecheck lint test`, `pnpm --filter @zerocraft/accounts typecheck lint test`, `pnpm --filter @zerocraft/utils typecheck`, `pnpm --filter @zerocraft/validators typecheck`, `pnpm --filter @zerocraft/database-types typecheck`.
2. Record all results (pass/fail, pre-existing vs new) in progress.md.
3. If a prerequisite fails (e.g., Supabase won't start), stop only the dependent task, record the exact error, and continue with independent safe tasks (rename, package inspection, wrangler stubs).
4. Commit on branch `arch/session-c-foundation`.

---

## 5. Session D — Security and database (detailed plan)

**Prerequisite:** Session C complete, local Supabase Platform project running, all 13 migrations applied.

### Step D-1: Write RLS isolation tests

**Why:** RLS policies exist but tests were deleted. No automated proof that tenant isolation holds.

Actions:
1. Create `supabase/tests/rls/` directory.
2. Write SQL tests proving:
   - User in org A cannot read org B's stores.
   - User in org A cannot write to org B's stores.
   - User with no org membership cannot read any org data.
   - Platform service role can read all (required for provisioning).
   - `private.current_org_ids()` returns only the calling user's orgs.
3. Run via `supabase test db` or `psql` against the local database.
4. All tests must pass before proceeding.

Acceptance criteria:
- Tests exist in `supabase/tests/rls/`.
- All isolation tests pass against local database.
- Results recorded in progress.md.

Rollback: Delete test files. No schema changes in this step.

### Step D-2: Verify and harden existing RLS policies

Actions:
1. Read every RLS policy in every platform migration.
2. For each table: verify enable, verify SELECT/INSERT/UPDATE/DELETE policies, verify they use `private.current_org_ids()` or equivalent.
3. If any table has RLS enabled but no policies (blocks all access): document and fix.
4. If any policy uses client-supplied org_id without server-side verification: fix.
5. Write a forward-only migration for any fix. Never edit existing migration files.

Acceptance criteria:
- Every platform table with business data has verified RLS policies.
- All D-1 tests still pass after any fixes.
- Zero policies use unverified client-supplied identifiers.

### Step D-3: Create `@zerocraft/permissions` package

**Why:** Role checks are scattered string comparisons. No central enforcement point. Required before any new application feature can safely implement authorization.

Actions:
1. Create `packages/permissions/` with `package.json` (`@zerocraft/permissions`), `tsconfig.json`, `src/index.ts`.
2. Define role types matching the platform DB RBAC schema (read the actual enum values from migrations, do not invent them).
3. Define permission check functions: `hasRole(user, role)`, `requireRole(user, role)` (throws if not met), `hasOrgAccess(user, orgId)`, `hasStoreAccess(user, storeId)`.
4. All checks must work server-side only. No client exports that would allow bypass.
5. Add tests: verify that a user without the required role fails, verify that a user with the role passes.
6. Add as dependency in `apps/merchant` and `apps/accounts`.
7. Replace the first three scattered role checks in `apps/merchant` as a proof of concept (do not attempt full migration in this step).

Acceptance criteria:
- Package exists and typechecks.
- Tests pass.
- At least three merchant server actions use `@zerocraft/permissions` for role checks.

### Step D-4: Restore and verify `tenant-provisioner` Wrangler configuration

**Why:** The CF provisioner cannot run without its configuration. Tenant provisioning is a critical path for new store onboarding.

Actions:
1. Read `workers/tenant-provisioner/src/index.ts` in full.
2. Identify all `env.*` references — these are required bindings.
3. Complete the `wrangler.toml` stub from Step C-6 with all verified bindings.
4. Document each binding's purpose and where the value comes from (Supabase Management API OAuth, platform DB connection, etc.).
5. Cross-reference with `workers/tenant-provisioner-local` to ensure feature parity in the binding list.
6. Run `wrangler dev --dry-run` to verify config parses correctly (if Wrangler is installed).
7. Document the external requirements (Supabase OAuth app registration, Management API access) that must be satisfied before this worker can run against real infrastructure.

Acceptance criteria:
- `wrangler.toml` is complete and parses cleanly.
- Every `env.*` reference in source code has a corresponding binding declared.
- External requirements documented in `docs/deployment/worker-requirements.md`.

**Stop condition:** Do not attempt to run the provisioner against real Supabase infrastructure. Local verification via `tenant-provisioner-local` only.

### Step D-5: Test Commerce template migrations in dedicated customer DB

Actions:
1. Create a separate local Supabase project for Commerce template testing (or use a separate schema if supported).
2. Apply all 15 Commerce template migrations.
3. Verify they apply cleanly.
4. Record results in progress.md.

Acceptance criteria:
- All 15 Commerce template migrations apply cleanly in isolated environment.
- No cross-contamination with Platform DB.

### Step D-6: Commit and verify

Same pattern as C-8: run all affected checks, record results, commit on `arch/session-d-security`.

---

## 6. Session E — Application work (priority order)

Session E executes one priority area per run. This plan covers the first three that are in scope (Foundation and Identity are addressed in C and D; Storefront, Brand, Help, Support are deferred).

### E-1: Platform core (Priority 3)

Scope: Organizations, memberships, stores, domains, provisioning job UI, store configuration.

**Prerequisite:** `@zerocraft/permissions` exists and passes tests (Session D).

Work items:
1. Audit existing org/store data-access code in `apps/merchant`. Map which server actions read org context and from where.
2. Create `@zerocraft/tenancy` package: org resolution from session, store resolution from org context, tenant-aware Supabase client factory (uses service role server-side, anon client client-side, never crosses tenant boundary).
3. Replace direct org_id reads from request params in merchant server actions with verified tenancy package calls.
4. Verify that no server action accepts a client-supplied org_id or store_id without server-side membership verification.
5. Add tenancy isolation tests: request with valid org_id but wrong user is rejected.

Acceptance criteria:
- `@zerocraft/tenancy` package exists with tests.
- Zero merchant server actions accept unverified org/store identifiers.
- Tenancy isolation tests pass.

### E-2: Merchant app (Priority 4)

Scope: Complete vertical implementation of one merchant module (products recommended as the most developed based on audit evidence). Remaining modules mapped but not implemented.

Work items (per module implemented):
1. Data access layer: typed Supabase queries using `@zerocraft/database-types`.
2. Authorization: `@zerocraft/permissions` checks at every server action.
3. Tenant scoping: `@zerocraft/tenancy` for all org/store resolution.
4. UI: existing route/component structure preserved and connected to real data.
5. Tests: server action unit tests, at least one integration test per module.

### E-3: Platform admin (Priority 6)

**Prerequisite:** Merchant app stable. This is a new application.

Work items:
1. Create `apps/platform` with minimal Next.js App Router structure.
2. Auth: integrate with `apps/accounts` via the existing cross-subdomain handoff.
3. First screen: organization list (read-only). Verifies platform role check works end-to-end.
4. Add routes incrementally. Do not ship a half-implemented screen as "done."

Acceptance criteria for E-3 start:
- `apps/platform` builds cleanly.
- Organization list renders with real data for a platform_admin role.
- A user without platform role cannot access any route.

---

## 7. Decisions requiring approval before Session C

### Decision 1: `apps/admin` rename timing

**Recommendation:** Rename at the start of Session C (Step C-2) before any other code changes, so the entire session history uses the correct name.

**Risk:** Any open PRs, CI references, or deployment config that hardcodes `apps/admin` will break and need updating.

**Question:** Are there any open pull requests or deployment pipeline configurations that reference `apps/admin` by name that would be broken by an immediate rename?

### Decision 2: Docker Desktop availability

**Question:** Is Docker Desktop confirmed running and available for local Supabase in Session C?

### Decision 3: Wrangler CLI availability

**Question:** Is Wrangler CLI installed globally or as a workspace devDependency? (Session C-6 needs it for dry-run verification.)

### Decision 4: Maara vs Zerocraft naming

**Question:** The `tenant-provisioner-local` package.json describes it as "Maara platform" — is "Maara" the internal project name and "Zerocraft" the product/brand name? This affects naming conventions in new code.

### Decision 5: Remote Supabase projects

**Question:** Are there any remote Supabase projects (staging or production) already created? The plan assumes local-only for Sessions C–G, but if a staging project exists, its migration state needs to be known before Session D.

### Decision 6: Deployment target for merchant/accounts

**Question:** What is the target deployment platform for `apps/merchant` and `apps/accounts`? The audit found no Vercel config. CI/CD is currently absent (Risk #9 in audit).

---

## 8. Deferred architectural decisions (recorded as ADRs, non-blocking)

| ADR | Decision | Status |
|---|---|---|
| ADR-002 | Brand DB as separate Supabase project | Recommended — deferred, non-blocking |
| ADR-006 | Payment provider interface designed provider-agnostically; Razorpay first | Recommendation — pending decision #5 (Session E) |

Neither blocks Sessions C or D.

---

## 9. Risks (updated)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | Local Supabase fails to start (Docker issue, port conflict, CLI version mismatch) | Critical | Diagnose before any other Session C work. Record exact error. All DB steps depend on this. |
| 2 | `apps/admin` rename breaks undiscovered references | High | Full `grep` before rename (Step C-2 actions). Typecheck and lint after. Git mv preserves history. |
| 3 | SKU conflict resolution changes existing product data behavior | High | Determine production rule from schema constraints, not code. Test with existing data before changing validators. |
| 4 | Money unit conflict (paise vs rupees) causes silent data errors if wrong implementation is used during transition | High | Do not remove either implementation until all callers are verified. Evidence-first consolidation. |
| 5 | `AUTH_HANDOFF_SECRET` and `TENANT_SECRET_ENCRYPTION_KEY` are not set | Critical | Cannot test cross-subdomain auth or provisioning encryption until these are configured. Document as external requirement. Do not commit values. |
| 6 | Wrangler not installed, CF workers cannot be verified | Medium | Verify with `wrangler --version` at start of Session C. If missing, install as devDependency or globally. Workers can be stubbed without deployment. |
| 7 | Commerce template migrations not tested against local Supabase | High | Apply all 15 template migrations to a test schema in Session D. Verify before writing isolation tests that depend on the schema. |
| 8 | Blind Supabase command execution targets wrong project | Critical | Pre-flight checks (C-0) identify config, CLI version, linked projects. Never run without confirmation. |

---

## 10. Rollback strategy summary

Every step in Sessions C and D is independently reversible:

- **Rename (C-2):** `git mv` in reverse + config revert + `pnpm install`.
- **Package changes (C-3, C-4, C-5, D-3):** `git revert` the commit for that step. Downstream apps revert with it because they're in the same monorepo.
- **Wrangler config (C-6, D-4):** Delete the new files. No runtime behavior changed.
- **Migration (D-2 fixes):** Forward-only migrations cannot be rolled back without data risk. For Session D, all migration fixes apply only to the local database. Rolling back means `supabase db reset` on local only. Document any fix that would be destructive if applied to production before it is applied there.
- **RLS tests (D-1):** Delete test files. No schema changes.

**Hard rule:** No migration file is edited or deleted. No `supabase db reset` on any non-local database. No production credentials used at any point in Sessions C–G.

---

## 11. Architecture decisions to record as ADRs

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Application boundaries: `merchant` vs `platform` vs `accounts` as separate Next.js apps | Recommended — pending approval |
| ADR-002 | Brand DB as separate Supabase project | Recommended — deferred, non-blocking |
| ADR-003 | Central auth in `accounts` app with cross-subdomain HMAC-signed handoff | Verified existing — document as approved |
| ADR-004 | Multi-tenancy: User → Org → Stores with customer-owned Supabase projects | Verified existing — document as approved |
| ADR-005 | Cloudflare Workers for provisioning and CDN; Next.js apps on Vercel | Recommended — CF Workers confirmed target, Vercel TBD |
| ADR-006 | Payment provider interface designed provider-agnostically; Razorpay first | Recommendation — pending decision #5 |

---

## 12. Planned-only architecture (not implemented in Sessions C–G)

### Storefront (Planned)

A single shared Next.js application serving all merchant storefronts:

- **Domain resolution:** Incoming request hostname matched against `store_domains` table in platform DB. Resolution is edge-cached and invalidated on domain configuration changes.
- **Tenant-aware data access:** Resolved store_id used to look up tenant DB credentials from the platform DB registry. All catalog/cart/checkout queries execute against the customer-owned Supabase project, never the platform DB.
- **Shared runtime:** One deployment, not one app per merchant. Middleware handles domain-to-store resolution before any page renders.
- **Dependencies required before implementation:** `@zerocraft/tenancy` (Session E-1), platform DB billing tables (Session E), domain management UI in merchant app.
- **Implementation path:** Session E (Priority 5) — only after merchant app and platform core are stable.

### Brand and CMS (Planned)

Application `apps/brand` at `zerocraft.in` with CMS at `zerocraft.in/studio`:

- **Auth:** Reuses `apps/accounts` identity. CMS access requires a platform staff role.
- **Data boundary:** Separate Brand DB (pending ADR-002 decision). Tables: pages, sections, services, projects, posts, navigation, media metadata, SEO config, enquiries, brand settings.
- **CMS model:** Structured content, developer-designed schemas, content-team managed. Not a visual website builder.
- **Implementation path:** Dedicated phase after Sessions C–G. Requires ADR-002 finalized and Brand DB provisioned.

### Help (Planned)

Static or CMS-driven documentation site at `help.zerocraft.in`. Content boundary separate from brand. Implementation path: after Brand is stable.

### Support (Planned)

Ticket and conversation management at `support.zerocraft.in`. Responsibilities separate from platform administration (which manages users and billing) and merchant commerce. DB boundary: separate support DB or shared with help. Implementation path: after platform admin is stable.

---

## 13. Session C — Commands that will be executed

### Read-only / Inspection (safe):
- `git status`, `git branch`, `pnpm --version`, `supabase --version`
- `supabase status`, `supabase projects list`
- `cat infrastructure/supabase/config.toml`
- `grep -r` searches across codebase
- Reading source files (`money.ts`, `currency.ts`, SKU implementations, worker `index.ts`, `mcp/index.ts`)
- `wrangler --version`, `wrangler dev --dry-run`

### Mutation (require approval / verified prerequisites):
- `git checkout -b arch/session-c-foundation`
- `git mv apps/admin apps/merchant`
- `pnpm install`
- `pnpm --filter @zerocraft/merchant typecheck lint`
- `supabase start` (or `pnpm db:start`) — **only after C-0 confirms target**
- `supabase migration list` — verify applied
- `supabase gen types typescript --local --project-ref <platform-local-ref>`
- File writes: new package, wrangler configs, documentation
- `git commit`

### Explicitly prohibited:
- `supabase db reset` against non-local database
- `supabase db push` without confirming target project
- Any command targeting a remote Supabase project
- Editing existing migration files
- Committing real credentials or secrets

---

## 14. Session C — Acceptance criteria (complete)

Session C is complete when **all** of the following are true:

1. **Git state:** Branch `arch/session-c-foundation` exists with clean history; all changes committed.
2. **Supabase Platform:** Local instance running; all 13 migrations verified applied; connection details recorded.
3. **App renamed:** `apps/merchant` exists, `apps/admin` does not; `@zerocraft/merchant` package name updated; all workspace references updated; typecheck and lint pass.
4. **Money consolidated:** Single canonical money representation established with evidence; duplicate implementations resolved; conversion/formatting tests pass; all merchant callers compile.
5. **SKU consolidated:** Single canonical SKU validator from database constraints; all callers compile; no product data modified.
6. **Database types:** `@zerocraft/database-types` package exists with Platform types only; both apps import from it; regeneration command documented.
7. **Wrangler stubs:** All three CF workers have `wrangler.toml` and `.dev.vars.example` with verified bindings only; dry-run passes or documented as needing Session D.
8. **MCP inspected:** Usage status documented with evidence.
9. **All checks recorded:** typecheck/lint/test results for affected packages recorded in progress.md.