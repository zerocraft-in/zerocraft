# Zerocraft architecture

## Repository shape

```text
apps/
  store/       Customer storefront, cart, accounts and checkout (3001)
  cms/         Store administration and protected APIs (3002)
  studio/      Internal creative portfolio and CRM workspace (3003)
packages/
  supabase/    SQL schema, migrations, seed data and shared database helpers
  ui/          Shared UI primitives
scripts/
  release/     Build, route, environment and smoke checks
  security/    Static and unit security checks
docs/          Product, operations and architecture documentation
brand-kit/     Repository brand assets
```

## Runtime boundaries

1. A request reaches the matching Next.js app through its Vercel deployment or local port.
2. Host and path resolution select the store context. In multi-store mode, the request host must match the configured public registry.
3. Server routes resolve the authenticated user with Supabase SSR and enforce role, permission and store ownership before querying data.
4. Supabase is the system of record for commerce, identity, storage metadata and audit records. Service-role credentials are server-only.
5. The storefront reads public catalog data and performs checkout through server routes. The CMS owns administrative mutations. Studio owns its separate internal workspace.

## Data boundaries

- Public browser code may receive publishable Supabase configuration and public catalog content only.
- Server-only modules may use service-role credentials, encryption keys, provider credentials and database administration capabilities.
- Every store-scoped query must constrain the store identifier and the authenticated principal before read, update or delete.
- Storage objects follow the same boundary: public media may be served through the configured media domain; customer files and digital products require protected delivery.

## Change strategy

- Add schema changes as ordered SQL migrations under `packages/supabase/supabase/migrations`.
- Keep route contracts stable when moving UI between App Router segments.
- Put reusable UI in `packages/ui`; keep app-specific domain logic in the owning app.
- Run `npm run verify:release` before promoting a CMS change.
