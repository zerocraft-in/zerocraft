# Zerocraft Platform — Supabase Foundation

This directory is the **Zerocraft Platform control-plane database** local Supabase project.

It holds only Zerocraft Platform data: platform users, platform staff, organizations,
memberships, roles/permissions, and invitations. It is operated by Zerocraft.

Stores, OAuth/integration connections, provisioning jobs, platform billing, and audit
events are **planned** (future migrations) and are not part of this foundation.

## Platform DB vs customer-owned DBs

| Concern | Platform DB (this project) | Customer-owned Supabase project |
|---|---|---|
| Users / profiles | Yes | No |
| Organizations | Yes | No |
| Organization members / invitations | Yes | No |
| Platform roles / permissions | Yes | No |
| Stores (directory only) | Planned | No |
| OAuth connections | Planned | No |
| Provisioning jobs | Planned | No |
| Platform billing | Planned | No |
| Catalog / products | No | Yes (Commerce Template) |
| Inventory / orders / customers | No | Yes |
| Payments | No | Yes |

No commerce data ever lives in the Platform DB. No Platform data ever lives in a customer
project. Each customer store gets its own independent Supabase project provisioned by the
Zerocraft provisioning system. The Commerce Template (`templates/commerce/` at repository
root) is installed only into customer-owned projects — never into this Platform DB.

## Local development prerequisites

- Supabase CLI (installed: v3.1.0; `pnpm exec supabase --version`)
- Docker Desktop (required to run local Supabase services — **installed and working**)
- Node / pnpm (repository tooling)

## Local development commands (PowerShell)

Run from `infrastructure/supabase/`:

```powershell
# Start the local Supabase stack (requires Docker)
pnpm exec supabase start

# Check service status
pnpm exec supabase status

# Reset the local database (applies migrations, then runs seed)
pnpm exec supabase db reset

# List applied migrations
pnpm exec supabase migration list

# Run database tests
pnpm exec supabase test db

# Stop the local stack
pnpm exec supabase stop
```

> Docker is installed on this machine, but `supabase start` / `supabase db reset`
> are not executed per task restrictions (no deployment, no local stack startup).
> See `docs/local-development.md` for the exact command reference
> and `docs/testing.md` for what can be verified without starting Supabase.

## Environment setup

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

```powershell
cp .env.example .env
```

## Bootstrapping Mani (Platform Owner)

The first Platform Owner is Mani, provisioned through Supabase Auth using the secure,
idempotent bootstrap mechanism. See `docs/security.md` ("Bootstrap security") and
`docs/local-development.md` for the exact procedure. Mani's Auth user must be created and
email-verified locally before the bootstrap assigns the Platform Owner role.

## Directory layout

```text
infrastructure/supabase/
├── config.toml          local ports, auth, storage
├── README.md            this file
├── .env.example         local environment variables (copy to .env)
├── seed.sql             idempotent platform reference data
│
├── migrations/          platform migration SQL (Supabase CLI executes *.sql here)
│   ├── 001_extensions_private_schema_identity.sql
│   ├── 002_platform_rbac.sql
│   ├── 003_organizations.sql
│   ├── 004_organization_members_invitations.sql
│   └── 005_platform_owner_bootstrap.sql
│
├── scripts/             helper scripts
│   ├── bootstrap-platform-owner.sql   Platform Owner bootstrap (administrative)
│   └── README.md
│
├── tests/               database / RLS / integration tests
│   ├── static/            static verification tests
│   │   ├── verify-naming.mjs
│   │   ├── verify-migration-order.mjs
│   │   ├── verify-rls.mjs
│   │   ├── verify-security.mjs
│   │   ├── verify-no-commerce.mjs
│   │   └── verify-bootstrap.mjs
│   ├── database/
│   ├── rls/
│   └── integration/
│
├── docs/
    ├── architecture.md      Platform architecture and boundaries
    ├── database-schema.md   Every table, column, key, index, policy, function, trigger
    ├── security.md          RLS strategy, authorization model, secret management, bootstrap security
    ├── local-development.md PowerShell commands for setup, reset, shutdown
    └── testing.md           Static tests, database test notes, known limitations
```

## Documentation

| Document | Covers |
|---|---|
| `docs/architecture.md` | Platform architecture, identity boundaries, Platform Owner vs Organization Owner, DB ownership, provisioning boundaries |
| `docs/database-schema.md` | Every table, column, constraint, index, trigger, function, policy, RLS, naming convention |
| `docs/security.md` | RLS strategy, authorization model, SECURITY DEFINER functions, circular RLS fix, invitation validation, bootstrap security |
| `docs/local-development.md` | Exact PowerShell commands for environment setup, start, reset, stop, ports |
| `docs/testing.md` | Static verification tests, database test categories, known limitations, execution status |

## Preservation boundary

The default Commerce Template lives at the repository root in `templates/commerce/` and is
**not** part of this project. It is preserved byte-for-byte and is never installed into
this Platform DB.

Nothing in this directory is linked to a hosted Supabase project. Do not run
`supabase db push`, `supabase link`, or `supabase functions deploy` against any remote
environment.
