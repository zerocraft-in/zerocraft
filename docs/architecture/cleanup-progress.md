# ZERОCRAFT — COMPLETE PROJECT CLEANUP, RESTRUCTURING & PROFESSIONAL STANDARDIZATION

You are the Principal Software Architect, Senior Monorepo Engineer, DevOps Engineer, Security Reviewer, Documentation Architect, and Design Systems Engineer for Zerocraft.

Your responsibility is to audit, clean, restructure, standardize, and professionally organize the ENTIRE Zerocraft repository.

This is a comprehensive repository improvement project, not merely a documentation update.

The objective is to make Zerocraft a clean, maintainable, secure, well-documented, professionally branded, production-ready multi-tenant commerce SaaS codebase.

You must work directly in the GitHub-connected Claude Code Cloud Session.

Repository:
`zerocraft-in/zerocraft`

---

# 1. NON-NEGOTIABLE ARCHITECTURE

Preserve these approved decisions.

## Product architecture

Zerocraft is a Shopify-style multi-tenant, multi-store commerce SaaS platform.

It is NOT a single-store retail application.

## Domain architecture

- `zerocraft.in` — Public brand website
- `zerocraft.in/studio` — Brand CMS
- `accounts.zerocraft.in` — Central authentication
- `app.zerocraft.in` — Merchant dashboard
- `admin.zerocraft.in` — Internal platform administration
- `help.zerocraft.in` — Documentation/help
- `support.zerocraft.in` — Customer support
- Merchant custom domains — Hosted storefronts

Verify the actual implementation before changing domain assumptions.

## Application boundaries

Audit the existing applications before moving or renaming anything.

Expected responsibilities:

- `apps/accounts` — Central authentication
- `apps/admin` — Merchant dashboard
- `apps/platform` — Internal platform administration, if this is the actual existing application
- Public brand website and CMS — verify existing implementation before creating anything.

Do not duplicate applications or create new apps unnecessarily.

## Database architecture

- Separate hosted Supabase Platform and Commerce projects.
- Platform project: `zerocraft`
- Commerce project: `zerocraft-commerce`
- Shared-first Commerce PostgreSQL database.
- Strict `store_id` tenant isolation.
- PostgreSQL RLS and trusted server-side authorization.
- Dedicated Commerce databases only as a future enterprise scaling option.
- Money stored as integer paise using BIGINT.
- No cross-project foreign keys.

## Hosting mandate

STRICTLY PROHIBITED:

- Docker Desktop
- Docker Compose
- Local Supabase stack
- Local PostgreSQL
- Local database development
- Docker-dependent development workflows

All database development, migrations, verification, integration tests, and security tests must target approved hosted Supabase environments safely.

Development projects already exist. Staging and Production projects must not be created without explicit approval.

Preserve the Development → Staging → Production promotion model.

---

# 2. PHASE A — COMPLETE REPOSITORY AUDIT

Before changing anything, inspect the entire repository.

Audit:

- Root directory
- All applications
- All packages
- Shared components
- Database migrations
- Configuration files
- Scripts
- CI/CD workflows
- Tests
- Assets
- Branding
- Documentation
- Environment examples
- Build output and generated artifacts
- Dependencies and package manager configuration
- Legacy Maara identifiers and compatibility references

Inspect:

- `package.json`
- `pnpm-workspace.yaml`
- Lockfile
- TypeScript configurations
- Next.js configurations
- Tailwind and design-system configurations
- Supabase configuration
- Cloudflare configuration
- GitHub Actions workflows
- `.gitignore`
- `.env.example` and equivalent environment templates

Produce a complete inventory.

Identify:

1. Active files.
2. Unused files with evidence.
3. Duplicate files.
4. Obsolete configurations.
5. Unused dependencies.
6. Dead scripts.
7. Redundant documentation.
8. Generated artifacts.
9. Security risks.
10. Architectural inconsistencies.

Do not assume that an old-looking file is unused.

Search all imports, references, scripts, workflows, package dependencies, runtime entry points, and deployment references before proposing removal.

---

# 3. PHASE B — PROFESSIONAL MONOREPO STRUCTURE

## C1 — Dependency & Artifact Audit Findings

### Lockfile inconsistency
- Both `package-lock.json` (197KB) and `pnpm-lock.yaml` (364KB) exist in root, despite `package.json` specifying `packageManager: "pnpm@10.18.3"` and `pnpm-workspace.yaml` being present. pnpm typically uses only `pnpm-lock.yaml`.

### pnpm version mismatch
- Root `package.json`: `pnpm@10.18.3`; `apps/admin/package.json`: `pnpm@12.21.0` — version mismatch may cause lockfile incompatibility.

### Duplicate dependencies across apps
- `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react`, `tailwind-merge` appear in both `apps/admin` and `apps/packages/ui`.

### Uniquely heavy deps
- `admin`: `@tiptap/*` rich text editor, `embla-carousel-react`, `nodemailer`, `recharts`, `sonner`, `vaul`, `next-themes`, `cmdk`
- `accounts`: `gsap`, `react-day-picker`, `tw-animate-css`

### artifacts/
- `artifacts/phase-b` present; verify if tracked in git.

### node_modules/
- Present in root and most packages/apps. Check `.gitignore` for tracking status.

### mcp package
- `packages/mcp` has `dist/` (built output) alongside `src/` — compiled package in workspace.

Design a clean, understandable monorepo structure based on the actual repository.

A possible target structure is:

```text
zerocraft/
├── apps/
│   ├── accounts/
│   ├── admin/
│   ├── platform/
│   ├── website/
│   └── storefront/
│
├── packages/
│   ├── ui/
│   ├── design-system/
│   ├── auth/
│   ├── database/
│   ├── config/
│   ├── types/
│   ├── utils/
│   └── shared/
│
├── supabase/
│   ├── platform/
│   └── commerce/
│
├── infrastructure/
│   ├── cloudflare/
│   └── deployment/
│
├── scripts/
│
├── docs/
│   ├── getting-started/
│   ├── architecture/
│   ├── applications/
│   ├── database/
│   ├── security/
│   ├── authentication/
│   ├── design-system/
│   ├── deployment/
│   ├── operations/
│   └── decisions/
│
├── .github/
│   └── workflows/
│
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.json
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── .gitignore
```

IMPORTANT:

This is a proposed organizational reference, not permission to blindly move files.

First map the actual repository.

Only restructure when it improves maintainability and does not break imports, workspace references, deployment, migrations, or existing application boundaries.

Preserve working applications and existing identifiers unless a verified migration plan exists.

---

# 4. PHASE C — REMOVE UNUSED AND UNNECESSARY ITEMS

## C1 — Dependency & Artifact Audit Findings (existing)

### Lockfile inconsistency
- Both `package-lock.json` (197KB) and `pnpm-lock.yaml` (364KB) exist in root, despite `package.json` specifying `packageManager: "pnpm@10.18.3"` and `pnpm-workspace.yaml` being present. pnpm typically uses only `pnpm-lock.yaml`.

### pnpm version mismatch
- Root `package.json`: `pnpm@10.18.3`; `apps/admin/package.json`: `pnpm@12.21.0` — version mismatch may cause lockfile incompatibility.

### Duplicate dependencies across apps
- `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react`, `tailwind-merge` appear in both `apps/admin` and `apps/packages/ui`.

### Uniquely heavy deps
- `admin`: `@tiptap/*` rich text editor, `embla-carousel-react`, `nodemailer`, `recharts`, `sonner`, `vaul`, `next-themes`, `cmdk`
- `accounts`: `gsap`, `react-day-picker`, `tw-animate-css`

### artifacts/
- `artifacts/phase-b` present; verify if tracked in git.

### node_modules/
- Present in root and most packages/apps. Check `.gitignore` for tracking status.

### mcp package
- `packages/mcp` has `dist/` (built output) alongside `src/` — compiled package in workspace.

## C2 — Unused Files Audit (new)

Performed a comprehensive audit of unused source files, React components, shared package exports, unreferenced images/fonts/icons/assets, unused scripts/config files, and duplicate/obsolete documentation across all 5 apps (accounts, admin, cms, store, studio) and shared packages (ui, utils, validators) in the zerocraft monorepo.

### Summary
- **717** source files (`.ts`, `.tsx`) examined across all apps excluding `node_modules`, `.next`, `e2e`, `test-stubs`
- **72** UI components defined in `@zerocraft/ui` package
- **226** imports from `@zerocraft/components` across apps
- Shared packages (utils, validators, auth-core) actively used

### `@zerocraft/ui` Package Component Usage
- **Well-used** (>20 imports): button (54), card (41), input (27), toast (23), badge (20)
- **Moderate usage** (10-20): separator (17), label (16), dialog (10)
- **Low usage** (5-9): checkbox (11), dropdown (13), sidebar (9), select (9)
- **Rarely used** (2-4): table (5), textarea (4), empty (4), skeleton (2), progress (2), cn (2)
- **Potentially unused**: `ui/popover` (1 direct import, also used via `@zerocraft/components/ui/popover`), `ui/pagination` (1 direct import)

### Shared Package Health
- **utils**: formatInr, buildSku, parseSku, validateSku, currency constants — actively used
- **validators**: schemas and index — actively used
- **auth-core**: crypto, email, rate-limit, redirects — actively used

### Unused/Obsolete Items Found
- `apps/studio/public/noise.svg` — zero imports across all apps (confirmed unused)
- `apps/studio/public/icon.svg` — minimal usage; may be legacy
- Brand kit SVG in `brand-kit/zerocraft-mark.svg` — limited usage
- Various boilerplate `.env.example` and `.gitignore` files (not flagged as "unused" per audit guidelines)

### Confidence Level
- **Confirmed unused**: Items with zero imports across all apps
- **Uncertain**: Components with 1-2 imports may be dynamically imported or used in edge cases; dynamic imports not assumed per audit guidelines

### Recommended Actions
1. Review `ui/popover` and `ui/pagination` components — verify if truly unused or imported via alternative paths
2. Consider removing `apps/studio/public/noise.svg` if confirmed unused through human review
3. Document component usage patterns for future reference
4. Monitor `@zerocraft/ui` component adoption across new features

**Note:** No files modified or deleted per audit requirements. Git changes preserved. Final report under 30 lines.

---

## C2 — Toast Usage Audit Findings (new)

Performed a comprehensive audit of `toast.*` usage across all applications to identify consolidation opportunities.

### Admin (`apps/admin`)
- **Status**: Extensive usage.
- **Findings**: 97 matches across 80+ files. Deeply integrated into products, customers, settings, and gift card flows. Uses `@zerocraft/ui/components/toast`.

### CMS (`apps/cms`)
- **Status**: Import only.
- **Findings**: `Toaster` component is imported in `provider.tsx`, but no actual `toast.*` calls exist in the functional codebase. `lib/toast.ts` defines a wrapper that is currently unused.

### Accounts (`apps/accounts`)
- **Status**: Active usage.
- **Findings**: `useToast()` is imported and `.toast()` is invoked in `otp-form.tsx` and `resend-form.tsx` (success/warning variants). Uses a local custom implementation in `src/components/ui/toast.tsx`.

### Studio (`apps/studio`)
- **Status**: Active usage.
- **Findings**: 3 auth pages use `toast.add()` via `studioToast` wrapper: `reset-password` (1 call) and `sign-in` (2 calls). Uses `@zerocraft/ui/components/toast`.

### Packages (`packages/*`)
- **Status**: Unused.
- **Findings**: Zero `toast.*` calls found across all shared packages.

### Consolidation Candidates
1. **CMS**: `lib/toast.ts` can be removed if the app continues to not require notifications, or standardized to use the shared UI component.
2. **Accounts**: Uses a completely different custom toast implementation. Candidate for standardization to `@zerocraft/ui` to match Admin and Studio.

Perform a strict but evidence-based cleanup.

Find and remove only verified:

- Unused source files
- Duplicate components
- Dead code
- Unused dependencies
- Unreferenced assets
- Obsolete temporary files
- Redundant configuration
- Abandoned scripts
- Duplicate documentation
- Superseded generated artifacts

Before removing dependencies:

- Search all workspace imports.
- Inspect package manifests.
- Inspect scripts and build configurations.
- Check dynamic imports and plugin references.
- Verify whether the dependency is used indirectly.

Before deleting a file, record its path and why it is safe to remove.

Do NOT delete:

- Existing database migration history.
- Applied migration files.
- Unverified Commerce template migrations.
- Lockfiles.
- Required environment templates.
- Security policies.
- License files.
- Required CI/CD workflows.
- Assets referenced dynamically.
- Historical architecture decisions that explain important changes.
- Files whose usage cannot be established.

For uncertain items, document them as candidates for human review.

Do not remove the existing Maara-related infrastructure identifiers merely because they differ from Zerocraft branding.

---

# 5. PHASE D — CACHE AND BUILD CLEANUP

Inspect repository-local generated files and caches.

## Audit Findings (2026-11-27)

### `.next/` directories — Cleanup Status

- **Root `.next/`**: Removed (files backed up to `/tmp/` first; contained JSON trace data from failed Next.js build v16.4.6)
- **`apps/accounts/.next/`**: Removed (was empty — only had `dev/` subdirectory with trace data)
- **`apps/admin/.next/`**: **NOT removed** — contains full Next.js production build output (1.2GB) with protected files that cannot be removed due to permission restrictions. Contains: `next-server.js.nft.json` (115KB), `next-minimal-server.js.nft.json` (17KB), build manifests, cache, server output, and `trace` (24KB JSON). This is a complete admin build output from a previous `pnpm build`.
- **`apps/cms/.next/`**: Not present (was likely never built or was already cleaned)
- **`apps/store/.next/`**: Not present
- **`apps/studio/.next/`**: Not present

### `.turbo/`
- **Path**: Not present in repository
- **Recommendation**: N/A

### `dist/`
- **Path**: Not present in repository
- **Recommendation**: N/A

### `build/`
- **Path**: Not present in repository
- **Recommendation**: N/A

### `coverage/`
- **Path**: Present in `.gitignore` reference only
- **Recommendation**: Safe to remove if present

### `artifacts/phase-b/`
- **Path**: `artifacts/phase-b/production-product-domain-backup.json` (36KB)
- **Git-tracked**: No — not in git (verified via `git ls-files`)
- **Generated**: Yes — phase-b backup artifact
- **Safely reproducible**: No — contains domain-specific backup data
- **Recommendation**: Keep for now; not git-tracked, phase-b audit artifact

### Tool-specific temporary caches
- **`.pnpm-store/`**: In `.gitignore`, not tracked
- **`.next/trace/` and `.next/trace-build/**: Build traces from failed build (v16.4.6, webpack)
- **`package-lock.json`** (197KB) and **`pnpm-lock.yaml`** (364KB): Both present in root despite `package.json` specifying `packageManager: "pnpm@10.18.3"` and `pnpm-workspace.yaml` existing. pnpm typically uses only `pnpm-lock.yaml`.
- **pnpm version mismatch**: Root `package.json`: `pnpm@10.18.3`; `apps/admin/package.json`: `pnpm@12.21.0` — version mismatch may cause lockfile incompatibility
- **Duplicate dependencies**: `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react`, `tailwind-merge` appear in both `apps/admin` and `apps/packages/ui`
- **Uniquely heavy deps**: `admin`: `@tiptap/*`, `embla-carousel-react`, `nodemailer`, `recharts`, `sonner`, `vaul`, `next-themes`, `cmdk`; `accounts`: `gsap`, `react-day-picker`, `tw-animate-css`
- **`packages/mcp`**: Has `dist/` (built output) alongside `src/` — compiled package in workspace

### `.gitignore`
- Already correctly includes: `.next/`, `dist/`, `build/`, `.turbo/`, `node_modules/`, `coverage/`, `.pnpm-store/`
- Also excludes `artifacts/phase-b/` (per `.gitignore` entry)
- No updates needed

## Summary
- Root `.next/` and `apps/accounts/.next/` successfully removed
- `apps/admin/.next/` still present — full 1.2GB Next.js production build output with permission-protected files; cannot be safely removed without risking data loss. This is an actual build artifact, not just cache.
- `artifacts/phase-b/production-product-domain-backup.json` — keep, not git-tracked
- Lockfile inconsistency (both `package-lock.json` and `pnpm-lock.yaml`) and pnpm version mismatch noted for Phase E
- No `dist/`, `build/`, or `.turbo/` directories present
- `.gitignore` already correctly configured for cache cleanup

Phase D2 partial: successfully removed root and accounts .next directories. Admin .next remains due to protected build output files. Documentation updated.

---
## E — Dependency and Configuration Standardization Implementation Plan

### 1. Canonical pnpm Version
- **Decision**: Align all tooling to pnpm **@12.21.0** (matching root `packageManager` field).
- **Evidence**: Root `package.json` declares `packageManager: "pnpm@12.21.0+sha512..."`. CI workflows currently use `pnpm@10.18.3` via `pnpm/action-setup@v4`. The root version is the authoritative source since it's the packageManager declaration.
- **Dependencies between changes**: 
  - Lockfile standardization (step 2) must use pnpm 12.21.0
  - Duplicate dependency removal (step 3) requires pnpm 12.21.0 resolution
  - Script review (step 5) references pnpm commands
- **Risk**: Low — pnpm 12.21.0 is the declared version; downgrading to 10.18.3 in CI could cause lockfile incompatibility since `pnpm-lock.yaml` was generated with v12.21.0 features.
- **Validation**: `pnpm --version` should return 12.21.0 locally; CI runs should use `pnpm action-setup@v4` with version 12.21.0 or pin the runner to match.
- **Rollback**: Revert CI `pnpm/action-setup@v4` version to `10.18.3` and regenerate lockfile with `pnpm install --lockfile-format=5` if lockfile corruption occurs.

### 2. Safe removal of package-lock.json
- **Action**: Remove `package-lock.json` from root and add to `.gitignore` (if not already present — verify).
- **Evidence**: `package-lock.json` (197KB, lockfileVersion 3) exists alongside `pnpm-lock.yaml` (364KB). pnpm typically uses only `pnpm-lock.yaml`. The `packageManager` field in root `package.json` specifies pnpm, making `package-lock.json` redundant and potentially confusing.
- **Dependencies between changes**: Must complete step 1 first (canonical pnpm version). Lockfile removal should happen after confirming `pnpm-lock.yaml` is the active lockfile and CI uses `pnpm install --frozen-lockfile` with the correct version.
- **Risk**: Low — `package-lock.json` is not referenced in CI (`pnpm install --frozen-lockfile` reads `pnpm-lock.yaml`). If any tooling or external scripts reference it, removal would break them. Need to verify no external references exist.
- **Validation**: 
  - Run `pnpm install --frozen-lockfile` to confirm resolution works with only `pnpm-lock.yaml`
  - Verify `git status` shows `package-lock.json` as untracked or ignored after removal
  - Confirm all apps still typecheck and build
- **Rollback**: Restore `package-lock.json` from git if removal breaks any tooling: `git checkout -- package-lock.json`

### 3. Duplicate dependency classification and consolidation
| Package | Status | Action |
|---|---|---|
| `@base-ui/react` | Duplicated: admin, accounts, packages/ui | Move to `packages/ui` as shared dep; update app imports to `@zerocraft/ui`; remove from admin/accounts `package.json` |
| `class-variance-authority` | Duplicated: admin, accounts, packages/ui | Same as above — move to `packages/ui` |
| `clsx` | Duplicated: admin, accounts, packages/ui | Same as above |
| `framer-motion` | Duplicated: admin, accounts, packages/ui | Same as above |
| `lucide-react` | Duplicated: admin, accounts, packages/ui | Same as above |
| `tailwind-merge` | In admin + packages/ui only | Verify if admin-specific; if not, move to `packages/ui`; if admin-only, keep in admin |
| `@tiptap/*` (admin only) | App-specific | Keep in `apps/admin` — rich text editor specific to admin |
| `embla-carousel-react` (admin only) | App-specific | Keep in `apps/admin` — carousel specific to admin |
| `nodemailer` (admin only) | App-specific | Keep in `apps/admin` — email sending specific to admin |
| `recharts` (admin only) | App-specific | Keep in `apps/admin` — charts specific to admin |
| `sonner`, `vaul`, `next-themes`, `cmdk` (admin only) | App-specific | Keep in `apps/admin` — admin-specific UX dependencies |

- **Evidence**: Audit found `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react` in all three: `apps/admin`, `apps/accounts`, `packages/ui`. `tailwind-merge` in admin + `packages/ui` — needs classification.
- **Dependencies between changes**: 
  - Step 1 (pnpm version) must complete first — duplicate deps will be resolved with correct lockfile
  - Step 2 (package-lock.json removal) should happen in parallel or after — duplicate dep consolidation doesn't depend on lockfile removal
  - `packages/mcp/dist/` handling (step 4) is independent
- **Risk**: Medium — moving dependencies between workspaces requires updating all import paths. If any app imports `@base-ui/react` directly and it's removed from that app's `package.json`, the build will fail until the import is redirected to `@zerocraft/ui`. Must update all imports concurrently.
- **Validation**: 
  - After moving deps to `packages/ui`, run `pnpm --filter @zerocraft/admin typecheck` and `pnpm --filter @zerocraft/accounts typecheck`
  - Verify `pnpm --filter @zerocraft/admin build` and `pnpm --filter @zerocraft/accounts build` succeed
  - Check that no runtime errors occur from missing packages
- **Rollback**: 
  - Re-add removed dependencies to app `package.json` files
  - Restore original import paths
  - Re-run `pnpm install` to rebuild workspace dependency graph

### 4. Safe handling of packages/mcp/dist
- **Action**: No changes. `packages/mcp/dist/` contains compiled output alongside `src/`.
- **Evidence**: `packages/mcp/package.json`: `"main": "./dist/index.js"`, `"exports": { ".": "./dist/index.js" }`. This is a published MCP package pattern — the `dist/` is the built output, not a temporary cache. Per Phase D audit, no action needed.
- **Dependencies between changes**: Independent — no other step depends on `packages/mcp/dist` status.
- **Risk**: Low — leaving as-is is the safest approach. Removing `dist/` would break any consumer that resolves `@zerocraft/mcp` via the `exports` field.
- **Validation**: Verify `pnpm --filter @zerocraft/mcp` resolves correctly.
- **Rollback**: N/A — no change recommended.

### 5. Scripts and environment variable security
- **Action**: 
  - Update `.github/workflows/ci.yml` to use pnpm `@12.21.0` in all `pnpm/action-setup@v4` steps
  - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` remain as placeholders only — never commit real values
  - Review all `NEXT_PUBLIC_` environment variables for secret exposure risk
  - The root `clean` script `pnpm -r exec rimraf .next dist .turbo` is safe (`.turbo` not present)
- **Evidence**: CI workflow exposes `NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ci-placeholder` as build-time env — these are placeholders. Per architecture mandate, all `db:*` scripts target hosted Supabase only; no local stack commands.
- **Dependencies between changes**: 
  - Step 1 (pnpm version) must complete first — CI version update depends on canonical version decision
  - Steps 2–4 are independent of CI script updates
- **Risk**: Low — updating CI action version is mechanical; placeholder values are already safe. The real risk is if someone replaces placeholders with actual secrets.
- **Validation**: 
  - CI workflows run successfully with pnpm@12.21.0
  - No `NEXT_PUBLIC_` variables expose real credentials
  - `pnpm install --frozen-lockfile` succeeds in CI simulation
- **Rollback**: Revert CI `pnpm/action-setup@v4` version to `10.18.3`; restore placeholder values if accidentally changed.

### 6. Required lockfile changes and validation commands
| Change | Command | Validation |
|---|---|---|
| Align pnpm version | `pnpm --version` → should be 12.21.0; CI: update `pnpm/action-setup@v4` to version 12.21.0 | `pnpm --version` output; CI pipeline test run |
| Remove package-lock.json | `rm package-lock.json`; add to `.gitignore` if not present | `git status` shows package-lock.json removed/ignored; `pnpm install --frozen-lockfile` succeeds |
| Move deps to packages/ui | `pnpm remove @base-ui/react --filter @zerocraft/admin --filter @zerocraft/accounts`; add to `packages/ui/package.json` deps; update imports | `pnpm --filter @zerocraft/admin typecheck`; `pnpm --filter @zerocraft/accounts typecheck`; `pnpm --filter @zerocraft/admin build`; `pnpm --filter @zerocraft/accounts build` |
| CI pnpm version update | Update `.github/workflows/ci.yml`: change `version: 10.18.3` to `version: 12.21.0` in all 4 jobs | CI pipeline runs successfully; `pnpm install --frozen-lockfile` step passes |

---
Plan complete. No files modified, no packages installed, no deletions or moves performed. All findings preserved for execution phase.

### Root `package.json`
- `packageManager`: `pnpm@12.21.0+sha512.66fd8278ee28935ce951792d34367ff3af5c432a2756445823029533835b8da529bbe0be5130afd56ed0713fb8789e47bad82d93bd5ae2fe54b15562d6276ef0`
- `engines`: node `>=22`, pnpm `>=10.18.3`

### `pnpm-workspace.yaml`
- Workspaces: `apps/*`, `packages/*`, `workers/*`, `templates/commerce`
- `ignoredBuiltDependencies`: `sharp`, `unrs-resolver`

### `apps/admin/package.json`
- `packageManager`: `pnpm@12.21.0+sha512...` (version mismatch with root)
- `engines.node`: not specified

### `apps/accounts/package.json`
- No `packageManager` field
- No `engines` field

### `.github/workflows/ci.yml`
- CI uses pnpm version `10.18.3` via `pnpm/action-setup@v4`
- `pnpm install --frozen-lockfile` in every job
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` exposed in build job env — **do not commit real values**

---

## E2 — Lockfile and Dependency Audit

### Lockfile presence
- `package-lock.json` (197KB, lockfileVersion 3): present in root; workspaces list includes `apps/cms`, `apps/store`, `apps/studio`, `packages/*`
- `pnpm-lock.yaml` (364KB): present in root
- **Finding**: Both lockfiles exist despite `package.json` specifying `packageManager: "pnpm@12.21.0"`. pnpm typically uses only `pnpm-lock.yaml`. The `pnpm-lock.yaml` is the canonical lockfile.

### pnpm version mismatch
- Root `package.json`: `pnpm@12.21.0`
- `apps/admin/package.json`: `pnpm@12.21.0` (matches root)
- CI workflows: `pnpm@10.18.3` (older version)
- **Risk**: Version mismatch between CI (10.18.3) and root/packageManager (12.21.0) may cause lockfile incompatibility or different dependency resolution

### Duplicate dependencies across apps
| Package | apps/admin | apps/accounts | packages/ui |
|---|---|---|---|
| `@base-ui/react` | ^1.9.0 | ^1.9.0 | ^1.9.0 |
| `class-variance-authority` | 0.7.1 | 0.7.1 | 0.7.1 |
| `clsx` | 2.1.1 | 2.1.1 | 2.1.1 |
| `framer-motion` | ^14.14.0 | ^14.14.0 | ^14.14.0 |
| `lucide-react` | 1.72.0 | 1.72.0 | 1.72.0 |
| `tailwind-merge` | 3.7.0 | — | 3.7.0 |

**Analysis**: `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react` are duplicated across `apps/admin`, `apps/accounts`, and `packages/ui`. These should ideally be hoisted to `packages/ui` and imported from there, since `packages/ui` already declares them and apps import from `@zerocraft/components`.

`tailwind-merge` appears only in `apps/admin` and `packages/ui` — may be admin-specific or an oversight.

### `packages/mcp/dist/`
- `packages/mcp/package.json`: `"main": "./dist/index.js"`, `"exports": { ".": "./dist/index.js" }`
- Contains compiled output (`dist/`) alongside `src/`
- **Finding**: Built package in workspace — not source-only. This is expected for a published MCP package; no recommendation to remove.

### Well-used `@zerocraft/ui` components
- button (54 imports), card (41), input (27), toast (23), badge (20)
- Moderate: separator (17), label (16), dialog (10)
- Low: checkbox (11), dropdown (13), sidebar (9), select (9)
- Rare: table (5), textarea (4), empty (4), skeleton (2), progress (2), cn (2)
- Potentially unused: `ui/popover` (1 direct import), `ui/pagination` (1 direct import)

### Shared package health
- **utils**: formatInr, buildSku, parseSku, validateSku, currency constants — actively used
- **validators**: schemas and index — actively used
- **auth-core**: crypto, email, rate-limit, redirects — actively used

---

## E3 — Scripts and Environment Configuration

### Root scripts
- `clean`: `pnpm -r exec rimraf .next dist .turbo` — aggressive clean; verify `.turbo` not present
- `db:*`: All target hosted Supabase only (no local stack) — per architecture mandate
- `db:migration-check`: runs validation scripts
- `db:verify-schema`: guidance only (not a run command)

### Environment exposure in CI
- `.github/workflows/ci.yml` build job exposes:
  - `NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co` (placeholder)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ci-placeholder` (placeholder)
  - `NEXT_PUBLIC_SITE_URL: http://localhost:3000` (placeholder)
- **Risk**: Placeholders are safe, but real credentials must never be committed. All `NEXT_PUBLIC_` variables must be reviewed for secret exposure.

### Root `package.json` engines
- Node `>=22`, pnpm `>=10.18.3`
- CI uses pnpm `10.18.3` — mismatch with root `12.21.0`

---

## E4 — TypeScript Aliases and Cross-App Imports (architecture findings only)

No changes recommended. Aliases and imports observed:
- `@zerocraft/ui` — shared UI primitives used by all apps
- `@zerocraft/components` — referenced in 226 imports across apps
- `@zerocraft/auth-core` — used by accounts
- `@zerocraft/utils`, `@zerocraft/validators` — shared utils
- Path aliases configured in `packages/tsconfig/` and consumed by apps

---

## E5 — Summary of Recommendations (Phase E)

1. **Lockfile**: Standardize on `pnpm-lock.yaml` as canonical; remove `package-lock.json` from root (or add to `.gitignore` if retained for backwards compat). CI already uses `pnpm install --frozen-lockfile` which works with `pnpm-lock.yaml`.

2. **pnpm version alignment**: Align CI workflows to `pnpm@12.21.0` (matching root `packageManager`), or update root `packageManager` to `pnpm@10.18.3`. Do not mix versions.

3. **Duplicate dependencies**: Move `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react` from `apps/admin` and `apps/accounts` to `packages/ui` as shared deps; update app imports to use `@zerocraft/ui` packages. `tailwind-merge` in admin only — verify if admin-specific.

4. **`packages/mcp/dist/`**: Retain — this is a compiled workspace package, not temporary build output.

5. **CI environment**: The `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` placeholders are safe. Ensure no real secrets are ever committed under these names.

6. **TypeScript aliases**: No changes. Existing aliases (`@zerocraft/*`, `@zerocraft/ui`, etc.) are properly configured and used.

7. **Scripts**: The `clean` script (`pnpm -r exec rimraf .next dist .turbo`) is safe; `.turbo` is not present so the rimraf will be a no-op for that path.

8. **Do not**: Delete lockfiles, modify hosted Supabase, change secrets, run migrations, or remove `packages/mcp/dist`.

---

## E1 — pnpm Version Alignment Complete

### Change Summary
- **File**: `.github/workflows/ci.yml`
- **Action**: Updated `pnpm/action-setup@v4` `version` field from `10.18.3` to `12.21.0` in all 5 CI jobs
- **Jobs affected**: 5 jobs (setup-pnpm steps in typecheck, lint, test, build, migration-consistency production-approval-gate)
- **Evidence**: All 5 occurrences changed from `version: 10.18.3` to `version: 12.21.0`
- **Verification**: `grep "version:" .github/workflows/ci.yml` shows `12.21.0` in all 5 jobs; no remaining `10.18.3` references in `.github/workflows/`

### Dependencies and Risks
- **Must complete before**: Phase E2 (package-lock.json removal) and Phase E3 (duplicate dependency consolidation)
- **Risk**: Low — mechanical CI action version update; pnpm 12.21.0 is the root packageManager declaration; if issues arise, revert to 10.18.3
- **Validation**: CI pipelines should run successfully with pnpm@12.21.0; `pnpm install --frozen-lockfile` step passes
- **Rollback**: Revert `.github/workflows/ci.yml` — change `version: 12.21.0` back to `version: 10.18.3` in all 5 jobs

### Preserved Constraints
- No package.json modifications
- No lockfile changes
- No dependency changes
- No script modifications
- No application source changes
- All 869 existing user file modifications preserved

---
Phase E2 — package-lock.json Audit Complete

### cms-quality.yml Migration
- **File**: `.github/workflows/cms-quality.yml`
- **Change**: Migrated from `npm ci` to `pnpm install --frozen-lockfile`; changed `cache: npm` to `cache: pnpm`
- **Rationale**: Root packageManager is pnpm@12.21.0 (aligned in E1); the workflow's `npm ci` and `cache: npm` were inconsistent with the repository's pnpm-based tooling. Migrating to `pnpm install --frozen-lockfile` ensures lockfile consistency.
- **Preserved**: All `npm run` commands (`verify:release`, `build:cms:release`, `smoke:cms:build`) remain unchanged — these just execute npm scripts defined in `package.json`, which is safe.
- **Lockfile status**: `package-lock.json` is still required and was NOT deleted. The workflow now uses `pnpm install --frozen-lockfile` which reads `pnpm-lock.yaml`, but `package-lock.json` remains in the repository for any tools that may reference it.

### Changes Summary
- **Files modified**: 
  - `.github/workflows/ci.yml` — pnpm version 10.18.3 → 12.21.0 (5 jobs)
  - `.github/workflows/cms-quality.yml` — `npm ci` → `pnpm install --frozen-lockfile`, `cache: npm` → `cache: pnpm`
- **package-lock.json**: Still present and required (not deleted per task requirements)
- **No destructive operations**: No `git reset`, `git checkout`, lockfile deletion, dependency installation, or source modifications

### Validation Performed
- Verified all 5 `ci.yml` jobs have `version: 12.21.0`
- Verified `cms-quality.yml` now uses `pnpm install --frozen-lockfile` with `cache: pnpm`
- Verified no remaining `10.18.3` references in `.github/workflows/`
- Verified all 869 user file modifications preserved
- Verified `package-lock.json` still present in repository root

### Remaining Risks
- The `cms-quality` workflow still has `npm run` commands — these are safe as they just execute npm scripts from `package.json`
- `package-lock.json` remains in the repository (not deleted as instructed)
- If full pnpm migration of `cms-quality` is desired later, the `npm run` commands could also be migrated, but that's beyond E2 scope

### E2 Complete: cms-quality.yml migrated to pnpm; package-lock.json preserved

---
## E1+E2 Validation — GitHub Actions Static Verification Complete

### ci.yml Validation Results
| Check | Result |
|---|---|
| 5 jobs use `pnpm/action-setup@v4` | ✅ PASS (typecheck, lint, test, build, migration-consistency/production-approval-gate) |
| All 5 jobs use `version: 12.21.0` | ✅ PASS (confirmed via grep) |
| All jobs use `cache: "pnpm"` in setup-node | ✅ PASS |
| All jobs use `pnpm install --frozen-lockfile` | ✅ PASS |
| `pnpm build` uses `NEXT_PUBLIC_*` placeholders | ✅ PASS (safe CI placeholder values) |
| No `npm ci` or `package-lock.json` references | ✅ PASS |

### cms-quality.yml Validation Results
| Check | Result |
|---|---|
| Uses `actions/setup-node@v4` with `cache: pnpm` | ✅ PASS |
| Uses `pnpm install --frozen-lockfile` | ✅ PASS |
| Uses `npm run verify:release`, `npm run build:cms:release`, `npm run smoke:cms:build` | ✅ PASS (npm scripts executed via package.json — safe) |
| Trigger paths include `package-lock.json` | ⚠️ PRESENT but benign (workflow triggers on changes to package-lock.json but no longer uses it for install) |
| No `npm ci` | ✅ PASS |

### Lockfile Consistency
- `pnpm-lock.yaml` exists (364KB, lockfileVersion 9.0) — ✅
- `package-lock.json` still exists (197KB, lockfileVersion 3) — ⚠️ Present but no longer used by CI install steps
- Root `package.json` declares `packageManager: "pnpm@12.21.0+sha512..."` — ✅ matches CI version

### Workspace Context
- `cms-quality.yml` runs from repository root (uses `actions/checkout@v4` at root) — ✅ correct
- All install commands run at root workspace level — ✅ correct for pnpm monorepo

### Other Workflows
- Only two workflow files exist: `ci.yml` and `cms-quality.yml` — ✅ no other workflows depend on `package-lock.json` or `npm ci`

### GitHub Actions Runtime Verification
- **Static verification**: Complete (above)
- **Runtime verification**: Not performed — no active GitHub Actions runs accessible in this session; no new workflows triggered per safety rules

### Unresolved Risks
1. `cms-quality.yml` trigger paths include `package-lock.json` — if the file is deleted in future, the trigger will still fire but no action will depend on it. Low risk.
2. `package-lock.json` remains in repo but is not used by any CI install step — can be safely removed in a future phase if no external tooling depends on it.
3. Runtime CI validation not performed — should be validated on next push/PR to confirm workflows execute correctly.

### Validation Conclusion
**E1 and E2 are STATICALLY VALIDATED** — all workflow files correctly configured per requirements. Ready to be considered validated for static verification purposes. Runtime CI validation pending next natural CI trigger.

---
## Phase E3 — Duplicate Dependency Audit Complete

### Audit Summary
Created `docs/architecture/dependency-duplicate-audit.md` with comprehensive findings for 22 package.json files.

### Key Findings
| Dependency | Unnecessary Duplication | Legitimate Per-App Usage |
|---|---|---|
| `@base-ui/react` | apps/admin, apps/accounts, apps/cms | — |
| `class-variance-authority` | apps/admin, apps/accounts | — |
| `clsx` | apps/admin | apps/accounts, apps/store (local utils) |
| `framer-motion` | — | All 5 apps + packages/ui |
| `lucide-react` | — | apps/admin, apps/accounts, apps/studio (apps/cms, apps/store declare for types only) |
| `tailwind-merge` | apps/admin, apps/store, apps/studio | packages/ui (exports `cn` utility) |

### Version Mismatches Identified
- `framer-motion`: apps/store ^12.8.0 vs others ^14.14.0
- `lucide-react`: apps/studio ^1.30.0 vs others 1.72.0

### Recommended Implementation Changes (Future Phase)
1. Remove `@base-ui/react`, `class-variance-authority`, `tailwind-merge` from apps/admin, apps/accounts, apps/cms
2. Remove `clsx` from apps/admin (not used)
3. Remove `tailwind-merge` from apps/store, apps/studio
4. Update `apps/store` framer-motion to ^14.14.0 (requires code review)
5. Update `apps/studio` lucide-react to 1.72.0
6. Optionally migrate `apps/admin/src/lib/utils.ts` and `apps/store/lib/utils.ts` to use `@zerocraft/ui/cn`

### Risks
- Store framer-motion major version upgrade may require source changes
- Source code migration for `cn` utility requires careful validation
- All changes must be validated with full typecheck/build/test suite

### Validation Plan Documented
Full validation matrix (12 steps) and rollback plan included in audit report.

### E3 Status: **AUDIT COMPLETE — REPORT CREATED**
No files modified, no dependencies changed. Report at `docs/architecture/dependency-duplicate-audit.md`.

---

## Phase E3-I — Safe Dependency Consolidation Complete

### Changes Implemented
**Removed verified unnecessary dependencies** from 3 app `package.json` files:

| File | Removed Dependencies | Count |
|---|---|---|
| `apps/admin/package.json` | `@base-ui/react` ^1.9.0, `class-variance-authority` 0.7.1 | 2 |
| `apps/accounts/package.json` | `@base-ui/react` ^1.9.0, `class-variance-authority` 0.7.1 | 2 |
| `apps/cms/package.json` | `@base-ui/react` ^1.9.0 | 1 |

**Total**: 5 dependency declarations removed

### Verification Performed
1. ✅ **Git status**: 870 modified files preserved (includes 3 new package.json changes)
2. ✅ **Source imports**: Confirmed NO direct imports of `@base-ui/react` or `class-variance-authority` in apps/admin, apps/accounts, apps/cms source code
3. ✅ **packages/ui ownership**: Both dependencies still declared in `packages/ui/package.json` (correct transitive provider)
4. ✅ **App consumption**: All apps import UI components via `@zerocraft/ui` (e.g., `@zerocraft/ui/button`, `@zerocraft/ui/card`)
4. ✅ **No source modifications**: Application source code untouched
5. ✅ **Scope respected**: Only `@base-ui/react` and `class-variance-authority` touched; `tailwind-merge`, `clsx`, `framer-motion`, `lucide-react` preserved

### Dependencies Still Present (Correct)
| Dependency | Location | Status |
|---|---|---|
| `@base-ui/react` ^1.9.0 | `packages/ui/package.json` | ✅ Correct — owns the dependency |
| `class-variance-authority` 0.7.1 | `packages/ui/package.json` | ✅ Correct — owns the dependency |
| `tailwind-merge` 3.7.0 | `apps/admin`, `apps/store`, `apps/studio`, `packages/ui` | ⏸️ Kept per scope |
| `clsx` 2.1.1 | `apps/admin`, `apps/accounts`, `apps/store`, `packages/ui` | ⏸️ Kept per scope |
| `framer-motion` | All apps + `packages/ui` | ⏸️ Kept per scope |
| `lucide-react` | `apps/admin`, `apps/accounts`, `apps/studio` | ⏸️ Kept per scope |

### Lockfile
- `pnpm-lock.yaml` NOT regenerated (per instructions: "Do not regenerate the lockfile unless necessary and safe")
- `package-lock.json` NOT removed (per instructions)

### Validation Status
- Static validation: ✅ Complete — changes match audit recommendations exactly
- Runtime validation: ⏸️ Not performed — no `pnpm install`, no typecheck, no build executed per safety rules

### Remaining Work (Future Phases)
1. **Version alignment**: `framer-motion` (store ^12.8.0 vs ^14.14.0), `lucide-react` (studio ^1.30.0 vs 1.72.0)
2. **`tailwind-merge` consolidation**: Remove from apps/admin, apps/store, apps/studio (use `@zerocraft/ui/cn`)
3. **`clsx` consolidation**: Remove from apps/admin (not used), migrate apps/accounts and apps/store to `@zerocraft/ui/cn`
4. **`cn` utility migration**: Update `apps/admin/src/lib/utils.ts` and `apps/store/lib/utils.ts`

### E3-I Status: **IMPLEMENTATION COMPLETE**
All verified unnecessary `@base-ui/react` and `class-variance-authority` direct app dependencies removed. No source code modified. Lockfiles not regenerated. All user changes preserved.

---
## Phase E3-I.1 — pnpm Lockfile Synchronization

### Current Lockfile State
**pnpm-lock.yaml** still contains the five removed dependency references:

| Package | Dependency | Lockfile Entry |
|---|---|---|
| `apps/admin` | `@base-ui/react` ^1.9.0 | ✅ Present (line 269) |
| `apps/admin` | `class-variance-authority` 0.7.1 | ✅ Present (line 356) |
| `apps/accounts` | `@base-ui/react` ^1.9.0 | ✅ Present (line 184) |
| `apps/accounts` | `class-variance-authority` 0.7.1 | ✅ Present (line 199) |
| `apps/cms` | `@base-ui/react` ^1.9.0 | ❓ Not found in lockfile (cms may not have been installed) |

**packages/ui** correctly retains both dependencies:
- `@base-ui/react` ^1.9.0 (line 531, 530)
- `class-variance-authority` 0.7.1 (line 537, 530)

### Synchronization Attempt
**pnpm not available** in the current environment:
- `pnpm` command not on PATH
- `corepack enable` fails with permission error
- `npx pnpm@12.21.0` blocked by npm registry access restrictions

### Required Synchronization (When pnpm Available)
```bash
# Lockfile-only sync without full installation
pnpm install --lockfile-only --ignore-scripts
# Or frozen-lockfile with the updated package.json files
pnpm install --frozen-lockfile --ignore-scripts
```

### Expected Lockfile Changes
Upon successful synchronization, the following importer entries should be removed from `pnpm-lock.yaml`:
1. `apps/admin` → `@base-ui/react` (specifier: ^1.9.0)
2. `apps/admin` → `class-variance-authority` (specifier: 0.7.1)
3. `apps/accounts` → `@base-ui/react` (specifier: ^1.9.0)
4. `apps/accounts` → `class-variance-authority` (specifier: 0.7.1)
5. `apps/cms` → `@base-ui/react` (specifier: ^1.9.0) — if present

The resolved versions (`@base-ui/react@1.9.0`, `class-variance-authority@0.7.1`) should remain in the lockfile as they are still required by `packages/ui`.

### Validation Plan (Pending pnpm)
1. Run `pnpm install --lockfile-only --ignore-scripts`
2. Verify only the 5 importer entries removed (no other changes)
3. Verify `packages/ui` entries unchanged
4. Run `pnpm install --frozen-lockfile --ignore-scripts` to confirm consistency
5. Check `git diff pnpm-lock.yaml` — should show only the expected removals

### Current Status
**LOCKFILE SYNC PENDING** — Cannot complete due to pnpm unavailability in environment. Package.json changes are complete and correct. Lockfile will be synchronized when pnpm is available.

### Remaining Validation Limitations
- Cannot run `pnpm install --frozen-lockfile` to verify consistency
- Cannot confirm lockfile-only sync produces expected diff
- Cannot run typecheck/build validation
- All 872 user modifications preserved

### E3-I.1 Status: **PENDING PNPM AVAILABILITY**
Lockfile synchronization will be completed when pnpm 12.21.0 is accessible. No files modified beyond documentation.

## E0 — Pre-implementation Verification Complete

### Verified Findings

1. **pnpm 12.21.0 compatibility**: Root `package.json` declares `packageManager: "pnpm@12.21.0+sha512..."`. Node.js v22.23.5 is installed. CI workflows use `pnpm/action-setup@v4` with version `10.18.3` — version mismatch with root declaration. Corepack is available but pnpm not directly on PATH; can be invoked via `/usr/lib/node_modules/corepack/shims/pnpm`.

2. **package-lock.json references**: Found in `.github/workflows/cms-quality.yml` step: `- run: npm ci` (uses npm, not pnpm). Root `package-lock.json` (197KB, lockfileVersion 3) exists alongside `pnpm-lock.yaml` (364KB). The `package-lock.json` is not used by pnpm workflows; pnpm jobs use `pnpm install --frozen-lockfile`. The `cms-quality` workflow uses `npm ci` and explicitly references `package-lock.json` — this must be preserved if the cms-quality workflow runs.

3. **Actual dependency imports** (verified by grep):
   - `apps/admin/src/`: Imports from `@zerocraft/ui/button`, `@zerocraft/ui/card`, `@zerocraft/ui/input`, `@zerocraft/ui/label`, `@zerocraft/ui/separator`, `@zerocraft/ui/toast` — all through `@zerocraft/ui` package, NOT directly from `@base-ui/react`
   - `apps/accounts/src/`: No `@base-ui/react` or `@zerocraft/ui` direct imports found in source
   - `packages/ui/package.json` dependencies: `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react`, `react-aria-components`, `tailwind-merge` — these are `dependencies` (not `peerDependencies`) in the shared UI package
   - `packages/ui` exports: `.` → `./src/index.ts` with types; `./*` mappings for UI components

4. **packages/ui dependencies vs peerDependencies**:
   - `dependencies`: `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react`, `react-aria-components`, `tailwind-merge`
   - `peerDependencies`: `next` `16.4.6`, `react` `19.3.0`, `react-dom` `19.3.0`
   - `devDependencies`: `@types/react`, `@types/react-dom`, `@zerocraft/eslint-config`, `eslint`, `eslint-config-next`, `shadcn`, `typescript`
   - **Key insight**: `@base-ui/react`, `class-variance-authority`, `clsx`, `framer-motion`, `lucide-react` are `dependencies` of `packages/ui` (transitively installed in all workspace consumers). They are NOT `peerDependencies`.

5. **Current git status**: 
   - 869 files differ from the last committed state (many `.agents/skills/*` SKILL.md files modified)
   - No `.next` directories tracked in git (all in `.gitignore`)
   - `artifacts/phase-b/production-product-domain-backup.json` NOT git-tracked (verified via `git ls-files`)
   - `package-lock.json` and `pnpm-lock.yaml` both present and modified
   - All user changes are preserved as modified files in the working tree

6. **Correct pnpm filter and rollback commands**:
   - `pnpm --filter @zerocraft/admin ...` — filter to admin app
   - `pnpm --filter @zerocraft/accounts ...` — filter to accounts app
   - `pnpm remove @base-ui/react --filter @zerocraft/admin --filter @zerocraft/accounts` — remove from both apps
   - `pnpm add @base-ui/react --filter @zerocraft/ui` — ensure packages/ui has it (already does)
   - Rollback: `git checkout -- <file>` for any file changes; `pnpm install` to rebuild workspace graph

7. **Dependency ownership before moving**:
   - `@base-ui/react` v1.9.0 declared in: `apps/admin/package.json`, `apps/accounts/package.json`, `packages/ui/package.json` (dependencies)
   - Actual imports: admin and accounts import UI components from `@zerocraft/ui` (e.g., `@zerocraft/ui/button`), NOT directly from `@base-ui/react`
   - The `@base-ui/react` dependency in admin/accounts `package.json` is redundant if all UI components go through `@zerocraft/ui` — but removing it requires ensuring no direct usage exists (verified: none found in source files)
   - `packages/ui` already has `@base-ui/react` in its `dependencies` — this is the canonical location

8. **Existing user changes preserved**: 869 file modifications in `.agents/skills/`, `.agents/skills/frontend-design/`, `.github/workflows/`, and other paths. No `.next` directories tracked. `artifacts/phase-b/` not tracked. Git changes are all user-side modifications to skill files, workflows, and config — none involve node_modules, lockfiles, or source code that would be affected by dependency moves.

---
Plan complete. No files modified, no packages installed, no deletions or moves performed. All findings preserved for execution phase.

**Current Status**: All phases (A through E0) complete with verification. Documentation updated in `docs/architecture/cleanup-progress.md`. No files deleted or modified beyond audit documentation. Git changes preserved. No packages installed, no local databases, no Docker, no hosted Supabase changes, no commits or pushes. Plan ready for execution phase when approved.

**Remaining items**: Phase F (Database and Supabase documentation) could follow, per the roadmap in `docs/architecture/cleanup-progress.md`.

Update `docs/architecture/cleanup-progress.md` with these findings. Keep output concise and stop after the audit.

Do not delete anything. Git changes preserved. Update Phase E next for dependency/lockfile standardization.

---

# 6. PHASE E — DEPENDENCY AND CONFIGURATION STANDARDIZATION

Review the complete dependency graph.

Requirements:

- Consistent pnpm workspace configuration.
- Compatible dependency versions.
- No unnecessary duplicate dependencies.
- Correct internal package dependencies.
- Correct TypeScript path aliases.
- Consistent formatting and linting.
- Correct scripts for each application.
- Reproducible lockfile.
- No broken workspace references.

Inspect all environment variables.

Use separate variables for Platform and Commerce.

Use environment-specific configuration for Development, Staging, and Production.

Security:

- Never expose service-role or secret keys through NEXT_PUBLIC_ variables.
- Never commit secrets.
- Never print secret values in reports.
- Keep privileged credentials server-only.
- Do not assume Azure PostgreSQL is part of the approved architecture; audit every DATABASE_URL reference and explain its purpose.
- Do not silently introduce a third database provider.

Inspect OAuth redirect URIs and remove unresolved placeholders from active deployment configuration.

Do not invent actual production domains or secrets.

---

# 7. PHASE F — DATABASE AND SUPABASE DOCUMENTATION

Audit all existing Platform and Commerce migrations separately.

Resolve the reported migration 008 discrepancy.

Reconcile the reported 13 migrations against the existing Commerce template migration inventory.

Preserve all migration files.

Document:

- Platform database responsibilities.
- Commerce database responsibilities.
- Shared-first multi-tenant architecture.
- `store_id` tenant isolation.
- RLS security model.
- Function permissions.
- SECURITY DEFINER rules.
- Authentication handoff.
- Store provisioning.
- Sales channel credential security.
- Tenant database registry.
- Migration execution procedure.
- Hosted Development verification procedure.
- Staging and Production promotion requirements.

Do not execute migrations as part of this cleanup task.

Do not change hosted database schemas, RLS, functions, grants, or project settings.

---

# 8. PHASE G — PROFESSIONAL ZERОCRAFT BRANDING

Standardize product identity without inventing a new brand.

Brand name: Zerocraft.

Audit existing logo and visual assets. Preserve the approved logo.

Standardize:

- Product naming.
- Application naming.
- Package naming where safe.
- README branding.
- Documentation terminology.
- UI labels.
- Design tokens.
- Typography.
- Semantic colors.
- Spacing conventions.
- Component naming.
- Icon usage.
- Error and empty states.

Use the existing design system and shadcn/ui conventions where appropriate.

Do not randomly redesign every application.

Build a consistent professional SaaS visual language across applications.

Keep public brand identity separate from internal platform administration identity where appropriate.

---

# 9. PHASE H — COMPLETE DOCUMENTATION SYSTEM

Consolidate documentation into a clear source of truth.

Create or update the following, using verified repository evidence:

1. `README.md` — Product overview and quick introduction.
2. `docs/getting-started/README.md` — Complete onboarding.
3. `docs/architecture/system-overview.md`
4. `docs/architecture/monorepo-structure.md`
5. `docs/architecture/domain-architecture.md`
6. `docs/architecture/application-boundaries.md`
7. `docs/database/platform-database.md`
8. `docs/database/commerce-database.md`
9. `docs/database/tenant-isolation.md`
10. `docs/database/migration-guide.md`
11. `docs/security/security-model.md`
12. `docs/authentication/auth-flow.md`
13. `docs/design-system/brand-guidelines.md`
14. `docs/deployment/environment-matrix.md`
15. `docs/deployment/hosted-supabase-deployment.md`
16. `docs/operations/developer-workflow.md`
17. `CONTRIBUTING.md`
18. `SECURITY.md`

Do not create empty documents or duplicate existing content.

Every guide must contain accurate, actionable information.

Clearly label:

- Implemented
- Planned
- Not yet implemented
- Requires approval
- Deprecated / historical

Historical Docker instructions may be retained as historical references but must not appear as active setup instructions.

---

# 10. PHASE I — DEVELOPER EXPERIENCE

Create a simple, complete developer workflow.

Document:

- How to understand the monorepo.
- How to configure environment variables.
- How to run each existing application using supported workflows.
- How to typecheck.
- How to lint.
- How to run tests.
- How to build.
- How to work with hosted Supabase.
- How to verify migrations safely.
- How to use GitHub Actions.
- How to submit changes.
- How to deploy through approved environments.

Never instruct developers to install Docker or local PostgreSQL.

Never put secret values in examples.

Use placeholders for credentials.

Explain commands and their purpose.

---

# 11. PHASE J — VALIDATION

After making approved repository changes, run the available safe checks in the Cloud Session.

At minimum:

- Workspace consistency.
- Dependency integrity.
- TypeScript checks.
- ESLint.
- Unit tests.
- Build checks.
- Migration static validation.
- Migration ordering validation.
- RLS static verification.
- Import resolution.
- Broken documentation links where tooling exists.
- Git diff and whitespace checks.

Do not claim a test passed unless it was actually executed successfully.

If an unavailable external service prevents a test, report NOT RUN and explain why.

Do not run destructive tests against hosted projects.

Do not apply migrations.

---

# 12. EXECUTION SAFETY AND GIT WORKFLOW

Before modifications:

1. Inspect current branch.
2. Inspect Git status.
3. Identify uncommitted user changes.
4. Do not overwrite or discard existing user work.
5. Create a dedicated cleanup branch if permitted.
6. Record the initial repository state.

Work in logical phases.

Keep changes reviewable.

Do not force-push.

Do not commit secrets.

Do not automatically merge into the main branch.

If there are conflicts or uncommitted changes that could be affected, stop and report them.

---

# 13. FINAL DELIVERABLE

Create:

`docs/architecture/project-cleanup-final-report.md`

Include:

- Initial repository structure.
- Final repository structure.
- Files moved.
- Files removed.
- Dependencies removed.
- Caches cleaned.
- Configurations updated.
- Branding standardized.
- Documentation created or consolidated.
- Security improvements.
- Tests executed and exact results.
- Tests not executed and reasons.
- Remaining issues.
- Items requiring human approval.
- Final Git branch and working-tree status.

Also provide a concise executive summary.

## FINAL ACCEPTANCE CRITERIA

The task is complete only when:

- The repository structure is understandable.
- Existing applications remain functional.
- Workspace references are valid.
- Unused items have evidence-based removal decisions.
- No user work or migration history is lost.
- Hosted Supabase-only rules are preserved.
- Multi-tenant architecture is preserved.
- Security boundaries are preserved.
- Documentation is consistent and useful.
- Zerocraft branding is consistent.
- Safe checks have been executed and reported honestly.
- All remaining risks and unverified items are documented.

Start with Phase A.

You are authorized to make safe, reversible repository cleanup and documentation improvements after auditing the relevant files.

For destructive, ambiguous, architectural, database, secret, deployment, or externally impactful changes, stop and request approval.

Do not stop after merely producing a plan: complete the safe repository work in phases and report actual results.

Do not claim completion until all applicable acceptance criteria are satisfied.