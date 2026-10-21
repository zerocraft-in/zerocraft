# ZeroCraft CMS operations runbook

## Backups

- Keep Supabase Point-in-Time Recovery enabled for production.
- Before a migration, capture the migration list and record the deployment SHA.
- Export critical operational tables when required by the project backup policy; never store production exports in Git.
- Verify that restore access is available to the owner before a high-risk schema change.

## Monitoring

- System Health is the first place to inspect database, schema, storage, SMTP, deployment, and scheduled-job status.
- Automation Health shows low-stock and weekly-report worker state.
- Email Delivery and Notification History show delivery attempts, retries, and user-facing alerts.
- Acknowledge incidents only after the underlying failure is understood; acknowledgement does not delete evidence.

## Incident response

1. Capture the timestamp, route, deployment SHA, and visible error.
2. Check Vercel runtime logs and Supabase logs.
3. Check the relevant audit, automation, and email-delivery records.
4. Apply the smallest safe fix and deploy through the quality gate.
5. Re-run the production smoke checks and record the resolution.
