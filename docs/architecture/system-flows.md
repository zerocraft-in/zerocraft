# System Flows

This document describes request flows and rendering rules for the Maara admin
application.

## Application architecture (admin)

```text
apps/admin/src
├── app/(auth)/…                # Unauthenticated routes
├── app/(dashboard)/…           # Authenticated shell + pages
├── components/
│   ├── ui/                     # shadcn primitives (owned, restyled)
│   ├── layout/                 # Sidebar, topbar, command menu, theme
│   ├── dashboard/              # KPI, chart cards, activity feed
│   └── shared/                 # DataTable, PageHeader, EmptyState, ConfirmDialog
├── features/<domain>/
│   ├── queries.ts              # Server-only reads (React cache where useful)
│   ├── actions.ts              # "use server" mutations, Zod validated
│   ├── schema.ts               # Domain Zod schemas
│   └── components/             # Domain-specific UI
├── lib/
│   ├── supabase/               # Browser client, server client, admin client
│   ├── auth/                   # Session helpers, requireUser, requireOrg
│   ├── permissions/            # Permission keys + server checks
│   ├── security/               # Headers, redirect validation, rate limits
│   └── validation/             # Shared primitives (money, ids, pagination)
├── hooks/
├── types/
└── tests/
```

## Rendering rules

- **Server Components by default.** `"use client"` only for interaction or
  browser APIs.
- **Reads happen in server components/queries**, never in client effects for
  first paint.
- **Mutations are Server Actions** (or Route Handlers for downloads/webhooks),
  validated with Zod on the server. Every mutation resolves the organization
  from the session and re-checks permission in the database.
- **Client state is limited to UI concerns.** Server data is not mirrored into
  a global store.

## Request flow for a mutation

1. Server Action receives `FormData` or a typed payload.
2. Zod schema validates shape and bounds.
3. `requireOrganization()` resolves the active organization from the verified
   session, never from a client-supplied id.
4. Permission check runs server-side (`has_permission(org, key)`).
5. Database function performs the atomic transaction (stock changes, receiving,
   refunds).
6. Audit entry is written by the database function.
7. `revalidatePath` / route refresh; the UI receives a typed result.
8. Errors are mapped to safe, user-facing messages; no SQL or internal detail
   leaks.

## Multi-tenancy flow

```text
Request arrives
    │
    ▼
Proxy (src/proxy.ts) — optimistic redirect + cookie refresh
    │
    ▼
Server Component / Server Action
    │
    ├── requireUser() — validates JWT, refreshes cookies
    │
    ├── requireOrganization() — resolves active org from memberships
    │                            (re-validated against DB on every request)
    │
    ├── requirePermission(key) — checks roles/permissions tables
    │
    ▼
Database function (security definer, private schema)
    │
    ├── Verifies membership and permission
    │
    ├── Performs atomic transaction
    │
    └── Writes audit entry
    │
    ▼
Safe typed result returned to UI
```

## Authentication and authorization flow

- **Login:** User submits email + password to a Server Action → Zod validates →
  `signInWithPassword` on server client → cookies written → redirect to
  validated `next` path (default `/overview`). Generic failure message (no
  account enumeration). Rate-limited per IP + email.
- **Logout:** Server Action calls `signOut()`, clears Supabase cookies,
  redirects to `/login`.
- **Forgot password:** Always returns the same confirmation message (no account
  enumeration). `resetPasswordForEmail` sends a link to `/auth/callback`.
- **Session refresh:** Proxy runs on dashboard and auth routes, refreshes
  expired tokens, passes updated cookies to the response. If refresh fails,
  cookies are cleared and user is redirected to `/login?next=<path>`.
- **Protected routes:**
  - `(dashboard)/*` — authenticated user + active organization membership
  - `/onboarding` — authenticated user with no membership
  - `(auth)/*` — unauthenticated; authenticated users redirected to `/overview`
  - `/auth/callback` — valid PKCE code or token hash

## Cookie and session policy

- Cookies are `HttpOnly`, `Secure` in production, `SameSite=Lax`.
- No auth token is written to `localStorage`.
- Supabase session cookie is refreshed by proxy; long-lived pages revalidate
  through server calls.
- `next` redirect parameters are validated to be same-origin relative paths to
  prevent open redirects.
- Auth errors never include SQL, stack traces, or whether an email exists.

## Integrations and background work

- **Email:** Supabase Auth templates for invitations and password reset in
  Phase 2; transactional email provider can be added without changing domain
  code.
- **Exports:** CSV generated server-side from the same query builder as the
  on-screen report, streamed from a Route Handler. PDF deferred until CSV
  accuracy is proven.
- **Notifications:** Derived from data (low stock, pending receiving) in Phase
  4; persisted `notifications` rows only if per-user read state is required.
- **Scheduled jobs:** Supabase `pg_cron` candidates, introduced only with a
  documented need.

## Non-goals for Phase 1

- POS billing screens, receipt printing, cash drawers
- Van route planning, vehicle tracking, offline sync
- Customer storefront, payments, shipping
- Real-time dashboards (queries are request-time and revalidated)
- Analytics warehouse / BI export pipeline
