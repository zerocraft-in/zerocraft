# Contributing to Maara Merch

Thank you for contributing to Maara Merch. This document describes how to work
with the repository.

## Getting started

1. Clone the repository.
2. Install dependencies:

   ```powershell
   $env:PATH = "$env:APPDATA\npm;" + $env:PATH
   pnpm install
   ```

3. Run the verification suite:

   ```powershell
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```

See `docs/getting-started/development-setup.md` for full setup instructions,
including the Windows pnpm caveat and Supabase local stack requirements.

## Making changes

1. **Inspect before editing.** Read existing files and understand the current
   architecture before making changes.
2. **Never replace architecture unnecessarily.** Reuse existing components,
   design tokens, and patterns.
3. **Do not remove working functionality.** Verify before deleting.
4. **Use clean, reusable, production-ready components.**
5. **Follow responsive-first development.** Verify at 390, 768, 1024, 1280, and
   1440 CSS pixels.
6. **No `any` to bypass TypeScript errors.**
7. **No eslint-disable comments as shortcuts.** Fix underlying issues.

## Documentation

All source-code-related documentation lives in `docs/`. When changing behavior,
update the corresponding documentation:

| Area | Document |
| --- | --- |
| Architecture | `docs/architecture/` |
| Engineering standards | `docs/engineering/` |
| Infrastructure | `docs/infrastructure/` |
| Security | `docs/security/` |
| Business rules | `docs/business-rules/` |
| Reference | `docs/reference/` |

## What not to do

- Do not modify database schemas or migrations without explicit approval.
- Do not change Supabase authentication or RLS policies without review.
- Do not change API contracts without coordination.
- Do not deploy anything without explicit owner approval.
- Do not commit secrets, credentials, or `.env.local`.

## Commit guidelines

- Make the smallest safe change.
- Verify with `typecheck`, `lint`, `test`, and `build` before committing.
- Never commit, push, or deploy unless explicitly asked.
- Do not touch production Supabase without explicit authorization.

## Questions

Open a discussion or contact the project owner. Do not open public issues for
security problems — see `SECURITY.md` for private reporting.
