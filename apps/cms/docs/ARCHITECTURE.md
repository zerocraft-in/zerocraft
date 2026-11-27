# CMS architecture

This app uses Next.js App Router with `/studio/*` as the canonical workspace URL family.

## Source order

```text
app/              Route entry points, layouts, route handlers, and page composition
components/
  ui/             Shared shadcn/Base UI primitives
  layout/         Global shell and page chrome
  navigations/    Workspace/sidebar navigation
  providers/      Client providers
  auth/           Auth-specific UI
  studio/         Studio feature UI and workspace controls
hooks/            Reusable client hooks
lib/
  data/           Server data access and domain data
  commerce/       Store and commerce domain helpers
  email/          Gmail/email integration helpers
  analytics/      Analytics integration helpers
  search-console/ Search Console integration helpers
  notifications/ Notification domain helpers
  storage/        Storage abstraction
  r2/             Cloudflare R2 implementation
  cloudinary/     Cloudinary implementation
store/            Client-side state only
types/            Shared TypeScript declarations
utils/            Small cross-cutting utilities
public/           Static assets
docs/             CMS-only architecture and setup notes
```

## Route rule

Feature implementations live in the root route folders under `app/`. The `/studio/*` folders are workspace aliases that re-export those implementations so the existing workspace navigation remains stable. New Studio features should keep one implementation and add an alias only when the workspace URL is required.

## Dependency rule

- `app` may import from `components`, `hooks`, `lib`, `store`, `types`, and `utils`.
- `components` may import from `hooks`, `lib`, `store`, `types`, and `utils`.
- `lib` must not import from `app` or UI components.
- `components/ui` must remain domain-agnostic.
- API route handlers belong under `app/api`; integration logic belongs under `lib`.
- Generated folders such as `.next*`, `.turbo`, and `*.tsbuildinfo` are never source files.

## Naming boundaries

- `Portfolio works` means public-facing portfolio content.
- `Client projects` means internal delivery and project management.
- `Studio journal` means internal editorial/operational notes.
- `Blog posts` means publishable website articles.
- Store routes and Studio routes should not share domain-specific components unless the component is explicitly marked shared.
