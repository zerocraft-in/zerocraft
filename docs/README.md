# Maara Merch — Documentation

This directory contains all technical documentation for the Maara Merch
monorepo. Every document is grounded in the current implementation; nothing is
documented as completed unless it exists in source code.

## How to use this documentation

- **New to the project?** Start with
  `getting-started/development-setup.md`.
- **Understanding the architecture?** Read
  `architecture/monorepo-structure.md` and
  `architecture/system-architecture.md`.
- **Implementing a feature?** Check
  `business-rules/` for domain rules and
  `engineering/coding-standards.md` for engineering rules.
- **Deploying?** Read
  `deployment/vercel-supabase.md` and
  `runbooks/provisioning-recovery.md`.
- **Security questions?** Start with
  `security/authentication.md` and
  `security/rls-policies.md`.

## Documentation structure

```text
docs/
├── README.md               # This file
├── getting-started/
│   ├── development-setup.md
│   ├── environment-variables.md
│   └── common-commands.md
├── architecture/
│   ├── overview.md
│   ├── monorepo-structure.md
│   ├── application-boundaries.md
│   ├── package-architecture.md
│   ├── system-flows.md
│   ├── system-architecture.md
│   ├── prototype-mapping.md
│   ├── prototype-inspection.md
│   ├── database-ownership.md
│   ├── tenant-provisioning.md
│   ├── public-cdn.md
│   └── commerce-template.md
├── engineering/
│   ├── coding-standards.md
│   ├── shared-ui.md
│   ├── styling-and-theming.md
│   └── testing-and-quality.md
├── infrastructure/
│   ├── database-architecture.md
│   ├── cloudflare-workers.md
│   └── supabase/
│       └── README.md
├── security/
│   ├── authentication.md
│   ├── rls-policies.md
│   ├── secrets-management.md
│   └── supabase-oauth.md
├── business-rules/
│   ├── sales.md
│   ├── purchases.md
│   ├── inventory.md
│   └── finance.md
├── reference/
│   ├── api-reference.md
│   └── troubleshooting.md
├── runbooks/
│   └── provisioning-recovery.md
├── staging-security-readiness.md
└── design/
    └── maara-merch-design-plan.md
```

## Co-located documentation

Some documentation lives outside `docs/` because it is tied to a specific part
of the repository:

- `README.md` — Repository overview and quick start
- `CONTRIBUTING.md` — Contribution guidelines
- `CHANGELOG.md` — Release history
- `SECURITY.md` — Security policy and vulnerability reporting
- `packages/README.md` — Shared packages reference
- `apps/admin/README.md` — Admin application reference
- `infrastructure/supabase/README.md` — Local Supabase project reference
- `templates/commerce/README.md` — Commerce template reference

## Document status

Documents marked **design** describe planned behavior that has not yet been
implemented. Documents marked **implemented** describe existing source code.
Documents marked **historical** record completed work or audits.

No document should be treated as authoritative for runtime behavior — always
verify against the actual source code and configuration files.
