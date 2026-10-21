# CMS changelog

## 0.0.24 — 2026-10-21

### Added

- Catalog category/subcategory management workspace with hierarchy, search, archive, duplicate, media, and product-assignment flows.
- Inventory location and stock-level workspace with reorder-point support and audit events.
- CMS workspace surfaces for channels, scheduling, transactions, subscriptions, disputes, integrations, devices, time tracking, and release notes.
- Refined dashboard, settings, sidebar, header, store, product, order, appointment, client, work, and journal layouts.

### Changed

- CMS appearance defaults now use the reviewed light workspace presentation.
- Legacy unused storefront/demo assets were removed after reference scanning.
- Email delivery page lint issue was fixed before release.

## 0.0.23 — 2026-10-21

### Added

- Automated release preflight for migration naming, RBAC, and CMS type safety.
- Production smoke checks for login, protected routes, APIs, and worker secret boundaries.
- GitHub Actions CMS quality gate for pull requests and `main` pushes.
- Release checklist and operations runbook covering backups, monitoring, incident response, and rollback.

## 0.0.22 — 2026-10-21

- Added the complete `v0.0.21` release notes and deployment references to the CMS changelog.
- Documentation-only patch; no runtime behavior changed.

## 0.0.21 — 2026-10-21

### Added

- Production audit-log page with searchable activity history for Studio operations.
- Team access controls for role changes, suspension, reactivation, invitations, and audit logging.
- Automation health monitoring with scheduled low-stock sync status and manual sync support.
- System Health center covering database, schema, scheduled jobs, SMTP, storage, deployment, failures, incident history, and exports.
- Notification history, user preferences, unread/read analytics, filtering, CSV/PDF export, and weekly report delivery workflow.
- Global in-app notification panel and automation failure alert support.

### Security and reliability

- Added role-aware route and API protection for Admin, Manager, Staff, and suspended accounts.
- Suspended accounts are blocked at login with a clear banned-user response.
- Controlled test email and automation events are isolated from production health metrics.
- Added audit entries for team access changes and system-health acknowledgements.
- Verified production deployment, RBAC checks, CMS typecheck, audit log loading, suspension, and reactivation flows.

### Release

- Git commit: `e4326ac`
- Git tag: `v0.0.21`
- Production deployment: Vercel deployment `D5D6HxVMzGL2awYoBCAbMEL7WF2L`

## 2026-10-20 — working-tree catalog and shell pass

### Added

- Category and subcategory management workspace with hierarchy/list views.
- Category image upload endpoint and preview workflow.
- Category item assignment/unassignment API support.
- Dashboard workspace setup checklist and progress indicator.
- Collapsible studio navigation groups.
- Keyboard navigation for shell search results.
- Category CRUD reference recording under `apps/cms/ref`.

### Changed

- CMS shell and sidebar styling moved toward a lighter workspace presentation.
- Dashboard, works, blogs, clients, appointments, appearance, product editor, and table presentation were refreshed.
- Store categories route now uses the dedicated category manager.
- Legacy GSAP mobile-menu implementation was removed from the studio shell.

### Reference-aligned shell update

- Increased the desktop navigation rail to 280px.
- Added account identity and setup-progress treatment to the rail.
- Added Channels/Storefront, notification/help utility controls, and a persistent Take payment action.
- Updated global header/content offsets so the layout is consistent on categories, reports, and the other CMS routes.

### Removed in working tree

- Legacy public brand assets, store art, demo images, patterns, wordmarks, and storefront HTML under `apps/cms/public`.

### Known issues

- Some deleted public assets remain referenced by active store components.
- Typecheck is blocked by missing UI modules imported by orphaned landing-page sections.
- Category assignment and product taxonomy persistence are not transactionally grouped.

## Prior repository milestones

- `96cae70` — `v.0.0.20` current base commit.
- `a8fb1b9` — keep `www` studio host canonical.
- `2c9fd6d` — fix published work status form typing.
- `fbe3f64` — prepare ZeroCraft 0.0.18 release.
- `1208c59` — redesign ZeroCraft store experience.
- `2355714` / `5b59229` — v0.0.17 release work.

For exact historical detail, use `git log --stat` and `git show <commit>`; this report intentionally summarizes only CMS-relevant milestones.
