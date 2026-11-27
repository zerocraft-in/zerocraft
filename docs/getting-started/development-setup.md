# Development Setup

Verified on Windows 11 with Node 24.19.0 and pnpm 10.18.3 on 12 November 2026.
Commands are run from the repository root, `D:\projects\maara`.

## Prerequisites

| Tool | Required | Notes |
| --- | --- | --- |
| Node.js | 22 or newer | Verified with 24.19.0 |
| pnpm | 10.18.3 | Declared in `packageManager`; the lockfile is committed |
| Docker Desktop | Required for Supabase | **Not installed in this environment** |
| Supabase CLI | 3.1.0 | Installed as a root dev dependency |
| Git | Optional | This workspace is a git repository on `main` |

### Windows note: pnpm binary blocked

This machine has an Application Control policy that blocks the native pnpm
executable (`pnpm.exe` / `pnpm-native.exe`). pnpm 10 installed through npm works
because it runs through Node. If `pnpm` is not on `PATH`, use one of:

```powershell
# Option A — prepend the npm global bin directory for the session
$env:PATH = "$env:APPDATA\npm;" + $env:PATH
pnpm --version

# Option B — call the Node entry point directly
node "$env:APPDATA\npm\node_modules\pnpm\bin\pnpm.cjs" --version
```

Use Option A in each new shell, or add `%APPDATA%\npm` to the user `PATH`
permanently. Do not install pnpm 11/12 (native binary) on this machine.

## Install dependencies

```powershell
$env:PATH = "$env:APPDATA\npm;" + $env:PATH
pnpm install
```

This installs the workspace root, `apps/admin`, and the Supabase CLI. The
lockfile must not be regenerated casually; commit it with dependency changes.

## Run the app

```powershell
pnpm dev            # http://localhost:3000
```

Other root scripts:

```powershell
pnpm build          # production build
pnpm start          # serve the production build
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest (unit)
pnpm test:e2e       # Playwright (requires browsers + running app)
```

All root scripts filter to `@zerocraft/admin`, so they can be run from the root.

## Supabase hosted project setup

All Supabase resources (Postgres, Auth, Storage, RLS) are hosted projects only.
No local Docker stack is required or available in this environment.

```powershell
# Ensure environment variables are set
# See .env.example and infrastructure/supabase/env.local.md for required vars

# Verify connection to hosted Supabase
pnpm exec supabase status
```

Environment variables required (from `.env.example` and `infrastructure/supabase/env.local.md`):

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted Supabase project URL (e.g., https://xyz.supabase.co) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Hosted Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Hosted Supabase service role key (server-only) |
| `DATABASE_URL` | PostgreSQL connection string to hosted Supabase |

No local ports are used. All RLS policies, migrations, and auth flows operate
against the hosted Supabase project.

### Email testing

Auth emails (invitations, password reset) are sent to the SMTP service configured
in the hosted Supabase project. No local Mailpit is used.

### Migrations

Migration execution is handled via the Supabase CLI or direct SQL against the
hosted project. Since Docker is unavailable:

1. Migrations are defined in `infrastructure/supabase/migrations/`.
2. Apply migrations via the Supabase dashboard SQL Editor or `supabase db push`.
3. Never run `pnpm db:reset` against a local stack — use hosted project tools instead.

Never hand-craft a timestamp or edit an already-applied migration.

## Tests

```powershell
pnpm test                         # unit tests (currently the money module)
pnpm exec playwright install      # one-time browser download
pnpm test:e2e                     # smoke and workflow tests
```

Playwright Chromium is installed on this machine and the 6-test smoke suite
passes against the running dev server. Any new machine needs
`pnpm exec playwright install chromium` first.

## Database tests (planned)

Phase 2 adds:

```text
supabase/tests/
├── 001_rls_tenancy.sql
├── 002_role_permissions.sql
├── 003_inventory_immutability.sql
└── 004_invitations.sql
```

Run with `pnpm exec supabase test db`. A test suite that has not been executed
must not be reported as passing.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `pnpm : term not recognized` | Add `%APPDATA%\npm` to `PATH` for the session |
| `Program 'pnpm.exe' failed to run: blocked` | Native binary blocked; use the Node entry point |
| `supabase start` fails | Docker Desktop not installed or not running |
| Google font fetch fails during build | `next/font` needs network access on first build; retry or self-host Manrope |
| Port 3000 busy | `pnpm dev -- --port 3001` |
| Theme flashes on load | next-themes `suppressHydrationWarning` must stay on `<html>` |

## Definition of a clean checkout

A new developer should be able to run:

```powershell
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

and get a passing result without a database. Anything that requires Supabase
must be clearly separated and documented as such.
