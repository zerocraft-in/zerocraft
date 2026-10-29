# Zerocraft CMS UI implementation plan

## Audit baseline — 2026-10-29

The CMS currently has a working authenticated shell, role-aware navigation, content operations, commerce workspaces, email, notifications, automation health, system health, audit logs, and a live Apps & Integrations hub. The production build and release contract checks pass.

## Delivery status

| Phase | Status | Notes |
|---|---|---|
| Stabilise operating surface | Complete | Route contracts, protected shell, audit log, recycle bin, and shared shadcn primitives are in place. |
| Apps & integrations hub | Code complete | Registry API, migration, provider details dialog, live health checks, and safe enable/disable controls are implemented. Provider credentials and production migration still require deployment setup. |
| Lead/client operating system | Code complete | Unified lead table/API, stage pipeline UI, source/UTM fields, and client/WhatsApp/email handoff foundations are implemented. |
| Project delivery workspace | Code complete | Project table/API, status workflow, milestone table/API, and delivery workspace UI are implemented. |
| Growth/reporting | Search Console connected in CMS; provider authorization required | Search Console has a dedicated feature flag, OAuth connection, encrypted refresh-token storage, read-only query reporting, daily click trends, and sitemap health. GA4 remains provider-pending. |

## Phase 1 — Stabilise the operating surface

- Keep one consistent shadcn visual language across cards, tables, filters, empty states, dialogs, and forms.
- Add shared page primitives for title blocks, query/filter bars, loading states, error states, pagination, and destructive confirmations.
- Fix remaining navigation labels and legacy links so every visible action lands on a real route.
- Add an admin-only workspace health summary for database, email, automation, storage, and integration registry status.

Acceptance: every sidebar item has a real route, every data screen has loading/error/empty states, and no page exposes a dead primary action.

## Phase 2 — Apps & integrations hub

- Apply the integration registry migration.
- Persist enabled/disabled provider state through `/api/studio/integrations`.
- Add provider detail drawers with configuration requirements, scopes, last verification, and safe disconnect controls.
- Connect Gmail first using the existing OAuth and encrypted token flow.
- Add WhatsApp webhook health and delivery history.

Acceptance: an admin can see which connections are configured, enable or disable a provider, reconnect safely, and inspect the last health result without seeing secrets.

## Phase 3 — Lead and client operating system

- Convert website form submissions and WhatsApp fallbacks into a unified lead inbox.
- Add lead stages: New, Contacted, Qualified, Proposal, Won, Lost.
- Add source/UTM, service interest, owner, next action, and activity timeline fields.
- Add quick actions for email, WhatsApp, appointment, and proposal creation.

Acceptance: one enquiry can be followed from first click through client conversion without copying data between screens.

## Phase 4 — Project delivery workspace

- Add project status, milestones, deliverables, files, approvals, comments, and due dates.
- Connect projects to clients, works, appointments, invoices, and communication history.
- Add board/list/calendar views with role-aware actions.

Acceptance: each active project has one source of truth for progress, assets, approvals, and next actions.

## Phase 5 — Growth and reporting

- Connect GA4 with read-only reporting; Search Console now uses a read-only Google OAuth flow and dedicated reporting page.
- Add campaign and UTM performance cards to the dashboard.
- Add Google Business Profile verification/review tracking once API access is available.
- Add exportable weekly studio reports with lead, project, revenue, traffic, and review metrics.

Acceptance: reports distinguish live connected data from unavailable providers and show the data freshness timestamp.

## Required external setup

- Apply the integration registry Supabase migration.
- Confirm production environment variables and redirect URLs.
- Configure provider credentials for Gmail, WhatsApp Cloud API, GA4, Search Console OAuth, Instagram, and Google Business Profile. Search Console requires `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_SEARCH_CONSOLE_SITE_URL`, `GOOGLE_SEARCH_CONSOLE_REDIRECT_URI`, and `STUDIO_CREDENTIALS_ENCRYPTION_KEY`.
- Run the protected production smoke suite after migrations are applied.

The lead, project, and growth code paths are now implemented. Only external provider activation and production migration execution remain environment-specific.
