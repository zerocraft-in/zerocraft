# Maara Merch

Multi-tenant retail management SaaS for clothing businesses — products, stock,
purchasing, sales, expenses and finance in one admin application.

**Current status: Phase 1 foundation — active implementation.** The repository
contains a buildable Next.js 16 admin application with the dashboard shell,
authentication flows, settings, products, media, locations, users and audit-log
surfaces in active development. Database/RLS verification and production
hardening remain incomplete. See `docs/development/implementation-plan.md` for
the current audit, risks and delivery plan.

**Not production-ready.** No authentication or RLS implementation exists yet.
No migration has been applied or tested (Docker is unavailable on the current
development machine, so the local Supabase stack cannot start). Nothing in this
repository should be treated as production-ready until Phase 7 is complete.

---

## Repository layout

```text
maara-merch/
├── README.md               # This file
├── CONTRIBUTING.md         # Contribution guidelines
├── CHANGELOG.md            # Release history
├── SECURITY.md             # Security policy and vulnerability reporting
├── package.json            # Workspace root scripts and dependencies
├── pnpm-workspace.yaml     # pnpm workspace globs
├── pnpm-lock.yaml          # Locked dependency tree
├── .env.example            # Environment variable names (no secrets)
├── .gitignore
├── skills-lock.json        # Installed agent skill versions
│
├── apps/                   # Applications
│   ├── admin/              # @zerocraft/admin — Commerce administration (Next.js 16)
│   └── accounts/           # @zerocraft/accounts — Central authentication (Next.js)
│
├── packages/               # Shared libraries and configs
│   ├── ui/                 # @zerocraft/ui — Shared shadcn/ui components
│   ├── auth-core/          # @zerocraft/auth-core — Auth, session, RBAC primitives
│   ├── utils/              # @zerocraft/utils — INR formatting, SKU helpers
│   ├── validators/         # @zerocraft/validators — Shared Zod schemas
│   ├── eslint-config/      # @zerocraft/eslint-config — Shared ESLint flat config
│   ├── tsconfig/           # @zerocraft/tsconfig — Shared TypeScript presets
│   └── mcp/                # @zerocraft/mcp — MCP server for Maara tools
│
├── workers/                # Independently deployable Cloudflare Workers
│   ├── tenant-provisioner/ # @zerocraft/tenant-provisioner — Tenant provisioning
│   ├── public-cdn/         # @zerocraft/public-cdn — Public CDN edge gateway
│   └── taxonomy/           # @zerocraft/taxonomy — Taxonomy import Worker
│
├── templates/              # Customer-owned schema templates
│   └── commerce/           # @zerocraft/commerce-template — Tenant commerce schema
│
├── infrastructure/         # Infrastructure configuration
│   └── supabase/           # Local Supabase project (config, migrations, tests)
│
├── tooling/                # Repository scripts and validation
│   └── scripts/
│
└── docs/                   # Technical documentation
    ├── getting-started/
    ├── architecture/
    ├── engineering/
    ├── infrastructure/
    ├── security/
    ├── business-rules/
    ├── reference/
    ├── runbooks/
    ├── staging-security-readiness.md
    └── ...
```

## Technology stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript strict
- **Styling:** Tailwind CSS 4, shadcn/ui (owned primitives), Lucide icons
- **Typography:** Manrope (display), Inter/system-ui (body)
- **Forms:** React Hook Form, Zod validation
- **Tables:** TanStack Table v8
- **Charts:** Recharts v2
- **Dates:** date-fns
- **Notifications:** Sonner
- **Animations:** Framer Motion
- **Backend:** Supabase (Postgres, Auth, Storage, RLS), `@supabase/ssr`
- **Testing:** Vitest (unit), Playwright (E2E)
- **Package manager:** pnpm 10.18.3
- **Runtime:** Node.js ≥ 22

Exact versions are pinned in `apps/admin/package.json`, `package.json`, and the
lockfile.

## Quick start

```powershell
# Windows: pnpm is installed via npm; add to PATH for the session
$env:PATH = "$env:APPDATA\npm;" + $env:PATH
pnpm install
pnpm dev                                     # http://localhost:3000
```

Checks:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Database (requires Docker Desktop, which is not installed on this machine):

```powershell
pnpm exec supabase start
pnpm db:reset
```

See `docs/getting-started/development-setup.md` for environment variables, ports
and the Windows pnpm caveat.

## What is implemented

| Area | State |
| --- | --- |
| pnpm monorepo + pinned dependencies | done |
| TypeScript strict, ESLint, production build | done |
| Maara light/dark tokens, Manrope, theme provider | done |
| Base UI primitives (button, card, badge, separator, skeleton, sonner) | done |
| Integer-paise money module + unit tests | done |
| Foundation status page, responsive and themed | done |
| Auth, tenancy, RLS, migrations | designed, not implemented |
| Dashboard shell and core modules | documented, not implemented |
| Supabase local stack | blocked (Docker unavailable) |

Every "not implemented" item is labelled as such. No button pretends to save
data, and there is no hardcoded demo dataset outside seed files.

## Product scope

Phase 1 covers the admin application only. The future Maara POS (Flutter), Maara
Van Sales (offline-first) and Maara Storefront (Next.js) are not part of this
phase, but the schema, channel model, RPC boundaries and idempotency rules are
designed so they can share the same backend.

Key rules that will not be relaxed:

- Money is integer paise; no floating-point currency.
- Inventory is movement-first and immutable; balances are derived.
- Purchase orders never move stock — only confirmed goods receipts do.
- Every organization-owned row is protected by RLS and server-side permission
  checks.
- No production secrets in the repository, no production database change without
  approval.

## Documentation navigation

| Section | Location | Purpose |
| --- | --- | --- |
| Getting started | `docs/getting-started/` | Setup, environment variables, common commands |
| Architecture | `docs/architecture/` | Monorepo structure, package boundaries, system flows |
| Engineering | `docs/engineering/` | Coding standards, shared UI, styling, testing |
| Infrastructure | `docs/infrastructure/` | Database architecture, Supabase, Cloudflare Workers, deployment |
| Security | `docs/security/` | Authentication, authorization, tenant isolation, secrets |
| Business rules | `docs/business-rules/` | Sales, purchases, inventory, finance |
| Reference | `docs/reference/` | API reference, workspace commands, troubleshooting |
| Runbooks | `docs/runbooks/` | Provisioning and recovery procedures |
| Staging security | `docs/staging-security-readiness.md` | Staging security procedure |

See also:

- `SECURITY.md` — Security policy and vulnerability reporting
- `CHANGELOG.md` — Release history
- `docs/design/maara-merch-design-plan.md` — Frontend design plan
- `docs/staging-security-readiness.md` — Staging security procedure

## Known blockers

1. **Docker Desktop is not installed.** The local Supabase stack cannot start,
   so no migration, RLS policy or auth flow has been executed or tested.
2. **Windows Application Control blocks native pnpm.** Use the npm-installed
   pnpm 10 through `%APPDATA%\npm` (see `docs/getting-started/development-setup.md`).
3. **Hosted environments do not exist.** No Vercel project, Supabase hosted
   project, domain or CI pipeline has been created.

## Licence

Proprietary. All rights reserved.
