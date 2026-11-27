# Monorepo Architecture

> Maara Monorepo — Architecture Refactoring (Phase 4 Complete)
> Repository: `D:\projects\maara`
> Branch: `feat/shopify-global-taxonomy-only`

## Overview

Maara is a PNPM workspace monorepo for a clothing retail management SaaS. The architecture separates concerns into applications, shared packages, independently deployable workers, templates, and infrastructure.

## Workspace Layout

```
maara/
├── apps/
│   ├── admin/              # @zerocraft/admin — Commerce administration (Next.js 16)
│   └── accounts/           # @zerocraft/accounts — Central authentication (Next.js)
├── packages/
│   ├── auth-core/          # @zerocraft/auth-core — Auth, session, RBAC primitives
│   ├── ui/                 # @zerocraft/ui — Shared shadcn/ui components
│   ├── utils/              # @zerocraft/utils — INR formatting, SKU helpers
│   ├── validators/         # @zerocraft/validators — Shared Zod schemas
│   ├── eslint-config/      # @zerocraft/eslint-config — Shared ESLint flat config
│   ├── tsconfig/           # @zerocraft/tsconfig — Shared TypeScript presets
│   └── mcp/                # @zerocraft/mcp — MCP server for Maara tools
├── workers/
│   ├── tenant-provisioner/ # @zerocraft/tenant-provisioner — Cloudflare Worker
│   ├── public-cdn/         # @zerocraft/public-cdn — Cloudflare Worker
│   └── taxonomy/           # @zerocraft/taxonomy — Cloudflare Worker
├── templates/
│   └── commerce/           # @zerocraft/commerce-template — Tenant schema template
├── infrastructure/
│   ├── supabase/           # Platform database (migrations, tests)
│   └── cloudflare/         # Cloudflare infrastructure configuration
├── tooling/
│   └── scripts/            # Repository scripts and validation
├── docs/                   # Technical documentation
└── .agents/skills/         # Agent skills
```

## Naming Convention

All workspace packages use the `@zerocraft/*` scope:
- `@zerocraft/admin`, `@zerocraft/accounts` — applications
- `@zerocraft/auth-core`, `@zerocraft/ui`, `@zerocraft/utils`, `@zerocraft/validators`, `@zerocraft/eslint-config`, `@zerocraft/tsconfig`, `@zerocraft/mcp` — shared packages
- `@zerocraft/tenant-provisioner`, `@zerocraft/public-cdn`, `@zerocraft/taxonomy` — Cloudflare Workers
- `@zerocraft/commerce-template` — tenant template

## Dependency Direction

```
apps/admin      → @zerocraft/auth-core, @zerocraft/ui
apps/accounts   → @zerocraft/auth-core, @zerocraft/ui
packages/ui     → clsx, class-variance-authority, lucide-react, tailwind-merge
packages/auth-core → (stdlib only)
packages/utils  → (stdlib only)
packages/validators → zod
workers/*       → (stdlib only, standalone)
```

**Rules:**
- Apps depend on packages; packages never depend on apps.
- No circular dependencies.
- Workers are standalone (no package or app dependencies).
- One-directional flow: `apps → packages → external`.

## UI Package Exports (`@zerocraft/ui`)

Subpath exports for tree-shaking:

```
@zerocraft/ui                 → src/index.ts (all named exports)
@zerocraft/ui/button          → Button, buttonVariants
@zerocraft/ui/input           → Input
@zerocraft/ui/label           → Label
@zerocraft/ui/separator       → Separator
@zerocraft/ui/skeleton        → Skeleton
@zerocraft/ui/alert           → Alert
@zerocraft/ui/card            → Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
@zerocraft/ui/auth-heading    → AuthHeading
@zerocraft/ui/submit-button   → SubmitButton
@zerocraft/ui/provider-icons  → GoogleIcon, AppleIcon
@zerocraft/ui/auth-shell      → AuthShell
@zerocraft/ui/mark            → Mark, Wordmark
@zerocraft/ui/utils           → cn()
@zerocraft/ui/use-mobile      → useIsMobile()
```

The `@zerocraft/ui/admin/*` import convention has been removed. Admin app imports use `@zerocraft/ui/*` for shared components or local `./` imports for admin-specific UI components.

## Preserved Boundaries

- **Authentication flows:** `@zerocraft/auth-core` handles redirect validation, rate limiting, crypto/handoff, email normalization. Apps consume it via imports.
- **Database ownership:** Platform Supabase (`infrastructure/supabase/`) and tenant-owned databases remain separate. No schemas duplicated between them.
- **Cloudflare Workers:** Independently deployable. Each has its own `wrangler.toml`, entry point (`src/index.ts`), and bindings.
- **Environment variables:** Preserved unchanged. Secrets never committed to code.

## What Changed (Phase 3 Directory Refactoring)

- `commerce-template/` moved to `templates/commerce/`
- `supabase/` moved to `infrastructure/supabase/`
- `scripts/` moved to `tooling/scripts/`
- `infrastructure/cloudflare/` created for shared Cloudflare infrastructure configuration
- All path references in `pnpm-workspace.yaml`, root `package.json`, CI workflow, Worker scripts, and documentation updated
- `apps/admin/src/lib/money.ts` kept as the source of truth for money utilities.
- `packages/mcp` preserved as a pre-built package (dist/ only).
- Future apps (`storefront`, `platform`) not created.
- No database migrations applied or modified.
- No deployments performed.

## What Changed (Phase 4 Shared Package Integration)

### Shared Configuration Integration
- `apps/admin/eslint.config.mjs` — extends `@zerocraft/eslint-config` base
- `apps/accounts/eslint.config.mjs` — extends `@zerocraft/eslint-config` base
- `apps/admin/tsconfig.json` — extends `@zerocraft/tsconfig` with `verbatimModuleSyntax: false` override
- `apps/accounts/tsconfig.json` — extends `@zerocraft/tsconfig` with `verbatimModuleSyntax: false` override
- `@zerocraft/eslint-config` added as devDependency to both apps
- `@zerocraft/tsconfig` added as devDependency to both apps

### New Package Dependencies
- `apps/admin` — added `@zerocraft/utils` and `@zerocraft/validators` as dependencies (declared but not actively imported — behavior incompatible with existing SKU/money logic)
- All workspace linking managed by pnpm (no manual junctions required)

### Not Changed (by design)
- `apps/admin/src/lib/money.ts` — kept as source of truth. `packages/utils/src/currency.ts` remains a lightweight subset. Not merged due to incompatible behaviors (Paise vs rupees, branded types vs plain numbers, strict validation vs simple conversion).
- `@zerocraft/validators`'s `skuSchema` — not used in `apps/admin` due to incompatible SKU validation rules (uppercase/hyphen-separated vs lowercase allowed, max 64 vs max 40, no transform vs `.toUpperCase()`).
- App-specific auth (session management, Supabase cookie handling, OAuth callbacks) — remains in each app. Only shared primitives consumed from `@zerocraft/auth-core`.
- `@zerocraft/mcp` — pre-built dist, no consumers, no changes.
