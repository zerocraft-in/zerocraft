# Zerocraft Platform — Local Development

## Prerequisites

| Tool | Version | Required for |
|---|---|---|
| Supabase CLI | 3.1.0 (installed) | `supabase start`, `db reset`, `migration list`, `test db`, `stop` |
| Docker Desktop | Installed and working | Running local Supabase services |
| pnpm | 10.18.3 (installed) | Repository tooling (`pnpm exec supabase`) |
| Node | v24.19.0 (installed) | Static test scripts |

**Docker is installed on this machine.** However, `supabase start`, `supabase db reset`, and
`supabase test db` are not executed per task restrictions (no deployment, no local stack startup).
Static verification (file-based checks) is possible without starting Supabase.

## Working directory

All commands run from `D:\projects\maara\infrastructure\supabase\`.

## Environment setup

```powershell
# Copy the example file (do not commit .env)
cp .env.example .env
# Edit .env and fill in values. Never commit real secrets.
```

`.env.example` contains placeholder values for `SUPABASE_URL`, `SUPABASE_DB_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
`ZEROCRAFT_PLATFORM_BOOTSTRAP_SECRET`.

## Local stack commands (require Docker)

```powershell
# Start all local Supabase services (API, DB, Studio, Realtime, Storage, Auth, Edge Runtime)
pnpm exec supabase start

# Check service status and connection strings
pnpm exec supabase status

# Apply migrations and run seed (destructive — resets the local database)
pnpm exec supabase db reset

# List applied migrations
pnpm exec supabase migration list

# Run database tests (pgTAP/RLS suites)
pnpm exec supabase test db

# Stop all local Supabase services
pnpm exec supabase stop
```

> Do not run `supabase db push`, `supabase link`, `supabase migration up` against remote
> environments, or `supabase functions deploy`. Nothing in this directory is linked to a
> hosted Supabase project.

## Static verification (no Docker required)

Static checks validate file structure, SQL syntax patterns, object naming, migration
ordering, RLS enablement, and security configuration without connecting to a database:

```powershell
# From the repository root
pnpm exec node tests/supabase/static/verify-naming.mjs
pnpm exec node tests/supabase/static/verify-migration-order.mjs
pnpm exec node tests/supabase/static/verify-rls.mjs
pnpm exec node tests/supabase/static/verify-security.mjs
```

See `docs/testing.md` for details on each static test.

## Migration reset workflow

When Docker is available:

```powershell
pnpm exec supabase stop          # ensure clean state
pnpm exec supabase start         # start local stack
pnpm exec supabase db reset      # apply migrations 001–004, then run seed.sql
pnpm exec supabase migration list  # verify all 4 migrations applied
```

The seed file (`seed.sql`) is intentionally empty. All platform reference data (roles,
permissions, role-permission mappings) is seeded idempotently inside migration 002 and
migration 003 using `ON CONFLICT DO NOTHING`.

## Bootstrapping Mani (Platform Owner)

The secure Platform Owner bootstrap mechanism is implemented in migration 005.
The procedure below is for local development only. It must be executed after
`supabase start` and after Mani's Auth account exists and is verified.

### Prerequisites

- Docker Desktop installed and running (local Supabase stack)
- Supabase CLI v3.1.0
- Mani's Auth user created and verified through the intended authentication flow
- Mani's Auth user UUID (obtained from `auth.users.id`)

### Step 1: Start the local Supabase stack

```powershell
pnpm exec supabase start
pnpm exec supabase status
```

### Step 2: Create and verify Mani's Auth account

Create Mani's Auth user through the intended authentication flow (e.g., sign up
via the admin application, or create directly in `auth.users` for local
development). The account must be email-verified before bootstrapping.

Obtain Mani's Auth user UUID from `auth.users.id`. This UUID is supplied at
runtime — it is never hardcoded.

### Step 3: Execute the bootstrap

Run the administrative bootstrap script as the database owner (postgres
superuser). Alternatively, run via the Supabase client with the service_role
key:

```powershell
psql "$SUPABASE_DB_URL" `
  -v user_id="<MANI_AUTH_USER_ID>" `
  -v ON_ERROR_STOP=1 `
  -f scripts/bootstrap-platform-owner.sql
```

Replace `<MANI_AUTH_USER_ID>` with Mani's actual Auth user UUID.

The script:
1. Validates no Platform Owner already exists (defense in depth).
2. Calls `private.bootstrap_platform_owner(:'user_id')`, which:
   - Validates the user exists in `auth.users` and `platform_users`.
   - Refuses if a Platform Owner already exists (one-time enforcement).
   - Inserts the `platform_members` row with the `platform_owner` role.
   - Records an audit event in `platform_bootstrap_events`.
3. Prints post-bootstrap verification results.

### Step 4: Verify the bootstrap

Confirm the output shows:
- A `platform_members` row with `role_key = 'platform_owner'` and
  `membership_status = 'active'`.
- A `platform_bootstrap_events` row with the bootstrapped user ID.

### Step 5: Stop the local Supabase stack

```powershell
pnpm exec supabase stop
```

### Restrictions

- Do not create Maran, Maara Merch, sample customers, sample organizations,
  sample stores, or fake subscriptions/invoices in this setup.
- The `service_role` key must NEVER be exposed to browser clients or committed
  to version control.
- No email, password, or UUID is hardcoded in any migration or script.
- The bootstrap is one-time: a second attempt fails safely with an error.

## Auth email templates

Passwordless sign-in uses two separate Supabase email templates, configured in
`config.toml` and stored in `templates/`:

| Template | Used for | Contains |
|---|---|---|
| `confirmation.html` | New-account signup | Clickable `token_hash` confirmation link |
| `magic_link.html` | Existing-account sign-in | Six-digit code only |

Do not merge these templates. Supabase renders the template for the mail action
that was triggered; a single template containing both `{{ .ConfirmationURL }}`
and `{{ .Token }}` sends both formats to every recipient.

Local delivery goes to Mailpit. Open `http://localhost:54324` to inspect the
actual rendered email body. SMTP is available to containers on `1025/tcp`; only
the Mailpit web UI is published to the host.

## Ports

| Service | Port |
|---|---|
| API | 54321 |
| Database | 54322 |
| Studio | 54323 |
| Local SMTP | 54324 |
| Pooler | 54329 |
| Shadow DB | 54320 |
| Analytics | 54327 |
| Edge inspector | 8083 |

## Preservation boundary

The default Commerce Template at `templates/commerce/` is preserved byte-for-byte and is
never installed into this Platform DB. Nothing in this directory is linked to a hosted
Supabase project.
