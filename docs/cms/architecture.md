# CMS application architecture

## Shell ownership

- `app/layout.tsx` owns the document, providers and global appearance.
- `app/cms-frame.tsx` selects the authenticated administration shell.
- `app/studio-shell.tsx` owns the global sidebar and top bar.
- `app/settings/` owns settings navigation and nested section routes.
- `app/@modal/` contains intercepted quick-create modal routes.
- `app/(admin)/` is the safe route-group boundary for future migrations; existing URLs remain stable.

## Request and authorization flow

1. `proxy.ts` handles request-level routing and session refresh behavior.
2. Server components and route handlers resolve the authenticated user through Supabase SSR.
3. Permission helpers enforce role capabilities before returning data or performing mutations.
4. Store-scoped queries include the resolved store context and ownership constraints.
5. Mutations validate same-origin requests where required and write audit/operational evidence.

## URL contract

The existing CMS paths remain stable: `/`, `/orders`, `/products`, `/inventory`, `/content`, `/settings`, `/store/[slug]` and Point of Sale routes. Nested settings paths such as `/settings/general` are canonical; the legacy `?section=` query remains supported for compatibility.

When adding a route, update the route contract checker and the release checklist if it changes an operational or privileged flow.
