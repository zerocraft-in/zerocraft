# Package Boundaries

> Maara Monorepo — Package Boundary Definitions
> Repository: `D:\projects\maara`

## Package Inventory

| Package | Name | Type | Purpose | Runtime Dependencies |
|---------|------|------|---------|---------------------|
| `apps/admin` | `@zerocraft/admin` | Application | Commerce administration dashboard | @zerocraft/auth-core, @zerocraft/ui, @supabase/*, @aws-sdk/*, @tanstack/react-table, framer-motion, lucide, zod, next, react |
| `apps/accounts` | `@zerocraft/accounts` | Application | Central authentication | @zerocraft/auth-core, @zerocraft/ui, @supabase/*, next, react, zod |
| `packages/auth-core` | `@zerocraft/auth-core` | Library | Auth security primitives (redirects, rate-limit, crypto, email) | (none) |
| `packages/ui` | `@zerocraft/ui` | Library | Shared shadcn/ui components | class-variance-authority, clsx, lucide-react, tailwind-merge |
| `packages/utils` | `@zerocraft/utils` | Library | INR formatting, SKU helpers, constants | (none) |
| `packages/validators` | `@zerocraft/validators` | Library | Shared Zod schemas | zod |
| `packages/eslint-config` | `@zerocraft/eslint-config` | Config | Shared ESLint flat config | eslint, eslint-config-next |
| `packages/tsconfig` | `@zerocraft/tsconfig` | Config | Shared TypeScript presets | (none) |
| `packages/mcp` | `@zerocraft/mcp` | Library | MCP server (pre-built dist/) | @modelcontextprotocol/server, @supabase/supabase-js, zod |
| `workers/tenant-provisioner` | `@zerocraft/tenant-provisioner` | Worker | Tenant provisioning (Cloudflare) | (none) |
| `workers/public-cdn` | `@zerocraft/public-cdn` | Worker | Public CDN edge (Cloudflare) | (none) |
| `workers/taxonomy` | `@zerocraft/taxonomy` | Worker | Taxonomy import (Cloudflare) | (none) |
| `templates/commerce` | `@zerocraft/commerce-template` | Template | Customer-owned Supabase schema template | (none) |

## Boundary Rules

### 1. Apps → Packages (allowed)
Applications may import from shared packages:
```ts
import { safeRedirectPath } from "@zerocraft/auth-core";
import { Button } from "@zerocraft/ui/button";
import { formatInr } from "@zerocraft/utils";
import { skuSchema } from "@zerocraft/validators";
```

### 2. Apps → Shared Config (allowed)
Apps extend shared configurations:
```ts
// eslint.config.mjs
import base from "@zerocraft/eslint-config";

// tsconfig.json
{ "extends": "@zerocraft/tsconfig", ... }
```

### 3. Current Package Consumers

| Package | Consumers | Integration Notes |
|---------|-----------|-------------------|
| `@zerocraft/auth-core` | `apps/admin`, `apps/accounts` | Fully integrated — redirects, crypto, email, rate-limit |
| `@zerocraft/ui` | `apps/admin`, `apps/accounts` | Fully integrated — subpath exports for button, input, separator, skeleton |
| `@zerocraft/utils` | `apps/admin` (declared dep) | No active imports yet — behavior differs from `money.ts` |
| `@zerocraft/validators` | `apps/admin` (declared dep) | No active imports yet — `skuSchema` incompatible with admin SKU validation |
| `@zerocraft/eslint-config` | `apps/admin`, `apps/accounts`, `packages/ui` | Apps extend it as base config |
| `@zerocraft/tsconfig` | `apps/admin`, `apps/accounts`, all packages | Apps extend `base.json` with `verbatimModuleSyntax: false` override |

### 4. Packages → Apps (forbidden)
Packages must not import from applications. This prevents circular dependencies.

### 5. Package → Package (minimal)
Packages should not depend on other packages unless there is a genuine reusable responsibility:
- `@zerocraft/ui` depends on external UI libraries only.
- `@zerocraft/validators` depends on `zod` only.
- `@zerocraft/utils` has no dependencies.
- `@zerocraft/auth-core` has no dependencies.
- `@zerocraft/eslint-config` depends on `eslint`, `eslint-config-next` only.
- `@zerocraft/tsconfig` has no dependencies.

### 6. Workers (standalone)
Workers do not import from packages or apps. They are independently deployable Cloudflare Workers with their own `wrangler.toml`.

### 2. Packages → Apps (forbidden)
Packages must not import from applications. This prevents circular dependencies.

### 3. Package → Package (minimal)
Packages should not depend on other packages unless there is a genuine reusable responsibility:
- `@zerocraft/ui` depends on external UI libraries only.
- `@zerocraft/validators` depends on `zod` only.
- `@zerocraft/utils` has no dependencies.
- `@zerocraft/auth-core` has no dependencies.

### 4. Workers (standalone)
Workers do not import from packages or apps. They are independently deployable Cloudflare Workers with their own `wrangler.toml`.

## Duplicated Implementations

The following areas have overlapping implementations but were intentionally NOT merged:

| Area | Locations | Decision | Reason |
|------|-----------|----------|--------|
| Money / INR formatting | `apps/admin/src/lib/money.ts`, `packages/utils/src/currency.ts` | `money.ts` remains source of truth. Not merged. | `money.ts` (189 lines) has branded `Paise` type, `MoneyError`, arithmetic (`addPaise`, `subtractPaise`, `multiplyPaise`, `applyBasisPoints`), `lineAmounts`, strict validation. `utils/currency.ts` (21 lines) is a lightweight subset with decimal rupee amounts. Different units (Paise vs rupees), different error handling. Not interchangeable. |
| Auth utilities | `packages/auth-core/src/`, `apps/admin/src/lib/auth/`, `apps/accounts/src/lib/auth/` | auth-core consumed where applicable. Local auth logic preserved. | Apps have app-specific Supabase cookie handling, session management, OAuth callbacks. Shared primitives (redirects, crypto, rate-limit) already consumed from auth-core. |
| SKU validation | `apps/admin/src/app/(dashboard)/products/variant-actions.ts`, `packages/utils/src/sku.ts`, `packages/validators/src/schemas.ts` | Not merged. | Admin SKU validation: lowercase allowed, max 40 chars, `.toUpperCase()` transform. `skuSchema`: uppercase required, max 64 chars, hyphen-separated segments. `validateSku`: uppercase only. Incompatible behaviors. |
| `cn()` utility | `packages/ui/src/lib/utils.ts` | Used within `@zerocraft/ui` only. | Not yet exported to apps. Apps have their own `cn()` via `@/lib/utils`. |

## Money Consolidation Design (Proposed, Not Implemented)

A backward-compatible consolidation would:

1. Keep `apps/admin/src/lib/money.ts` unchanged as the source of truth.
2. Add missing functions to `@zerocraft/utils` that `money.ts` has but `currency.ts` lacks:
   - `addPaise`, `subtractPaise`, `multiplyPaise`, `applyBasisPoints`, `lineAmounts`, `sumPaise`
   - `Paise` branded type and `MoneyError` class
   - `formatPaise` (works from Paise integer, distinct from `formatInr` which works from decimal rupees)
3. Have `money.ts` re-export or delegate to `@zerocraft/utils` where signatures are compatible (e.g., `rupeesToPaise`, `paiseToRupees`).
4. Verify all existing `money.ts` call sites still work after any changes.

## Interface Stability

- **`@zerocraft/auth-core`**: Public exports from `src/index.ts` are stable. Apps import named exports directly.
- **`@zerocraft/ui`**: Main export (`@zerocraft/ui`) re-exports all components. Subpath exports (`@zerocraft/ui/button`, etc.) available for tree-shaking.
- **`@zerocraft/utils`**: Exports `formatInr`, `formatInrRaw`, `paiseToRupees`, `rupeesToPaise`, `buildSku`, `parseSku`, `validateSku`, `CURRENCY`, `CURRENCY_SYMBOL`, `DEFAULT_LOCALE`.
- **`@zerocraft/validators`**: Exports Zod schemas: `skuSchema`, `priceSchema`, `inrAmountSchema`, `emailSchema`, `phoneSchema`.
- **`@zerocraft/eslint-config`**: Exports `base` flat config and default export. Apps extend it as base.
- **`@zerocraft/tsconfig`**: Exports `base.json` preset. Apps extend it with `verbatimModuleSyntax: false` override.

## What Can Be Extended Later

- Add active imports of `@zerocraft/utils` and `@zerocraft/validators` in `apps/admin` where behavior is compatible.
- Extract duplicated Supabase client patterns into a shared package (currently duplicated in `apps/admin/src/lib/supabase/` and `apps/accounts/src/lib/supabase/`).
- Implement the money consolidation design above after full verification.
