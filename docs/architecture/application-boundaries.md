# Application Boundaries

This document defines import and dependency boundaries between applications,
packages, and workers in the Zerocraft monorepo.

## Application → Domain Mapping

| Repository app | Domain | Responsibility |
|---|---|---|
| `apps/accounts` | `accounts.zerocraft.in` | Central authentication |
| `apps/merchant` | `app.zerocraft.in` | Store owners and their teams |
| `apps/platform` | `admin.zerocraft.in` | Internal Zerocraft platform team |

> **Note:** `apps/admin` currently contains merchant functionality and must be renamed to `apps/merchant` in Session C. The future platform administration application will be `apps/platform`, not `apps/admin`. Do not confuse repository application names with domain names.

## Boundary rules

### 1. Apps → Packages (allowed)

Applications may import from shared packages:

```ts
import { safeRedirectPath } from "@zerocraft/auth-core";
import { Button } from "@zerocraft/ui/button";
import { formatInr } from "@zerocraft/utils";
import { skuSchema } from "@zerocraft/validators";
```

### 2. Apps → Shared config (allowed)

Apps extend shared configurations:

```ts
// eslint.config.mjs
import base from "@zerocraft/eslint-config";

// tsconfig.json
{ "extends": "@zerocraft/tsconfig", ... }
```

### 3. Packages → Apps (forbidden)

Packages must not import from applications. This prevents circular dependencies.

### 4. Package → Package (minimal)

Packages should not depend on other packages unless there is a genuine reusable
responsibility:

- `@zerocraft/ui` depends on external UI libraries only.
- `@zerocraft/validators` depends on `zod` only.
- `@zerocraft/utils` has no dependencies.
- `@zerocraft/auth-core` has no dependencies.
- `@zerocraft/eslint-config` depends on `eslint`, `eslint-config-next` only.
- `@zerocraft/tsconfig` has no dependencies.

### 5. Workers (standalone)

Workers do not import from packages or apps. They are independently deployable
Cloudflare Workers with their own `wrangler.toml`.

## Interface stability

- **`@zerocraft/auth-core`**: Public exports from `src/index.ts` are stable.
  Apps import named exports directly.
- **`@zerocraft/ui`**: Main export (`@zerocraft/ui`) re-exports all components.
  Subpath exports (`@zerocraft/ui/button`, etc.) available for tree-shaking.
- **`@zerocraft/utils`**: Exports `formatInr`, `formatInrRaw`, `paiseToRupees`,
  `rupeesToPaise`, `buildSku`, `parseSku`, `validateSku`, `CURRENCY`,
  `CURRENCY_SYMBOL`, `DEFAULT_LOCALE`.
- **`@zerocraft/validators`**: Exports Zod schemas: `skuSchema`,
  `priceSchema`, `inrAmountSchema`, `emailSchema`, `phoneSchema`.
- **`@zerocraft/eslint-config`**: Exports `base` flat config and default export.
  Apps extend it as base.
- **`@zerocraft/tsconfig`**: Exports `base.json` preset. Apps extend it with
  `verbatimModuleSyntax: false` override.

## What can be extended later

- Add active imports of `@zerocraft/utils` and `@zerocraft/validators` in
  `apps/merchant` where behavior is compatible.
- Extract duplicated Supabase client patterns into a shared package (currently
  duplicated in `apps/admin/src/lib/supabase/` and
  `apps/accounts/src/lib/supabase/`).
- Implement the money consolidation design after full verification:
  keep `apps/merchant/src/lib/money.ts` unchanged as the source of truth, add
  missing functions to `@zerocraft/utils`, and have `money.ts` re-export or
  delegate where signatures are compatible.

---

## Corrections Applied (Session B Review)

**2026-11-27:** Added explicit Application → Domain Mapping table.
Previous version did not distinguish repository app names from domain names.
The table now makes clear: `apps/merchant` (renamed from `admin`) serves `app.zerocraft.in`,
`apps/accounts` serves `accounts.zerocraft.in`, and future `apps/platform` will serve `admin.zerocraft.in`.