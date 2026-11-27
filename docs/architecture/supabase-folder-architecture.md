# Supabase Folder Architecture Audit

**Repository**: zerocraft-in/zerocraft  
**Date**: 2026-11-27  
**Scope**: Audit of three Supabase-related directory structures

---

## 1. Three-Directory Inventory

### 1.1 `infrastructure/supabase/` — **Platform Local Supabase Project**

**Purpose**: Local Supabase CLI project for the **Platform control-plane database ONLY** (customer commerce data lives in separate customer-owned projects).

**Contents**:
```
infrastructure/supabase/
├── .branches/                    # Supabase branch management
├── .env                          # Local environment (references local Docker instance)
├── .env.example                  # Environment template
├── .temp/                        # Supabase temp files
├── config.toml                   # Platform Supabase project config (project_id = "zerocraft-platform")
├── migrations/                   # 13 Platform migrations (20261125-20261126)
├── seed.sql                      # Platform seed data
├── docs/                         # Architecture, schema, security, testing docs
├── scripts/                      # Bootstrap scripts
├── templates/                    # Auth email templates
├── tests/                        # Static and integration tests
└── snippets/                     # SQL snippets
```

**Key Config** (`config.toml`):
- `project_id = "zerocraft-platform"`
- Platform-only database (no commerce data)
- API disabled (hosted Supabase only)
- Auth, Realtime, Storage, Analytics enabled
- Auth templates: `./supabase/templates/confirmation.html`, `./supabase/templates/magic_link.html`

**Migrations** (13 files):
```
20261125100000_001_extensions_private_schema_identity.sql
20261125100001_002_platform_rbac.sql
20261125100002_003_organizations.sql
20261125100003_004_organization_members_invitations.sql
20261125100004_005_platform_owner_bootstrap.sql
20261125110000_006_auth_handoff_codes.sql
20261126000000_007_store_provisioning.sql
20261126010000_008_store_provisioning_integrity.sql
20261126020000_009_sales_channels.sql
20261126030000_010_sales_channels_continued.sql
20261126040000_011_sales_channels_private.sql
20261126050000_012_sales_channels_rpcs.sql
20261126060000_013_tenant_databases.sql
```

---

### 1.2 `packages/supabase/` — **Shared Supabase Client Package**

**Purpose**: TypeScript package exporting Supabase client/server/config utilities for applications.

**Contents**:
```
packages/supabase/
├── package.json                  # Exports: ./config, ./client, ./server, ./middleware, ./store-server
├── src/
│   ├── config.ts                 # Store connection registry & public config
│   ├── client.ts                 # Browser client
│   ├── server.ts                 # Server client
│   ├── middleware.ts             # Next.js middleware
│   └── store-server.ts           # Store-specific server client
├── platform/
│   ├── migrations/               # 4 Platform-specific migrations (media_manager, auth_rate_limits, security_events, lock_create_store_rpc)
│   └── schema.sql                # Platform schema
├── store-identifier-map.json     # Store ID mapping
├── store-name-map.json           # Store name mapping
└── supabase/                     # Nested Supabase project (see 1.3)
```

**Package.json**:
- No local Supabase config
- Exports client/server/config for apps to consume
- Peer deps: `@supabase/ssr`, `next`

---

### 1.3 `packages/supabase/supabase/` — **Commerce Template Supabase Project**

**Purpose**: Complete Supabase CLI project for **Commerce template database** — contains full schema, migrations, seeds for multi-tenant commerce database.

**Contents**:
```
packages/supabase/supabase/
├── config.toml                   # NOT PRESENT — not a Supabase CLI project root
├── schema.sql                    # Full commerce schema (296 KB)
├── seed.sql                      # Commerce seed data
├── admin-mvp.sql                 # Admin MVP setup
├── secure-studio-setup.sql       # Studio security setup
├── migrations/                   # 79 Commerce migrations (20261013-20261110)
├── staging/                      # Integration test SQL
├── store-catalog-products-seed.sql
├── store-catalog-taxonomy-seed.sql
├── store-seed.sql
├── studio-automation.sql
├── studio-integrations-vault.sql
├── studio-os-demo-seed.sql
├── studio-store-catalog.sql
├── verify-commerce-foundation.sql
├── phase4b-readonly-verification.sql
└── phase4e-d-database-integration-tests.sql
```

**Key Finding**: **No `config.toml`** — this is NOT a Supabase CLI project root. It's a SQL migration/seed repository used as the Commerce template source of truth.

**Migrations** (79 files, 20261013-20261110):
- Commerce foundation, storage, transactional checkout
- Studio auth, products, integrations, sessions
- CMS content, automation, notifications
- Store catalog, taxonomy, media, recycle bin
- RBAC, RLS, security events, rate limits
- AI features, discounts, search console

**Referenced By**:
- `scripts/release/check-migrations.mjs` — validates migration naming/uniqueness
- Multiple security test scripts read migration files directly
- `docs/cms/database-schema.md` — "source of truth lives in packages/supabase/supabase"
- Release documentation references specific migration files

---

## 2. Duplicate and Overlap Findings

### 2.1 Platform Migrations — DUPLICATION

| Migration | `infrastructure/supabase/migrations/` | `packages/supabase/platform/migrations/` |
|---|---|---|
| Platform RBAC | `20261125100001_002_platform_rbac.sql` | — |
| Auth rate limits | — | `20261104120000_auth_rate_limits.sql` |
| Security events | — | `20261104160000_security_events.sql` |
| Lock create store RPC | — | `20261104170000_lock_create_store_rpc.sql` |
| Media manager | — | `20261101150000_media_manager.sql` |

**Finding**: Platform migrations are **split** between two locations with different timestamp ranges:
- `infrastructure/supabase/migrations/`: 20261125-20261126 (newer, 13 files)
- `packages/supabase/platform/migrations/`: 20261101-20261104 (older, 4 files)

**Risk**: No clear single source of truth for Platform migrations.

---

### 2.2 Commerce Migrations — SINGLE SOURCE

`packages/supabase/supabase/migrations/` is the **only** location for Commerce migrations (79 files). No duplication found.

---

### 2.3 Config Files — SEPARATION

| File | `infrastructure/supabase/` | `packages/supabase/` | `packages/supabase/supabase/` |
|---|---|---|---|
| `config.toml` | ✅ Present (Platform project) | ❌ Absent | ❌ Absent |
| `.env` / `.env.example` | ✅ Present | ❌ Absent | ❌ Absent |

**Finding**: Only `infrastructure/supabase/` is a valid Supabase CLI project root.

---

### 2.4 Seed Files — OVERLAP

| Seed | `infrastructure/supabase/` | `packages/supabase/supabase/` |
|---|---|---|
| `seed.sql` | ✅ Platform seed | ✅ Commerce seed (different) |
| Additional seeds | ❌ | ✅ Multiple (store-catalog, taxonomy, studio, etc.) |

**Finding**: Different seeds for different purposes — no direct overlap.

---

## 3. References and Usage

### 3.1 Code References to Each Location

| Location | Referenced By |
|---|---|
| `infrastructure/supabase/` | `pnpm db:start` script, development setup docs, migration plan, architecture docs, session-c audit |
| `packages/supabase/` (package) | All apps import `@zerocraft/supabase` for client/server config |
| `packages/supabase/supabase/` | `scripts/release/check-migrations.mjs`, security test scripts, CMS docs, studio docs, release docs |

### 3.2 Migration Validation Script
`scripts/release/check-migrations.mjs` **only validates** `packages/supabase/supabase/migrations/` — not the Platform migrations in `infrastructure/supabase/migrations/` or `packages/supabase/platform/migrations/`.

---

## 4. Responsibility Summary

| Directory | Responsibility | Active? |
|---|---|---|
| `infrastructure/supabase/` | **Platform local development** — Supabase CLI project for Platform control-plane DB | ✅ Active (referenced by dev scripts, docs) |
| `packages/supabase/` | **Shared client package** — TypeScript utilities for apps | ✅ Active (imported by all apps) |
| `packages/supabase/supabase/` | **Commerce template source of truth** — Full Commerce schema, migrations, seeds | ✅ Active (referenced by release/security scripts) |

---

## 5. Recommended Final Structure

### 5.1 Keep As-Is (Active & Necessary)

1. **`infrastructure/supabase/`** — Platform local Supabase project
   - Rename to `infrastructure/supabase-platform/` for clarity (optional)
   - Contains `config.toml`, local env, 13 Platform migrations

2. **`packages/supabase/`** — Shared client package (no changes needed)

3. **`packages/supabase/supabase/`** — Commerce template SQL repository
   - Rename to `packages/supabase/commerce-template/` or `packages/supabase/commerce-sql/` for clarity
   - Contains 79 Commerce migrations, full schema, seeds

### 5.2 Consolidate Platform Migrations

**Move** 4 migrations from `packages/supabase/platform/migrations/` → `infrastructure/supabase/migrations/`:

| File | From | To |
|---|---|---|
| `20261101150000_media_manager.sql` | `packages/supabase/platform/migrations/` | `infrastructure/supabase/migrations/` |
| `20261104120000_auth_rate_limits.sql` | `packages/supabase/platform/migrations/` | `infrastructure/supabase/migrations/` |
| `20261104160000_security_events.sql` | `packages/supabase/platform/migrations/` | `infrastructure/supabase/migrations/` |
| `20261104170000_lock_create_store_rpc.sql` | `packages/supabase/platform/migrations/` | `infrastructure/supabase/migrations/` |

**Then remove** empty `packages/supabase/platform/migrations/` directory.

**Rationale**: Single source of truth for Platform migrations in the Platform Supabase project.

### 5.3 Rename for Clarity

| Current | Recommended | Reason |
|---|---|---|
| `infrastructure/supabase/` | `infrastructure/supabase-platform/` | Clear Platform ownership |
| `packages/supabase/supabase/` | `packages/supabase/commerce-sql/` | Clear Commerce template purpose |

---

## 6. File-by-File Move/Delete Recommendations

### Move (4 files)
```
packages/supabase/platform/migrations/20261101150000_media_manager.sql
  → infrastructure/supabase/migrations/20261101150000_media_manager.sql

packages/supabase/platform/migrations/20261104120000_auth_rate_limits.sql
  → infrastructure/supabase/migrations/20261104120000_auth_rate_limits.sql

packages/supabase/platform/migrations/20261104160000_security_events.sql
  → infrastructure/supabase/migrations/20261104160000_security_events.sql

packages/supabase/platform/migrations/20261104170000_lock_create_store_rpc.sql
  → infrastructure/supabase/migrations/20261104170000_lock_create_store_rpc.sql
```

### Delete (1 directory)
```
packages/supabase/platform/migrations/  (after move)
```

### Rename (2 directories)
```
infrastructure/supabase/  →  infrastructure/supabase-platform/
packages/supabase/supabase/  →  packages/supabase/commerce-sql/
```

### Preserve (All migration history)
- All 13 Platform migrations in `infrastructure/supabase/migrations/`
- All 79 Commerce migrations in `packages/supabase/commerce-sql/migrations/`
- All seed files in both locations

---

## 7. Migration History Risks

### Risk 1: Timestamp Ordering
- Platform migrations in `infrastructure/supabase/` start at `20261125`
- Platform migrations in `packages/supabase/platform/` are older (`20261101-20261104`)
- **Action**: After move, verify `supabase migration list` shows correct chronological order

### Risk 2: Migration Validation Script
- `scripts/release/check-migrations.mjs` only checks `packages/supabase/supabase/migrations/`
- **Action**: Add separate validation for Platform migrations, or document that Platform migrations are validated separately

### Risk 3: CI/CD References
- Check `.github/workflows/` for any hardcoded paths to `packages/supabase/platform/migrations/`
- **Found**: No direct references in workflows; only in security test scripts

### Risk 4: Supabase CLI Project Integrity
- `infrastructure/supabase/config.toml` expects migrations in `./migrations/`
- After move, all Platform migrations will be in the correct location for `supabase db diff`, `supabase migration list`, etc.

### Risk 5: Documentation References
- Multiple docs reference both locations — update after consolidation:
  - `docs/architecture/database-ownership.md`
  - `docs/architecture/migration-plan.md`
  - `docs/getting-started/development-setup.md`
  - `docs/infrastructure/database-architecture.md`

---

## 8. Conclusion

### Current State
- **3 distinct locations** with clear but overlapping responsibilities
- **Platform migrations split** across 2 directories (13 + 4 files)
- **Commerce migrations unified** in 1 directory (79 files)
- **Only 1 valid Supabase CLI project** (`infrastructure/supabase/`)

### Recommended Actions
1. **Consolidate Platform migrations** into `infrastructure/supabase/migrations/` (move 4 files)
2. **Remove empty** `packages/supabase/platform/migrations/`
3. **Rename directories** for clarity (optional but recommended)
4. **Update documentation** references
5. **Add Platform migration validation** to release scripts

### Files to Modify in Implementation
1. 4 migration files (move)
2. 1 directory (delete)
3. 2 directories (rename — optional)
4. Multiple documentation files (update references)
5. `scripts/release/check-migrations.mjs` (add Platform validation)

### Preservation Requirements
- ✅ All migration history preserved (no files deleted, only moved)
- ✅ All seed files preserved
- ✅ All schema files preserved
- ✅ No Supabase CLI commands run — audit only

---

**Audit Status**: Complete  
**Report Location**: `docs/architecture/supabase-folder-architecture.md`  
**Next Phase**: Implementation of consolidation (not started)