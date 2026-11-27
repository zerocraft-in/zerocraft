# Shared packages

This directory contains shared libraries and configurations used by Maara
applications. All packages use the `@zerocraft/*` scope.

## Package inventory

| Package         | Name                       | Type    | Purpose                                                         |
| --------------- | -------------------------- | ------- | --------------------------------------------------------------- |
| `auth-core`     | `@zerocraft/auth-core`     | Library | Auth security primitives (redirects, rate-limit, crypto, email) |
| `ui`            | `@zerocraft/ui`            | Library | Shared shadcn/ui components                                     |
| `utils`         | `@zerocraft/utils`         | Library | INR formatting, SKU helpers, constants                          |
| `validators`    | `@zerocraft/validators`    | Library | Shared Zod schemas                                              |
| `eslint-config` | `@zerocraft/eslint-config` | Config  | Shared ESLint flat config                                       |
| `tsconfig`      | `@zerocraft/tsconfig`      | Config  | Shared TypeScript presets                                       |
| `mcp`           | `@zerocraft/mcp`           | Library | MCP server (pre-built dist)                                     |

## Workspace configuration

`pnpm-workspace.yaml` globs `packages/*`, so all packages under this directory
are automatically included in the workspace.

## Importing shared packages

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

## Current package consumers

| Package                    | Consumers                                    | Status                                                                                           |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@zerocraft/auth-core`     | `apps/admin`, `apps/accounts`                | Fully integrated                                                                                 |
| `@zerocraft/ui`            | `apps/admin`, `apps/accounts`                | Fully integrated (subpath exports)                                                               |
| `@zerocraft/utils`         | `apps/admin` (declared dep)                  | Declared dependency — not actively imported (behavior incompatible with `money.ts`)              |
| `@zerocraft/validators`    | `apps/admin` (declared dep)                  | Declared dependency — not actively imported (`skuSchema` incompatible with admin SKU validation) |
| `@zerocraft/eslint-config` | `apps/admin`, `apps/accounts`, `packages/ui` | Integrated as base config                                                                        |
| `@zerocraft/tsconfig`      | `apps/admin`, `apps/accounts`, all packages  | Integrated as base preset                                                                        |
| `@zerocraft/mcp`           | None                                         | Pre-built dist, no consumers                                                                     |

## Adding a new package

1. Create the directory under `packages/`.
2. Create `package.json` with `@zerocraft/*` scope name.
3. Create `tsconfig.json` extending `@zerocraft/tsconfig`.
4. Create `src/index.ts` with your exports.
5. The package is automatically included via `pnpm-workspace.yaml` (`packages/*` glob).

## Duplicated implementations (intentionally not merged)

| Area                   | Locations                                                                               | Decision                            | Reason                                                      |
| ---------------------- | --------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Money / INR formatting | `apps/admin/src/lib/money.ts`, `packages/utils/src/currency.ts`                         | `money.ts` remains source of truth  | Different units (paise vs rupees), different error handling |
| Auth utilities         | `packages/auth-core/src/`, app-local auth logic                                         | auth-core consumed where applicable | Apps have app-specific Supabase cookie handling             |
| SKU validation         | `packages/utils/src/sku.ts`, `packages/validators/src/schemas.ts`, app-local validation | Not merged                          | Incompatible behaviors                                      |

See `docs/architecture/package-architecture.md` for the complete package
reference.
