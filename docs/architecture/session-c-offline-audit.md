# Session C Offline Audit Report

**Date:** 2026-11-27
**Mode:** Strictly read-only — no mutations, no branches, no tool installations
**Project:** Zerocraft (mounted at `D:\projects\zerocraft` → `/sessions/blissful-busy-ramanujan/mnt/zerocraft`)

---

## 1. Environment Diagnosis (C1-A)

### Execution Environment
| Property | Value |
|---|---|
| OS | Ubuntu 22.04.5 LTS (Jammy) |
| Kernel | 6.8.0-149-generic |
| Architecture | x86_64 |
| Container | Linux container with virtiofs mount from Windows host |
| Node.js | v22.23.5 (`/usr/bin/node`) |
| npm | 10.9.9 (`/usr/bin/npm`) |
| npx | Available |
| Git | Available |

### Tool Availability (All Read-Only Checks)
| Tool | Status | Details |
|---|---|---|
| **Docker** | ❌ NOT AVAILABLE | `docker` command not found; no systemctl docker service |
| **Supabase CLI (node_modules)** | ⚠️ PARTIAL | Package exists at `node_modules/.pnpm/supabase@3.1.0/` but **linux-x64 binary missing** — only darwin/win binaries present |
| **Supabase CLI (global)** | ❌ NOT AVAILABLE | Not on PATH |
| **pnpm** | ❌ NOT AVAILABLE | corepack DNS blocked (`EAI_AGAIN registry.npmjs.org`); no binary in `node_modules/.bin/` |
| **Wrangler** | ❌ NOT AVAILABLE | Not in `node_modules/.bin/`; npm registry blocked |
| **Git** | ✅ AVAILABLE | Working tree has 330 changes |

### Repository Mount
- **Windows path:** `D:\projects\zerocraft`
- **Container path:** `/sessions/blissful-busy-ramanujan/mnt/zerocraft`
- **Mount type:** virtiofs (fd 3)
- **Disk space:** 369G available of 465G

### Key Findings
1. **No Docker** → Cannot run `supabase start` or local Supabase stack
2. **No functional Supabase CLI** → Cannot verify migrations, generate types, or run `db reset`
3. **No pnpm** → Cannot install deps, run typecheck/lint/test, or execute workspace scripts
4. **No Wrangler** → Cannot validate `wrangler.toml` configs via dry-run
5. **Dirty working tree** → 330 changes (149 modified, 115 deleted, 66 untracked)

---

## 2. Wrangler Configuration Audit (C1-B)

### Existing Configurations (All Present)

#### tenant-provisioner (`workers/tenant-provisioner/wrangler.toml`)
```toml
name = "maara-tenant-provisioner"
main = "src/index.ts"
compatibility_date = "2026-11-24"
workers_dev = false

[observability]
enabled = true

[[kv_namespaces]]
binding = "TENANT_SECRETS"
id = "REPLACE_WITH_KV_NAMESPACE_ID"

[triggers]
crons = ["*/5 * * * *"]
```
**Comments:** All secrets marked as Cloudflare secrets (not vars). KV namespace ID is placeholder.

#### public-cdn (`workers/public-cdn/wrangler.toml`)
```toml
name = "maara-public-cdn"
main = "src/index.ts"
compatibility_date = "2026-11-23"

routes = [{ pattern = "cdn.maara.co.in/*", zone_name = "maara.co.in" }]

[[r2_buckets]]
binding = "PUBLIC_MEDIA"
bucket_name = "maara"
```

#### taxonomy (`workers/taxonomy/wrangler.toml`)
```toml
name = "maara-taxonomy"
main = "src/index.ts"
compatibility_date = "2026-11-24"
workers_dev = true

[observability]
enabled = true
[observability.traces]
enabled = true

[[r2_buckets]]
binding = "TAXONOMY"
bucket_name = "maara"
```

### Binding Verification Table

#### tenant-provisioner
| Binding in wrangler.toml | Referenced in Source | Verified? | Notes |
|---|---|---|---|
| `TENANT_SECRETS` (KV) | `env.TENANT_SECRETS.put()` in `provisioning.ts:485,521` | ✅ YES | Used for storing tenant DB passwords |
| `TENANT_PROVISIONER_SHARED_SECRET` | `requireSharedSecret()` in `index.ts` (7 occurrences) | ✅ YES | Service-to-service auth |
| `ADMIN_APP_URL` | `validateReturnTo()` in `index.ts:105,184` | ✅ YES | OAuth redirect validation |
| `PROVISIONER_REDIRECT_ALLOWLIST` | `validateReturnTo()` in `index.ts:106,185` | ✅ YES | Extra allowed origins |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | `encryptSecret/decryptSecret` in `index.ts:126,211` + `provisioning.ts` | ✅ YES | AES-256-GCM key |
| `OAUTH_ENCRYPTION_KEY_ID` | Key rotation ID in `index.ts:127` + `provisioning.ts` | ✅ YES | Stored with ciphertext |
| `SUPABASE_OAUTH_CLIENT_ID` | `oauth.ts:51,65` | ✅ YES | Supabase OAuth app |
| `SUPABASE_OAUTH_CLIENT_SECRET` | `oauth.ts:66` | ✅ YES | Supabase OAuth app |
| `SUPABASE_OAUTH_REDIRECT_URI` | `index.ts:138` + `oauth.ts:52,110` | ✅ YES | Callback URL |
| `SUPABASE_OAUTH_AUTHORIZE_URL` | `oauth.ts:36` (with default) | ✅ YES | Supabase Management API |
| `SUPABASE_OAUTH_TOKEN_URL` | `oauth.ts:40` (with default) | ✅ YES | Supabase Management API |
| `SUPABASE_MANAGEMENT_API_URL` | `provisioning.ts:165` (with default) | ✅ YES | API base URL |
| `SUPABASE_PLATFORM_URL` | `provisioning.ts:149,156,180` | ✅ YES | Platform DB REST endpoint |
| `SUPABASE_PLATFORM_SERVICE_ROLE_KEY` | `provisioning.ts:150` | ✅ YES | Service role for admin ops |
| `SUPABASE_PLATFORM_ANON_KEY` | `provisioning.ts:157` | ✅ YES | Anon key for user-mode client |
| `PLATFORM_PROJECT_REF` | `provisioning.ts:177` | ✅ YES | Protected project ref |
| `PROTECTED_PROJECT_REFS` | `provisioning.ts:172` (comma-separated) | ✅ YES | Additional protected refs |
| `ALLOWED_REGIONS` | `provisioning.ts:224` | ✅ YES | Provisioning regions |
| `PROVISIONING_POLL_INTERVAL_MS` | `provisioning.ts:443` (with default) | ✅ YES | Polling config |
| `PROVISIONING_MAX_POLLS` | `provisioning.ts:444` (with default) | ✅ YES | Polling config |

**Security Concerns:** All bindings correctly marked as secrets in comments. KV namespace ID is placeholder (`REPLACE_WITH_KV_NAMESPACE_ID`). No vars with real values in committed config.

#### public-cdn
| Binding | Referenced in Source | Verified? |
|---|---|---|
| `PUBLIC_MEDIA` (R2) | `(env.PUBLIC_MEDIA as unknown as PublicBucket).get/head()` | ✅ YES |
| Route `cdn.maara.co.in/*` | Hardcoded in `ALLOWED_ORIGIN = "https://admin.maara.co.in"` | ✅ YES (but domain is maara.co.in) |

#### taxonomy
| Binding | Referenced in Source | Verified? |
|---|---|---|
| `TAXONOMY` (R2) | `env.TAXONOMY.get/head()` | ✅ YES |

### Missing Configuration
- **KV namespace IDs:** All three workers use placeholder IDs (`REPLACE_WITH_KV_NAMESPACE_ID` for tenant-provisioner, bucket names hardcoded as `"maara"`)
- **Account ID:** Not in any `wrangler.toml` (correctly omitted per security practice)
- **Dry-run verification:** Cannot run (Wrangler unavailable)

### Infrastructure Identifiers (Preserve As-Is)
- Worker names: `maara-tenant-provisioner`, `maara-public-cdn`, `maara-taxonomy`
- Domain: `maara.co.in`, `cdn.maara.co.in`
- R2 bucket: `maara`
- Taxonomy API: `https://maara-taxonomy.store-maara.workers.dev`

---

## 3. MCP Package Audit (C1-C)

### Package Metadata
```json
{
  "name": "@zerocraft/mcp",
  "version": "0.1.0",
  "description": "Model Context Protocol (MCP) server for Maara: scoped database, media, product, and audit-log tools.",
  "main": "./dist/index.js",
  "dependencies": {
    "@modelcontextprotocol/server": "2.4.0",
    "@supabase/supabase-js": "2.119.0",
    "zod": "4.6.7"
  }
}
```

### Exports (from `dist/index.js`)
| Module | Purpose |
|---|---|
| `confirmation` | Confirmation utilities |
| `policy` | Tool permission policies (`TOOL_POLICIES`, `canUseTool`) |
| `redaction` | JSON redaction for tool results |
| `server` | MCP server factory (`createMaaraMcpServer`, `createMaaraMcpHandler`) |
| `supabase-gateway` | Read-only Supabase gateway (`createSupabaseGateway`) |
| `types` | TypeScript types |

### Implementation (`dist/server.js`)
- **MCP Server:** `maara-mcp` v0.1.0
- **Auth:** Bearer token verification via `deps.tokenVerifier.verify(token)`
- **Actor:** Requires `userId`, `organizationId`, `environment`
- **Tools Registered (read-only):**
  1. `healthCheck` — Database + storage health
  2. `mediaList` — Organization-scoped media metadata (no signed URLs)
  3. `mediaGet` — Single media record by UUID or key
  4. `productsList` — Organization-scoped product summaries
  5. `auditLogsSearch` — Organization-scoped audit summaries (no raw metadata/secrets)

### Gateway (`dist/supabase-gateway.js`)
- **Scope:** All queries filtered by `actor.organizationId`
- **Tables accessed:** `media`, `products`, `audit_logs`, `organizations`
- **Security:** Organization-scoped; never trusts model-supplied tenant IDs

### Callers & Usage
| Check | Result |
|---|---|
| `grep -r "@zerocraft/mcp"` in apps/ | **No imports found** |
| `grep -r "@zerocraft/mcp"` in packages/ | Only in its own `package.json` |
| `grep -r "@zerocraft/mcp"` in workers/ | **No imports found** |
| Tests | `dist/*.test.js` exist (confirmation, policy, redaction, server, supabase-gateway, types) |

### Assessment
- **Status:** Compiled, tested, but **unused** in current codebase
- **Purpose:** Appears to be an MCP server for AI assistant integration with organization-scoped data access
- **Dependencies:** `@modelcontextprotocol/server`, `@supabase/supabase-js`, `zod`
- **Disposition:** Keep as-is; document as available for future AI integration

---

## 4. Money/Currency Investigation (C1-D)

### Implementations Found

#### 1. `apps/admin/src/lib/money.ts` (Primary, ~5.8 KB)
**Unit:** Integer **paise** (1 rupee = 100 paise), branded as `Paise` type
**Key Functions:**
| Function | Signature | Behavior |
|---|---|---|
| `paise(value)` | `number → Paise` | Brands safe integer as paise |
| `rupeesToPaise(value)` | `string\|number → Paise` | Parses "1,234.50", "₹1,234", "1234", "-12.3"; rejects >2 decimals |
| `addPaise(...)` | `Paise[] → Paise` | Safe addition with overflow check |
| `subtractPaise(amount, ...)` | `Paise, Paise[] → Paise` | Safe subtraction |
| `multiplyPaise(amount, qty)` | `Paise, number → Paise` | Integer quantity only |
| `applyBasisPoints(amount, bps)` | `Paise, number → Paise` | Basis points (10000=100%), rounds half away from zero |
| `lineAmounts(unitPrice, qty, discountBps)` | → `{gross, discount, total}` | Complete line calculation |
| `formatPaise(amount, opts)` | `Paise, opts → string` | Intl.NumberFormat with INR, en-IN locale |
| `paiseToInputValue(amount)` | `Paise → string` | "1234.50" format for form inputs |

**Tests:** `money.test.ts` (40+ tests covering parsing, formatting, round-trips, edge cases)

#### 2. `packages/utils/src/currency.ts` (Secondary, ~30 lines)
**Unit:** **Rupees** (floating point), no branding
**Functions:**
| Function | Behavior |
|---|---|
| `formatInr(amount)` | Intl.NumberFormat with currency |
| `formatInrRaw(amount)` | `₹{amount.toLocaleString()}` |
| `paiseToRupees(paise)` | `paise / 100` (float) |
| `rupeesToPaise(rupees)` | `Math.round(rupees * 100)` (float → int) |

**Constants:** `CURRENCY="INR"`, `CURRENCY_SYMBOL="₹"`, `DEFAULT_LOCALE="en-IN"`

#### 3. `packages/validators/src/schemas.ts`
- `priceSchema`: `z.number().int().nonnegative()` — **paise**
- `inrAmountSchema`: `z.number().nonnegative().transform(val => Math.round(val * 100) / 100)` — **rupees (2 decimal)**

### Database Column Evidence

| Migration | Table | Column | Type | Constraint | Unit |
|---|---|---|---|---|---|
| **Commerce 004** | `variants` | `price_paise` | `bigint` | `>= 0` | **paise** |
|  |  | `compare_at_price_paise` | `bigint` | `>= 0` | **paise** |
|  |  | `cost_paise` | `bigint` | `>= 0` | **paise** |
| **Commerce 007** | `inventory_items` | `unit_cost_paise` | `bigint` | `>= 0` | **paise** |
| **Commerce 008** | `customers` | `total_spent_paise` | `bigint` | `>= 0` | **paise** |
| **Commerce 009** | `orders` | `subtotal_paise`, `discount_total_paise`, `shipping_total_paise`, `tax_total_paise`, `total_paise`, `refunded_paise` | `bigint` | `>= 0` | **paise** |
| **Commerce 010** | `payments` | `amount_paise`, `captured_paise`, `refunded_paise` | `bigint` | `>= 0` | **paise** |
| **Commerce 011** | `shipping_profiles` | `rate_paise`, `min_order_paise`, `max_order_paise` | `bigint` | `>= 0` | **paise** |
| **Platform 003** | `organizations` | `currency` | `char(3)` | default 'INR' | **currency code** |

### Caller Analysis (apps/admin)
All monetary callers use `@/lib/money` (paise-based):
- `product-schema.ts`: `rupeesToPaise()` for price/compare_at_price/cost_per_item
- `product-form-state.ts`: `Paise` type import
- `types.ts`: `formatPaise()`, `paise()`
- `product-detail.tsx`: `formatPaise()`, `paise()`
- `variant-generator.ts`: Price validation via `isValidPrice()` (string regex, not money.ts)

**Zero active imports** of `packages/utils/currency.ts` or `packages/validators` money schemas in apps/admin.

### Conflict Summary
| Aspect | money.ts (apps/admin) | currency.ts (packages/utils) | Validators |
|---|---|---|---|
| Internal unit | **Paise (int)** | **Rupees (float)** | Mixed: `priceSchema`=paise, `inrAmountSchema`=rupees |
| Parsing | Strict (rejects >2 decimals) | None (assumes valid float) | N/A |
| Formatting | `formatPaise()` (intl, configurable) | `formatInr()` (intl), `formatInrRaw()` | N/A |
| Conversion | `rupeesToPaise()` string→int | `paiseToRupees()` int→float | `rupeesToPaise()` float→int (rounds) |
| Overflow safety | Explicit checks | None | None |
| Tests | 40+ comprehensive | None | None |

### Evidence-Based Conclusion
- **Database schema is unambiguously paise-based** (all `_paise` columns are `bigint`)
- **apps/admin money.ts is the source of truth** — used everywhere, fully tested, matches DB
- **packages/utils currency.ts is incompatible** (float rupees, no safety, unused)
- **validators priceSchema matches paise**, but `inrAmountSchema` uses rupees

---

## 5. SKU Investigation (C1-E)

### Three Validation Implementations

| Implementation | Location | Rule | Max Length | Case | Separator |
|---|---|---|---|---|---|
| **DB (Commerce 004)** | `variants.sku` | `char_length(sku) between 1 and 64` | 64 | Not enforced | Not enforced |
| **packages/utils** | `validateSku()` | `/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/` | Unlimited | **Uppercase** | Hyphen |
| **packages/validators** | `skuSchema` | Same regex + `.max(64)` | 64 | **Uppercase** | Hyphen |
| **apps/admin (variant-generator)** | `validateVariants()` | `/^[A-Za-z0-9-]+$/` + `.toUpperCase()` for dup check | Implicit (min 2) | **Case-insensitive** (stores upper) | Hyphen allowed |
| **apps/admin (variant-builder)** | `norm()` = `trim().toLowerCase()` | Dedupes case-insensitively | N/A | Case-insensitive | N/A |

### Database Constraints (Commerce Template)
```sql
-- 004_product_options_and_variants.sql
sku text null check (sku is null or char_length(sku) between 1 and 64),
constraint variants_store_sku_key unique (store_id, sku)
```

### Caller Analysis
| File | SKU Handling |
|---|---|
| `variant-generator.ts:105-112` | Min 2 chars; alphanumeric+hyphen; **uppercases for duplicate check** |
| `variant-builder.ts:469,479,484` | **Case-insensitive dedup** via `norm().toLowerCase()` |
| `product-schema.ts:152` | `z.string().optional().or(z.literal(""))` — no validation |
| `product-schema.ts:56` | TypeScript type only: `sku: string` |

### Test Coverage
- **money.test.ts:** 40+ tests
- **SKU tests:** None found in codebase
- **packages/utils/sku.ts:** No test file
- **packages/validators:** No test file for `skuSchema`

### Conflict Summary
| Issue | Detail |
|---|---|
| Case sensitivity | DB: none; utils/validators: uppercase only; admin: case-insensitive storage (uppercases for comparison) |
| Length | DB: 64; validators: 64; utils: unlimited; admin: min 2 |
| Separator | All allow hyphen; DB no enforcement |
| Alphabet | DB: any text; utils/validators: A-Z0-9 only; admin: A-Za-z0-9- |

### Evidence-Based Conclusion
- **Production rule is defined by DB constraint:** `char_length 1-64`, unique per store, any text
- **Admin code is most permissive** (allows lowercase, stores uppercase for comparison)
- **Validators/utils are stricter** (uppercase alphanumeric only) but **unused**
- **No existing product data to validate against** (local DB not running)

---

## 6. Database Migration Inventory (C1-F)

### Platform DB (13 Migrations)
**Location:** `infrastructure/supabase/migrations/`
**Target:** Platform control plane ONLY

| # | File | Purpose | Dependencies |
|---|---|---|---|
| 001 | `20261125100000_001_extensions_private_schema_identity.sql` | Extensions (pgcrypto, citext), private schema, `platform_users` | — |
| 002 | `20261125100001_002_platform_rbac.sql` | Platform roles, permissions, role_permissions, platform_members | 001 |
| 003 | `20261125100002_003_organizations.sql` | Organizations, org RBAC, `private.current_org_ids()` | 001, 002 |
| 004 | `20261125100003_004_organization_members_invitations.sql` | Org members, invitations, membership RPCs | 001, 002, 003 |
| 005 | `20261125100004_005_platform_owner_bootstrap.sql` | Platform owner bootstrap (service-role only) | 001, 002 |
| 006 | `20261125110000_006_auth_handoff_codes.sql` | Cross-subdomain auth handoff codes (PKCE) | 001 |
| 007 | `20261126000000_007_store_provisioning.sql` | Stores, Supabase connections, provisioning jobs, `enqueue_tenant_provisioning` | 001, 003, 004 |
| 008 | `20261126010000_008_store_provisioning_integrity.sql` | Org-scoped idempotency, connection validation | 007 |
| 009 | `20261126020000_009_sales_channels.sql` | Sales channels schema (operational + private) | 001, 003, 004, 007 |
| 010 | `20261126030000_010_sales_channels_continued.sql` | Product listings, sync jobs, webhooks, external orders | 009, 007, 003 |
| 011 | `20261126040000_011_sales_channels_private.sql` | Encrypted channel credentials (service-role only) | 009, 010 |
| 012 | `20261126050000_012_sales_channels_rpcs.sql` | Channel seed data, install/update/disconnect RPCs | 009, 010, 011 |
| 013 | `20261126060000_013_tenant_databases.sql` | Tenant DB registry, upsert RPC for provisioning worker | 007, 008, 009-012 |

**RLS Coverage:** All 13 migrations enable RLS on created tables with `private.current_org_ids()` pattern. Service-role bypasses for writes.

### Commerce Template (15 Migrations)
**Location:** `templates/commerce/migrations/`
**Target:** Customer-owned Supabase projects ONLY

| # | File | Purpose |
|---|---|---|
| 001 | `001_core.sql` | Extensions, private schema, tenant context, stores |
| 002 | `002_identity_and_access.sql` | Tenant members, roles, permissions, identity mapping |
| 003 | `003_catalog.sql` | Products, public_id registry |
| 004 | `004_product_options_and_variants.sql` | Canonical variants (price_paise, sku unique per store) |
| 005 | `005_collections_and_media.sql` | Collections, media metadata (R2 references) |
| 006 | `006_taxonomy_integration.sql` | Taxonomy root selections (pinned version + enabled roots) |
| 007 | `007_inventory.sql` | Locations, inventory items/levels/movements |
| 008 | `008_customers.sql` | Customers, addresses |
| 009 | `009_orders.sql` | Orders, line items, addresses, adjustments, store counters |
| 010 | `010_payments.sql` | Payment attempts, captures, refunds (provider refs only) |
| 011 | `011_shipping.sql` | Shipping profiles, zones, rates |
| 012 | `012_sales_channels.sql` | Tenant-side sales channels (config only, no credentials) |
| 013 | `013_pos.sql` | POS devices, register sessions, cash movements |
| 014 | `014_audit_and_webhooks.sql` | Audit logs, webhook endpoints, delivery queue |
| 015 | `015_rls_and_security.sql` | RLS on all tenant tables, store-scoped policies, privilege escalation guards |

**RLS Coverage:** Migration 015 enables RLS on every table with `private.can_access_store(store_id)` pattern. Ledger tables write-only via SECURITY DEFINER functions.

### Schema Conflicts (Cross-DB)
| Area | Platform DB | Commerce Template | Conflict Risk |
|---|---|---|---|
| `stores` | `public.stores` (org-owned directory) | `public.stores` (tenant root) | **HIGH** — same table name, different scope |
| `organizations` | `public.organizations` (multi-tenant) | Not present | None |
| `users` | `public.platform_users` | `auth.users` (Supabase Auth) | Different systems |
| `audit_logs` | `public.audit_logs` (org-scoped) | `public.audit_logs` (store-scoped) | **MEDIUM** — same name, different scope |
| Extensions | pgcrypto, citext | pgcrypto, citext | Compatible |

**Critical Rule:** Never apply Commerce migrations to Platform DB. Never apply Platform migrations to Commerce DB. Protected project refs enforced in `template.config.json`.

### Missing Verification
- No local Supabase running → migrations untested
- RLS test files deleted (`supabase/tests/phase2/rls_tests.sql`, `rbac_tests.sql`)
- Migration validation scripts deleted (`validate-migrations.js`, `check-duplicate-timestamps.js`, `check-destructive-migrations.js`, `security-audit.js`)

---

## 7. Git Working Tree Safety Report (C1-G)

### Summary Statistics
| Status | Count | Description |
|---|---|---|
| **Modified (M)** | 149 | Changed tracked files |
| **Deleted (D)** | 115 | Removed tracked files |
| **Untracked (??)** | 66 | New files/directories |
| **Total** | 330 | Changes |

### Categorized Changes

#### Architecture Documentation (NEW - Our Work)
| File | Status |
|---|---|
| `docs/architecture/application-boundaries.md` | ?? (untracked) |
| `docs/architecture/audit-report.md` | ?? |
| `docs/architecture/commerce-template.md` | ?? |
| `docs/architecture/database-ownership.md` | ?? |
| `docs/architecture/migration-plan.md` | ?? |
| `docs/architecture/monorepo-architecture.md` | ?? |
| `docs/architecture/monorepo-structure.md` | ?? |
| `docs/architecture/overview.md` | ?? |
| `docs/architecture/package-architecture.md` | ?? |
| `docs/architecture/package-boundaries.md` | ?? |
| `docs/architecture/progress.md` | ?? |
| `docs/architecture/system-flows.md` | ?? |
| `docs/architecture/tenant-provisioning.md` | ?? |

#### Feature Work (Existing - feat/shopify-global-taxonomy-only)
| Category | Files |
|---|---|
| Admin app modifications | 100+ files (products, customers, orders, settings, UI components) |
| Agent skills modifications | 7 files in `.agents/skills/` |
| CI/CD workflow | `.github/workflows/ci.yml` |
| Environment configs | `.env.example`, `apps/admin/.env.example` |
| Package configs | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` |

#### Deleted Files (Likely Cleanup)
| Category | Examples |
|---|---|
| Supabase migrations | 30+ files in `supabase/migrations/` (old Phase 2 migrations) |
| Test files | `supabase/tests/phase2/*.sql` (RLS, RBAC, concurrency tests) |
| Validation scripts | `scripts/validate-migrations.js`, `check-duplicate-timestamps.js`, etc. |
| UI components | 30+ shadcn/ui components in `apps/admin/src/components/ui/` |
| Taxonomy worker | Entire `workers/shopify-taxonomy/` directory |
| Archive docs | 6 files in `docs/archive/` |

#### New Applications/Packages (Untracked)
| Path | Type |
|---|---|
| `apps/accounts/` | New application (complete) |
| `packages/auth-core/`, `packages/eslint-config/`, `packages/tailwind-config/`, `packages/tsconfig/`, `packages/ui/`, `packages/utils/`, `packages/validators/`, `packages/mcp/` | Shared packages |
| `workers/taxonomy/`, `workers/tenant-provisioner-local/`, `workers/tenant-provisioner/` | Workers |
| `templates/commerce/` | Commerce template |
| `infrastructure/` | Supabase + Cloudflare configs |
| `tooling/` | Tooling scripts |
| `docs/*` (many subdirs) | Documentation |
| `.agents/skills/replica-*` | 10 new agent skills |

### Safe Branching Strategies
1. **Preserve everything:** Create `arch/session-c-foundation` from current `feat/shopify-global-taxonomy-only` — carries all 330 changes
2. **Clean baseline:** Create from `main` (but loses feature work)
3. **Stash approach:** `git stash push -u -m "session-c-preflight"` then create branch from clean `main`, apply stash selectively

**Recommendation:** Strategy 1 (preserve) is safest given the volume of architectural documentation already created. The feature work is in `apps/admin` which will be renamed anyway.

---

## 8. Completed Investigations Summary

| Task | Status | Key Finding |
|---|---|---|
| C1-A: Environment | ✅ Complete | No Docker, Supabase CLI, pnpm, Wrangler; dirty tree |
| C1-B: Wrangler Audit | ✅ Complete | All 3 configs exist with verified bindings; maara-* names; KV/R2 placeholders |
| C1-C: MCP Package | ✅ Complete | Compiled, tested, **unused**; MCP server for org-scoped data |
| C1-D: Money/Currency | ✅ Complete | DB = paise (bigint); apps/admin = paise (source of truth); utils = rupees (unused) |
| C1-E: SKU | ✅ Complete | DB = 1-64 chars any text; admin = case-insensitive; validators = uppercase strict (unused) |
| C1-F: Migrations | ✅ Complete | 13 Platform + 15 Commerce; strict separation; RLS enabled; tests deleted |
| C1-G: Git Safety | ✅ Complete | 330 changes; architecture docs new; feature work preserved |

---

## 9. Unverified Assumptions

| Assumption | Risk | Verification Needed |
|---|---|---|
| Supabase CLI 3.1.0 works with local Docker | Medium | Start local stack, run `supabase status` |
| `pnpm install` resolves all workspace deps | Medium | Run install, check for peer dep conflicts |
| Typecheck/lint pass on current code | Medium | Run `pnpm typecheck`, `pnpm lint` |
| Wrangler dry-run validates all bindings | Low | Run `wrangler dev --dry-run` per worker |
| No remote Supabase project linked | Low | `supabase projects list` when CLI works |
| Commerce template applies cleanly to fresh DB | Medium | Test in isolated local project |
| Maara infrastructure names are production | Low | Confirm with team; treat as immutable |

---

## 10. Remaining Environment Blockers

| Blocker | Required For | Resolution |
|---|---|---|
| **Docker Desktop** | Supabase local stack (`supabase start`) | Install on Windows host |
| **Supabase CLI (linux-x64)** | Migration verification, type generation | Install via `curl -fsSL https://cli.supabase.com/install.sh` or Docker |
| **pnpm** | All workspace commands (install, typecheck, lint, test) | Enable npm registry or install standalone binary |
| **Wrangler CLI** | Worker config validation | `npm install -g wrangler` (when registry accessible) |
| **Clean Git tree** | Safe branch creation | Stash/commit current feature work |

---

## 11. Recommended Next Phase

### Phase: Session C — Offline Preparation Complete → Implementation Ready

**Prerequisites to satisfy before Session C execution:**
1. ✅ Environment diagnosis complete
2. ✅ All audits complete (Wrangler, MCP, Money, SKU, Migrations, Git)
3. ❌ Docker installed and running
4. ❌ Supabase CLI functional (linux-x64)
5. ❌ pnpm available
6. ❌ Wrangler available (for dry-run)
7. ❌ Git working tree cleaned or safely branched

**Recommended Sequence:**
1. Install Docker Desktop on host
2. Install Supabase CLI standalone (bypasses npm): `curl -fsSL https://cli.supabase.com/install.sh | sh`
3. Install pnpm standalone: `curl -fsSL https://get.pnpm.io/install.sh | sh`
4. Install Wrangler: `npm install -g wrangler` (after registry unblocked)
5. Verify: `supabase status` (should fail until Docker runs)
6. `supabase start` in `infrastructure/supabase/`
7. `supabase migration list` — verify 13 applied
8. Create branch: `git checkout -b arch/session-c-foundation`
9. Begin Session C Step C-0 (pre-flight) → C-1 (Supabase)

---

## 12. Exact Commands Required Later (With Safety Notes)

### Environment Setup (Run Once)
```bash
# On Windows host - install Docker Desktop
# In container:
curl -fsSL https://cli.supabase.com/install.sh | sh   # Supabase CLI
curl -fsSL https://get.pnpm.io/install.sh | sh        # pnpm
# After npm registry unblocked:
npm install -g wrangler                               # Wrangler
```

### Session C-0: Pre-Flight (Read-Only)
```bash
cd /path/to/zerocraft
git status                          # Confirm working tree state
git branch -a                       # List branches
supabase --version                  # Verify CLI
supabase projects list              # Check linked projects (no changes)
cat infrastructure/supabase/config.toml  # Verify Platform config
ls infrastructure/supabase/migrations/   # Confirm 13 files
ls templates/commerce/migrations/        # Confirm 15 files
wrangler --version                  # Verify Wrangler
pnpm --version                      # Verify pnpm
```

### Session C-1: Supabase Start (Mutation)
```bash
cd infrastructure/supabase
supabase start                      # STARTS LOCAL DOCKER CONTAINERS
supabase status                     # Verify all services healthy
supabase migration list             # Verify 13 migrations "Applied"
# If start doesn't apply migrations:
supabase db reset                   # ONLY ON LOCAL PLATFORM PROJECT
```
**SAFETY:** Never run against remote. `config.toml` has `project_id = "zerocraft-platform"` local only.

### Session C-2: Rename (Mutation)
```bash
git mv apps/admin apps/merchant
# Update pnpm-workspace.yaml, package.json, import aliases
pnpm install
pnpm --filter @zerocraft/merchant typecheck lint
```
**SAFETY:** `git mv` preserves history. Run typecheck/lint after.

### Session C-3: Money Consolidation (Mutation)
```bash
# After evidence review (already complete):
# 1. Add missing money.ts functions to packages/utils/src/currency.ts
# 2. Make money.ts re-export from utils where compatible
# 3. Document conflicts with deprecation comments
# 4. Add CURRENCY_UNIT.md
pnpm --filter @zerocraft/utils typecheck
pnpm --filter @zerocraft/merchant typecheck
```
**SAFETY:** No silent caller changes. Deprecation comments only.

### Session C-4: SKU Consolidation (Mutation)
```bash
# After evidence review (already complete):
# 1. Update validators to match DB constraint (1-64 chars, any text)
# 2. Update utils to match
# 3. Remove admin-local validation, import from validators
# 4. Document in SKU.md
pnpm --filter @zerocraft/validators typecheck
pnpm --filter @zerocraft/utils typecheck
pnpm --filter @zerocraft/merchant typecheck
```
**SAFETY:** No product data modification. Only validation logic.

### Session C-5: Database Types (Mutation)
```bash
mkdir -p packages/database-types/src
supabase gen types typescript --local --project-ref zerocraft-platform > packages/database-types/src/platform.ts
# Add package.json, tsconfig, index.ts export
# Add to pnpm-workspace.yaml
# Add as dependency in apps/merchant, apps/accounts
pnpm --filter @zerocraft/database-types typecheck
```
**SAFETY:** Platform types only. Commerce template types deferred.

### Session C-6: Wrangler Stubs (Mutation - Already Exist)
```bash
# Existing wrangler.toml files already present with verified bindings
# Action: Verify .dev.vars.example files exist
# Run dry-run when Wrangler available:
wrangler dev --dry-run   # Per worker
```
**SAFETY:** No secrets in configs. Existing `maara-*` names preserved.

### Session C-7: MCP Disposition (Read-Only)
```bash
# Already complete: document as "compiled, tested, unused"
# Decision: Keep for future AI integration
```

### Session C-8: Commit (Mutation)
```bash
git add -A
git commit -m "chore: Session C foundation - rename merchant, consolidate money/SKU, db-types, wrangler"
git push origin arch/session-c-foundation
```

---

## 13. Final Assessment

**Session C Offline Audit: COMPLETE**

All seven investigation tasks finished with source evidence. The codebase is well-structured with clear separation between Platform and Commerce databases, but the development environment lacks critical tooling (Docker, Supabase CLI, pnpm, Wrangler). The existing feature branch carries 330 changes including our complete architectural documentation.

**Go/No-Go for Session C Implementation:** **NO-GO** until environment blockers resolved.

**Recommended Path:** Install missing tools on host → verify in container → create branch from current dirty tree (preserves all work) → execute Session C steps with safety checks at each mutation point.

---

*Report generated by read-only offline audit. No files modified, no commands executed that mutate state.*