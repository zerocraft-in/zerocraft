# Implementation Plan and Status

Last updated: 20 November 2026.

This document is the current repository audit and executable follow-up plan. It
remains the historical phase checklist; use it for the latest route, security,
API, cache, performance, and cleanup status.

This document is the delivery checklist. A phase is only marked complete when
its verification commands have actually run and passed.

---

## Phase 0 — Inspect and plan · Complete

| Deliverable | Location | Status |
| --- | --- | --- |
| Prototype inventory and design tokens | `docs/architecture/prototype-inspection.md` | done |
| Route and component mapping | `docs/architecture/prototype-mapping.md` | done |
| System architecture | `docs/architecture/system-architecture.md` | done |
| Database design | `docs/database/schema.md`, `relationships.md` | done |
| Security and RLS plan | `docs/security/rls-policies.md`, `authentication.md` | done |
| Business rules | `docs/business-rules/*.md` | done |
| Phased checklist | this document | done |

The prototype at `D:\projects\maara` was inspected and left untouched. It remains
the visual source of truth.

## Phase 1 — Project foundation · Complete with one environment blocker

| Deliverable | Evidence | Status |
| --- | --- | --- |
| pnpm monorepo | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | done |
| Next.js 16 app | `apps/admin`, Next 16.4.6, React 19.3.0 | done |
| TypeScript strict | `pnpm typecheck` passes | done |
| Tailwind CSS 4 | `@tailwindcss/postcss`, `globals.css` | done |
| Maara design tokens | Light/dark palette, semantic mapping | done |
| shadcn/ui foundation | Owned primitives in `components/ui` | done |
| Manrope | `next/font/google` variable font | done |
| Theme provider | next-themes, class strategy, system option | done |
| ESLint | `pnpm lint` passes | done |
| Dependencies pinned | Supabase, Zod, RHF, TanStack Table, Recharts, Sonner, date-fns, framer-motion | done |
| Money module | `lib/money.ts` + 19 Vitest cases | done |
| Vitest | `pnpm test` passes | done |
| Playwright config + smoke suite | 6 tests pass on desktop and mobile projects | done |
| Supabase project config | `supabase/config.toml`, `seed.sql` | done |
| Documentation set | `docs/**`, `README.md`, `SECURITY.md` | done |
| Production build | `pnpm build` passes | done |
| Audit Logs module | `apps/admin/src/app/(dashboard)/audit-logs/` | done — server page, TanStack Table, pagination, Owner/Admin only |
| Settings module | `apps/admin/src/app/(dashboard)/settings/` | done — org settings, timezone, GSTIN, invoice prefix |
| Locations module | `apps/admin/src/app/(dashboard)/locations/` | done — CRUD, user assignment, address UI fix |
| Button enhancements | `components/ui/button.tsx`, `button-slide-up.tsx` | done — `asChild` support, slide-up text effect |
| Settings sidebar header | `components/layout/sidebar/settings-sidebar.tsx` | done — inline slide-up "Settings → Back" with router.back |
| Local Supabase stack | Docker unavailable | **blocked** |

### Verification log (actual commands)

```text
pnpm --filter @maara/admin typecheck   → passed
pnpm --filter @maara/admin lint        → passed
pnpm --filter @maara/admin test        → 19 tests passed
pnpm --filter @maara/admin build       → compiled, 4 static pages generated
playwright test                        → 6 passed (desktop + mobile projects)
```

Browser checks against the dev server:

- no console errors or warnings on `/`;
- theme switch updates `<html class>`, persists `theme` in `localStorage`, and
  computes `#f6f6f7` / `#0d0e10` backgrounds correctly;
- no horizontal overflow at 390, 768, 1024, 1280 and 1440 CSS pixels;
- 3-column layout at ≥1024 px, single column below;
- screenshots captured at 1440 px (light and dark) and 390 px (light) confirm
  the approved typography, palette, borders and spacing.

### Deliberately deferred

- Dedicated `packages/contracts` and `packages/shared-types` packages. The
  workspace glob is reserved; empty packages were not created.
- shadcn components beyond button, card, badge, separator, skeleton and sonner.
  The rest arrive with the screens that use them.
- Any authentication, dashboard shell or business module.
- Any migration SQL. The 12 stages are designed but must be written against a
  running local database so filenames and verification are real.

## Phase 2 — Authentication and security foundation

Checklist:

- [ ] Install Docker Desktop, start the Supabase stack, confirm `supabase status`.
- [ ] Migration 001: extensions, `updated_at` trigger, numbering helper.
- [ ] Migration 002–003: organizations, stores, locations, profiles,
      memberships, roles, permissions, role permissions.
- [ ] Seed system roles and permission catalogue.
- [ ] Helper functions in `private`: `current_org_ids`, `authorized_org_ids`,
      `has_permission`.
- [ ] RLS on identity and tenancy tables.
- [ ] `createBrowserClient`, `createServerClient`, `admin` client modules.
- [ ] `src/proxy.ts` session refresh with Next 16 proxy conventions.
- [ ] `requireUser`, `requireOrganization`, `requirePermission`.
- [ ] Login, logout, forgot password, reset password pages.
- [ ] Organization onboarding RPC and page.
- [ ] Invitation creation, email, acceptance flow.
- [ ] Protected `(dashboard)` layout redirect.
- [ ] Security headers including a verified CSP.
- [ ] pgTAP/Vitest security suite from `docs/security/rls-policies.md`.
- [ ] Playwright: login, redirect, logout.

Exit criteria: unauthenticated and cross-tenant access is denied and proven by
executed tests.

## Phase 3 — Application shell and design conversion

- [x] Settings sidebar header with inline slide-up "Settings → Back" text and router.back navigation
- [ ] Sidebar (260 px / 72 px collapsed) with the 16 modules and active states.
- [ ] Header: breadcrumbs, search/command menu, store switcher, notifications,
      theme switch, profile menu.
- [ ] Mobile drawer below 960 px; tablet and mobile adaptations.
- [ ] Global command palette (Ctrl/Cmd + K).
- [ ] Shared components: `PageHeader`, `DataTable`, `EmptyState`,
      `ConfirmDialog`, `StatCard`.
- [ ] Fix the prototype's header search truncation below 1200 px.
- [ ] Verify 1440 / 1280 / 1024 / 768 / 390 in both themes.

## Phase 4 — Database and core business modules

Order of delivery (each with migrations, RLS, actions, tests):

1. Locations
2. Categories and brands
3. Products and variants
4. Suppliers
5. Customers
6. Inventory (adjustments, transfers, movements)
7. Purchases and receiving
8. Sales and returns
9. Expenses
10. Finance summary

Exit criteria: purchase receiving changes stock atomically; transfers are
traceable; sale completion deducts stock; every module has integration tests.

## Phase 5 — Overview, analytics and reports

- [ ] Real KPI queries with date range and location filters.
- [ ] Revenue trend, expense breakdown, top products, low stock.
- [ ] Analytics by channel, location, category, product.
- [ ] Eight reports with server-side CSV export.
- [ ] Loading skeletons, empty states and error boundaries on every screen.

## Phase 6 — Users, audit logs and settings

- [ ] Member list, invitations, role changes, deactivation.
- [ ] Privilege-escalation guards tested.
- [ ] Audit log viewer with filters (read-only).
- [ ] Organization settings, tax, invoice, currency, timezone, preferences.
- [ ] Storage policies verified for all four buckets.

## Phase 7 — Production readiness

- [ ] Full RLS and security audit.
- [ ] All migrations reproducible from empty.
- [ ] Unit, integration, security and E2E suites pass.
- [ ] Production build and responsive verification.
- [ ] Vercel configuration and Supabase production runbook.
- [ ] Backups, retention and monitoring documented.
- [ ] Explicit owner approval before any hosted resource is created.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Docker unavailable blocks all database verification | certain now | high | Install Docker before Phase 2; do not write unverifiable migrations as "done" |
| Windows Application Control blocks native pnpm | certain | medium | Use npm-installed pnpm 10 via PATH; document for all contributors |
| Scope of 16 modules is large | high | high | Strict phase gates; no module marked done without tests |
| RLS mistakes expose tenant data | medium | critical | Helper-function pattern, pgTAP cross-tenant tests, review checklist |
| Inventory races under concurrency | medium | high | Row locks and single-transaction RPCs; concurrency tests |
| Tax semantics differ by client | medium | high | Decisions D2 documented and confirmed before sales/purchases |
| Future POS/van clients need different contracts | medium | medium | Shared RPC boundaries and idempotency keys now |
| Font fetch fails offline | low | low | Self-host Manrope if the build environment loses network |

## Open decisions requiring confirmation

| # | Decision | Default in docs |
| --- | --- | --- |
| D1 | Store vs location boundary | Separate commercial store and stock location |
| D2 | Tax-inclusive pricing | Exclusive by default, configurable |
| D3 | Costing | Moving weighted average per location |
| D4 | Negative stock | Never allowed |
| D5 | Adjustment approval threshold | Above ₹10,000 value needs a second approver |
| D6 | Multi-currency | INR only in Phase 1 |

These do not block Phase 2, which is identity and tenancy only.
