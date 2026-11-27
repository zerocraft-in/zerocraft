# CMS operations runbook

## Daily checks

- Review Vercel runtime errors and recent deployments.
- Check CMS System Health for database, storage, SMTP and scheduled jobs.
- Check audit events for failed sign-ins, permission changes and unusual mutations.
- Confirm backup/PITR status for each production Supabase project.

## Backup and migration

Before a high-risk migration, record the current commit and migration list, confirm restore access, and capture an approved backup. Never delete an applied migration; repair forward with a new migration.

## Incident response

1. Record timestamp, host, route, deployment SHA and request correlation data.
2. Inspect Vercel, Supabase and application security logs.
3. Check authentication events, audit records, worker failures and affected store scope.
4. Contain the smallest affected surface: revoke a credential, disable a flag or pause a worker when appropriate.
5. Apply the smallest reviewed fix, deploy through the release gate and run smoke checks.
6. Record impact, root cause, remediation and follow-up owner.
