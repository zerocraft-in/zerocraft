# CMS release checklist

## Before release

- Review the working tree and exclude local environments, exports and generated output.
- Run `npm run verify:release`.
- Run `npm run build:cms` in a clean environment.
- Apply pending migrations with `npx supabase db push --workdir packages/supabase`.
- Verify Vercel Production/Preview secrets, domains and worker schedules.
- Confirm a backup and a tested rollback deployment are available.

## Production smoke test

- Sign in as each supported role and verify the expected permissions.
- Confirm protected pages and APIs return `401` without a session.
- Confirm store switching cannot cross project or host boundaries.
- Verify dashboard, catalog, orders, content, settings, audit and system health.
- Verify failed login, sign-out, session expiry and email verification behavior.
- Run one controlled catalog read and mutation, then restore the recorded baseline.

## Evidence and rollback

Record commit SHA, deployment URL, migration status, verification output and smoke results. Roll back the application to the previous verified deployment when needed; repair applied database changes with a forward migration.
