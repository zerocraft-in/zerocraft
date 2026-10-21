# ZeroCraft CMS release checklist

## Before release

- Confirm the working tree is reviewed and unrelated changes are excluded.
- Run `npm run verify:release`.
- Run `npm run build:cms` in a clean environment.
- Apply Supabase migrations with `npx supabase db push --workdir packages/supabase`.
- Verify Vercel environment variables and cron routes.
- Confirm backup availability and the rollback commit/tag.

## Production smoke test

- Run `CMS_BASE_URL=https://admin.zerocraft.in npm run smoke:cms`.
- Sign in as Admin, Manager, Staff, and a suspended user.
- Verify dashboard, team access, audit log, system health, automation health, notifications, and email delivery.
- Confirm protected APIs return `401` without a session and worker routes reject missing secrets.
- Confirm a team suspension and reactivation produce audit events.
- Confirm catalog and inventory APIs enforce `read` versus `manage` permissions for Manager and Staff roles.
- Confirm the Admin role can access team management and all protected catalog/inventory actions.

## Release evidence

- Record commit SHA, tag, Vercel deployment URL, migration status, and test output.
- Keep the previous production tag available for rollback.
- Monitor Vercel logs, Supabase errors, worker runs, SMTP delivery, and low-stock alerts for 30 minutes.

## Rollback

- Revert the application deployment to the previous verified Vercel deployment.
- Do not roll back an applied database migration by deleting SQL files.
- Use a forward migration for schema repair and record the incident in the audit log.
