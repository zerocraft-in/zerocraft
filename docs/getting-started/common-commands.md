# Common Commands

All commands are run from the repository root unless otherwise noted.

## Root workspace scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the admin app dev server (http://localhost:3000) |
| `pnpm build` | Production build of the admin app |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint on the admin app |
| `pnpm typecheck` | Run TypeScript typecheck on the admin app |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:migration-check` | Validate migration files and check for duplicate timestamps |
| `pnpm db:verify-schema` | Read-only schema verification via Supabase dashboard SQL Editor |
| `pnpm db:start` | Start the local Supabase stack |
| `pnpm db:stop` | Stop the local Supabase stack |
| `pnpm db:reset` | Drop, migrate, and seed the local Supabase database |
| `pnpm db:push` | Push migrations (never to production without approval) |
| `pnpm db:diff <name>` | Generate a migration from schema changes |

All root scripts filter to `@zerocraft/admin`.

## Filtered package commands

| Command | Purpose |
| --- | --- |
| `pnpm --filter @zerocraft/admin dev` | Run admin app dev server |
| `pnpm --filter @zerocraft/admin typecheck` | Typecheck admin app |
| `pnpm --filter @zerocraft/admin lint` | Lint admin app |
| `pnpm --filter @zerocraft/admin test` | Test admin app |
| `pnpm --filter @zerocraft/admin build` | Build admin app |
| `pnpm --filter @zerocraft/ui --filter @zerocraft/auth-core --filter @zerocraft/utils --filter @zerocraft/validators typecheck` | Typecheck all shared packages |
| `pnpm --filter @zerocraft/auth-core test` | Test auth-core package |
| `pnpm --filter @zerocraft/tenant-provisioner test` | Test tenant-provisioner Worker |
| `pnpm --filter @zerocraft/public-cdn test` | Test public-cdn Worker |
| `pnpm --filter @zerocraft/taxonomy test` | Test taxonomy Worker |

## Cloudflare Workers

Each worker is independently deployable:

```bash
cd workers/tenant-provisioner
pnpm typecheck
pnpm test
# wrangler deploy (production only)
```

Workers use `@zerocraft/*` scope in their `package.json` `name` field. `wrangler.toml`
files use `maara-*` deployment names.

## Supabase infrastructure

Database migrations live in `infrastructure/supabase/migrations/`. No migrations
are applied during development setup. Production databases are never modified by
this workspace.

## Repository scripts

Repository scripts live in `tooling/scripts/`:

| Script | Purpose |
| --- | --- |
| `validate-migrations.js` | Validate migration files |
| `check-duplicate-timestamps.js` | Check for duplicate timestamps in migrations |
| `security-audit.js` | Security audit checks |
| `import-shopify-taxonomy.mjs` | Import Shopify taxonomy |
| `check-destructive-migrations.js` | Check for destructive migration patterns |
