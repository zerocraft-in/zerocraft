# Zerocraft Platform — Static Tests

These tests verify the Supabase foundation without connecting to a database. They read
the migration SQL files and perform pattern-based checks.

## Test files

| File | Purpose |
|---|---|
| `verify-naming.mjs` | Table, column, constraint, index, trigger, function, policy naming |
| `verify-migration-order.mjs` | Migration ordering, dependency integrity, forward references |
| `verify-rls.mjs` | RLS enablement, policy presence, circular dependency checks |
| `verify-security.mjs` | SECURITY DEFINER, search_path, grants, revokes, role hierarchy |
| `verify-no-commerce.mjs` | No commerce tables, no customer/demo seed data |

## How to run

From `D:\projects\maara\infrastructure\supabase\`:

```powershell
pnpm exec node tests/static/verify-naming.mjs
pnpm exec node tests/static/verify-migration-order.mjs
pnpm exec node tests/static/verify-rls.mjs
pnpm exec node tests/static/verify-security.mjs
pnpm exec node tests/static/verify-no-commerce.mjs
```

All tests exit with code 0 on success and code 1 on failure, printing PASS/FAIL for each
check.

## What is NOT tested here

Live database execution (RLS policy evaluation, function execution, trigger firing)
requires Docker and `supabase db reset`. See `docs/testing.md` for database test notes.
