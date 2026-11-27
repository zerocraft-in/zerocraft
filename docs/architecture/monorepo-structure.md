# Monorepo Structure

Maara is a PNPM workspace monorepo for a clothing retail management SaaS. The
architecture separates concerns into applications, shared packages, independently
deployable workers, templates, and infrastructure.

## Workspace layout

```text
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

## Workspace configuration

`pnpm-workspace.yaml` globs:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "workers/*"
  - "templates/commerce"
```

## Naming convention

All workspace packages use the `@zerocraft/*` scope:

| Package | Name | Type | Purpose |
| --- | --- | --- | --- |
| `apps/admin` | `@zerocraft/admin` | Application | Commerce administration dashboard |
| `apps/accounts` | `@zerocraft/accounts` | Application | Central authentication |
| `packages/auth-core` | `@zerocraft/auth-core` | Library | Auth security primitives |
| `packages/ui` | `@zerocraft/ui` | Library | Shared shadcn/ui components |
| `packages/utils` | `@zerocraft/utils` | Library | INR formatting, SKU helpers |
| `packages/validators` | `@zerocraft/validators` | Library | Shared Zod schemas |
| `packages/eslint-config` | `@zerocraft/eslint-config` | Config | Shared ESLint flat config |
| `packages/tsconfig` | `@zerocraft/tsconfig` | Config | Shared TypeScript presets |
| `packages/mcp` | `@zerocraft/mcp` | Library | MCP server (pre-built dist) |
| `workers/tenant-provisioner` | `@zerocraft/tenant-provisioner` | Worker | Tenant provisioning (Cloudflare) |
| `workers/public-cdn` | `@zerocraft/public-cdn` | Worker | Public CDN edge (Cloudflare) |
| `workers/taxonomy` | `@zerocraft/taxonomy` | Worker | Taxonomy import (Cloudflare) |
| `templates/commerce` | `@zerocraft/commerce-template` | Template | Customer-owned Supabase schema template |

## Dependency direction

```
apps       → packages → external
workers    → (standalone, no package dependencies)
```

Rules:

- Apps depend on packages; packages never depend on apps.
- No circular dependencies.
- Workers are standalone — each has its own `wrangler.toml`, entry point, and
  bindings.
- One-directional flow: `apps → packages → external`.

## Current package consumers

| Package | Consumers | Integration notes |
| --- | --- | --- |
| `@zerocraft/auth-core` | `apps/admin`, `apps/accounts` | Fully integrated — redirects, crypto, email, rate-limit |
| `@zerocraft/ui` | `apps/admin`, `apps/accounts` | Fully integrated — subpath exports for button, input, separator, skeleton |
| `@zerocraft/utils` | `apps/admin` (declared dep) | No active imports yet — behavior differs from `money.ts` |
| `@zerocraft/validators` | `apps/admin` (declared dep) | No active imports yet — `skuSchema` incompatible with admin SKU validation |
| `@zerocraft/eslint-config` | `apps/admin`, `apps/accounts`, `packages/ui` | Apps extend it as base config |
| `@zerocraft/tsconfig` | `apps/admin`, `apps/accounts`, all packages | Apps extend `base.json` with `verbatimModuleSyntax: false` override |
| `@zerocraft/mcp` | None | Pre-built dist, no consumers |

## Duplicated implementations (intentionally not merged)

| Area | Locations | Decision | Reason |
| --- | --- | --- | --- |
| Money / INR formatting | `apps/admin/src/lib/money.ts`, `packages/utils/src/currency.ts` | `money.ts` remains source of truth | Different units (paise vs rupees), different error handling |
| Auth utilities | `packages/auth-core/src/`, app-local auth logic | auth-core consumed where applicable | Apps have app-specific Supabase cookie handling |
| SKU validation | `packages/utils/src/sku.ts`, `packages/validators/src/schemas.ts`, app-local validation | Not merged | Incompatible behaviors (uppercase/hyphen vs lowercase allowed, length limits) |
