# Zerocraft Platform — Architecture

## Overview

This directory is the **Zerocraft Platform control-plane database** local Supabase project.

It holds only Zerocraft Platform data: platform users, platform staff, organizations,
organization memberships, platform and organization roles/permissions, invitations, and
related access control. It is operated by Zerocraft.

Customer commerce data lives in **customer-owned Supabase projects**, never here. Each
customer store gets its own independent Supabase project provisioned by the Zerocraft
provisioning system (future work, not part of this foundation).

## Platform DB vs customer-owned DBs

| Concern | Platform DB (this project) | Customer-owned Supabase project |
|---|---|---|
| Platform users / profiles | Yes | No |
| Platform staff / members | Yes | No |
| Platform roles / permissions | Yes | No |
| Organizations | Yes | No |
| Organization members | Yes | No |
| Organization invitations | Yes | No |
| Stores (directory only) | Planned | No |
| OAuth / integration connections | Planned | No |
| Provisioning jobs | Planned | No |
| Platform billing | Planned | No |
| Catalog / products | No | Yes (Commerce Template) |
| Inventory / orders / customers | No | Yes |
| Payments | No | Yes |

No commerce data ever lives in the Platform DB. No Platform data ever lives in a customer
project.

The Commerce Template (`templates/commerce/` at repository root) is installed only into
customer-owned projects — never into this Platform DB. It is preserved byte-for-byte.

## Identity boundaries

- **Supabase Auth** is the identity provider. `auth.users` is never duplicated.
- `public.platform_users` has a one-to-one foreign key to `auth.users(id)`. It stores
  platform-specific profile data only (full name, phone, avatar path, email cache).
- Email lives in `auth.users` only and is never trusted from client-supplied data.

## Platform Owner vs Organization Owner

| | Platform Owner | Organization Owner |
|---|---|---|
| Scope | Entire Zerocraft Platform | Single organization |
| RBAC system | `platform_roles` / `platform_permissions` | `organization_roles` / `organization_permissions` |
| Highest role | `platform_owner` (rank 100) | `owner` (rank 100) |
| Membership table | `platform_members` | `organization_members` |
| How assigned | Secure bootstrap mechanism (future) | `create_organization` RPC (atomic onboarding) |

The two RBAC systems are completely separate. A Platform Owner is not automatically an
Organization Owner, and vice versa.

## Platform vs customer database ownership

- **Platform DB**: Central multi-tenant control plane. Operated by Zerocraft.
  - Holds users, organizations, memberships, invitations, RBAC.
  - Does NOT hold catalog, inventory, orders, customers, or payments.
- **Customer-owned Supabase projects**: One per store. Operated by the tenant.
  - Holds the Commerce Template (catalog, inventory, orders, customers, payments, etc.).
  - Template installed via the provisioning system (future work).

## Store-level infrastructure isolation (planned, not implemented)

Each store must have its own independent customer-owned Supabase project and its own
independent Cloudinary connection. These are tracked in the Platform DB via planned
tables (`supabase_connections`, `tenant_databases`) but are not part of this foundation.

## Provisioning boundaries (planned, not implemented)

Provisioning creates a customer-owned Supabase project for a store, installs the
versioned Commerce Template, initializes tenant context, runs verification, and activates
the tenant. This is future work. The platform-side foundation (organizations, members,
invitations, RBAC) is what this setup implements.

## Implemented vs planned vs not verified

| Area | Status |
|---|---|
| Extensions (`pgcrypto`, `citext`) | Implemented |
| `private` schema with security helpers | Implemented |
| `platform_users`, `user_preferences` | Implemented |
| Platform RBAC (roles, permissions, members) | Implemented |
| Platform RBAC seed data | Implemented |
| Organizations | Implemented |
| Organization RBAC (roles, permissions) | Implemented |
| Organization RBAC seed data | Implemented |
| Organization members | Implemented |
| Organization invitations | Implemented |
| Organization RPCs (create, invite, accept, change role) | Implemented |
| RLS on all platform tables | Implemented |
| Circular RLS dependency fix | Implemented |
| Platform Owner bootstrap (Mani) | Implemented (migration 005) |
| Stores | Planned (migration 006+) |
| Store integrations / connections | Planned (migration 007+) |
| Provisioning jobs | Planned (migration 008+) |
| Platform billing | Planned (migration 009+) |
| Audit logs | Planned (migration 010+) |
| Live database testing (Docker installed, not executed per task restrictions) | Not verified |
| RLS execution tests | Not executed |

## Directory layout

```text
infrastructure/supabase/
├── config.toml          local ports, auth, storage
├── README.md            this file
├── .env.example         local environment variables (copy to .env)
├── seed.sql             reserved (empty; reference data seeded in migrations)
│
├── migrations/          platform migration SQL
│   ├── 001_extensions_private_schema_identity.sql
│   ├── 002_platform_rbac.sql
│   ├── 003_organizations.sql
│   ├── 004_organization_members_invitations.sql
│   └── 005_platform_owner_bootstrap.sql
│
├── docs/
│   ├── architecture.md      this file
│   ├── database-schema.md   every table, column, key, index, policy
│   ├── security.md          RLS strategy, authorization, bootstrap
│   ├── local-development.md PowerShell commands
│   └── testing.md           static tests, execution notes
│
├── scripts/             helper scripts
│   ├── bootstrap-platform-owner.sql   Platform Owner bootstrap (administrative)
│   └── README.md
│
├── tests/               static and database tests
│   ├── static/            static verification tests
│   │   ├── verify-naming.mjs
│   │   ├── verify-migration-order.mjs
│   │   ├── verify-rls.mjs
│   │   ├── verify-security.mjs
│   │   ├── verify-no-commerce.mjs
│   │   └── verify-bootstrap.mjs
│   └── ...
│
└── templates/           (not present — commerce template is at repo root)
```

## Preservation boundary

The default Commerce Template lives at the repository root in `templates/commerce/` and is
**not** part of this project. It is preserved byte-for-byte and is never installed into
this Platform DB.

Nothing in this directory is linked to a hosted Supabase project. Do not run
`supabase db push`, `supabase link`, or `supabase functions deploy` against any remote
environment.
