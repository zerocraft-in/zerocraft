# Zerocraft CMS documentation

The CMS is the authenticated administration surface for products, orders, inventory, customers, content, sales channels, settings and operational health.

## Guides

| Guide | Scope |
| --- | --- |
| [Architecture](./architecture.md) | App Router shell, settings routes and route boundaries |
| [Product scope](./product-scope.md) | Implemented CMS surfaces and explicit future work |
| [Content workspaces](./content-workspaces.md) | Metaobjects, files, menus and articles |
| [Multi-store setup](./multi-store-setup.md) | Host resolution, isolated Supabase projects and onboarding |
| [Database schema](./database-schema.md) | Schema source of truth and safe inspection workflow |
| [Cloudflare R2](./cloudflare-r2-setup.md) | Public media migration and protected file boundaries |
| [Operations runbook](./operations-runbook.md) | Backups, monitoring and incident response |
| [Release checklist](./release-checklist.md) | Quality gate and production smoke checks |

## Status vocabulary

- **Implemented** — present in source, routed and covered by the relevant checks.
- **Partial** — code exists but an integration, migration or workflow is incomplete.
- **Planned** — documented future work with no claim of current availability.
- **Risk** — requires explicit review before production use.
