# Workspace Guide

> Maara Monorepo — Development Workspace Guide
> Repository: `D:\projects\maara`

## Getting Started

### Prerequisites

- Node.js ≥ 22
- pnpm 10.x

### Install Dependencies

```bash
pnpm install
```

This installs all workspace dependencies and creates internal links between packages.

## Workspace Commands

### Run a command in all packages

```bash
pnpm --recursive <command>
```

### Run a command in specific packages

```bash
# Typecheck all shared packages
pnpm --filter @zerocraft/ui --filter @zerocraft/auth-core --filter @zerocraft/utils --filter @zerocraft/validators typecheck

# Test all packages with tests
pnpm --filter @zerocraft/auth-core test
pnpm --filter @zerocraft/tenant-provisioner test
pnpm --filter @zerocraft/public-cdn test
pnpm --filter @zerocraft/taxonomy test

# Lint all packages
pnpm --filter @zerocraft/ui lint
pnpm --filter @zerocraft/admin lint
pnpm --filter @zerocraft/accounts lint
```

### Run a single app

```bash
# Admin (port 3000 default)
pnpm --filter @zerocraft/admin dev

# Accounts (port 3001)
pnpm --filter @zerocraft/accounts dev
```

## Adding a New Package

1. Create the directory under `packages/`:
   ```bash
   mkdir packages/my-package
   ```

2. Create `packages/my-package/package.json`:
   ```json
   {
     "name": "@zerocraft/my-package",
     "version": "0.1.0",
     "private": true,
     "type": "module",
     "description": "...",
     "exports": {
       ".": "./src/index.ts"
     },
     "scripts": {
       "typecheck": "tsc --noEmit"
     }
   }
   ```

3. Create `packages/my-package/tsconfig.json`:
   ```json
   {
     "extends": "../tsconfig/base.json",
     "include": ["src/**/*.ts"]
   }
   ```

4. Create `packages/my-package/src/index.ts` with your exports.

5. The package is automatically included in the workspace via `pnpm-workspace.yaml` (`packages/*` glob).

## Importing Shared Packages

From any app or package:

```ts
import { Button } from "@zerocraft/ui/button";
import { safeRedirectPath } from "@zerocraft/auth-core";
import { formatInr } from "@zerocraft/utils";
import { skuSchema } from "@zerocraft/validators";
```

From within `@zerocraft/ui` itself, use relative imports:

```ts
import { cn } from "../../lib/utils";
```

## UI Package Subpath Exports

The `@zerocraft/ui` package supports subpath imports:

```ts
import { Button } from "@zerocraft/ui/button";
import { Input } from "@zerocraft/ui/input";
import { Separator } from "@zerocraft/ui/separator";
import { Skeleton } from "@zerocraft/ui/skeleton";
import { cn } from "@zerocraft/ui/utils";
```

See `docs/architecture/monorepo-architecture.md` for the complete export list.

## ESLint Configuration

Apps extend `@zerocraft/eslint-config` as their base:

```js
// apps/admin/eslint.config.mjs
import base from "@zerocraft/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...base,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
```

Packages use `@zerocraft/eslint-config` directly:

```js
// packages/ui/eslint.config.mjs
import base from "@zerocraft/eslint-config";
export default base;
```

## TypeScript Configuration

Shared base: `packages/tsconfig/base.json`. Packages extend it:

```json
{
  "extends": "@zerocraft/tsconfig",
  "include": ["src/**/*.ts"]
}
```

Apps extend `@zerocraft/tsconfig` with Next.js-specific overrides:

```json
{
  "extends": "@zerocraft/tsconfig",
  "compilerOptions": {
    "target": "ES2017",
    "verbatimModuleSyntax": false,
    "plugins": [{ "name": "next" }]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ]
}
```

The `verbatimModuleSyntax: false` override in apps is necessary because the shared base enables it, but Next.js apps have type-only imports that require the override.

## Cloudflare Workers

Each worker is independently deployable:

```bash
cd workers/tenant-provisioner
pnpm typecheck
pnpm test
# wrangler deploy (production only)
```

Workers use `@zerocraft/*` scope in their `package.json` `name` field. `wrangler.toml` files use `maara-*` deployment names (unchanged).

## Package Integration Status

| Package | Consumers | Status |
|---------|-----------|--------|
| `@zerocraft/auth-core` | `apps/admin`, `apps/accounts` | Fully integrated |
| `@zerocraft/ui` | `apps/admin`, `apps/accounts` | Fully integrated (subpath exports) |
| `@zerocraft/utils` | `apps/admin` (declared dep) | Declared dependency — not actively imported (behavior incompatible with `money.ts`) |
| `@zerocraft/validators` | `apps/admin` (declared dep) | Declared dependency — not actively imported (`skuSchema` incompatible with admin SKU validation) |
| `@zerocraft/eslint-config` | `apps/admin`, `apps/accounts`, `packages/ui` | Integrated as base config |
| `@zerocraft/tsconfig` | `apps/admin`, `apps/accounts`, all packages | Integrated as base preset |
| `@zerocraft/mcp` | None | Pre-built dist, no consumers |

## Commerce Template

The commerce template (`templates/commerce/`) provides versioned, customer-owned Supabase schemas. It is referenced by `pnpm-workspace.yaml` but is not a dependency of any app or package.

## Supabase Infrastructure

Database migrations live in `infrastructure/supabase/migrations/`. No migrations are applied during development setup. Production databases are never modified by this workspace.

## Scripts

Repository scripts live in `tooling/scripts/`:

| Script | Purpose |
|--------|---------|
| `validate-migrations.js` | Validate migration files |
| `check-duplicate-timestamps.js` | Check for duplicate timestamps in migrations |
| `security-audit.js` | Security audit checks |
| `import-shopify-taxonomy.mjs` | Import Shopify taxonomy |
| `check-destructive-migrations.js` | Check for destructive migration patterns |
