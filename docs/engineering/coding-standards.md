# Coding Standards

These standards apply to all TypeScript/TSX source code in the Maara monorepo.
They are grounded in the existing implementation and enforced by ESLint and
TypeScript strict mode.

## General rules

1. **Inspect before editing.** Always read existing files and understand the
   current architecture before making changes.
2. **Never replace architecture unnecessarily.** Reuse existing components,
   design tokens, and patterns.
3. **Do not remove working functionality.** Even if code appears unused, verify
   before deleting.
4. **Use clean, reusable, production-ready components.** Avoid one-off
   implementations.
5. **Follow responsive-first development.** Verify at 390, 768, 1024, 1280, and
   1440 CSS pixels.

## TypeScript

- TypeScript strict mode is enabled. No `any` to bypass type errors.
- Prefer explicit types over `any` or implicit `any`.
- Server Components by default; `"use client"` only for interaction or browser
  APIs.
- Type-only imports use `import type` where appropriate.

## React

- Functional components with hooks. No class components.
- Server data is not mirrored into a global client store. Client state is
  limited to UI concerns.
- Mutations are Server Actions validated with Zod on the server.
- Every mutation resolves the organization from the session and re-checks
  permission in the database.
- Errors are mapped to safe, user-facing messages. No SQL or internal detail
  leaks.

## Styling

- Tailwind CSS 4 with shadcn/ui primitives.
- Use existing design tokens. Do not invent new colors, spacing, or radii.
- Dark theme uses `class="dark"` on `<html>` (next-themes), not `data-theme`.
- Line lengths < 80 characters for body text.

## Forms and validation

- React Hook Form with Zod resolvers.
- All server inputs validated with Zod; unknown fields rejected.
- Database errors mapped to stable, safe messages.

## Money

- Money is integer paise (`bigint`). No floating-point currency.
- Percentages are basis points (`int`, 10000 = 100%).
- Formatting only at presentation via `Intl.NumberFormat("en-IN")`.

## Testing

- Vitest for unit tests. Playwright for E2E tests.
- A test suite that has not been executed must not be reported as passing.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` before
  considering a change complete.

## File organization

- Domain features under `apps/admin/src/app/(dashboard)/<domain>/`.
- Shared UI under `apps/admin/src/components/ui/`.
- Layout under `apps/admin/src/components/layout/`.
- Shared lib under `apps/admin/src/lib/`.
