# ZeroCraft CMS post-release monitoring

Use this checklist after every production CMS deployment.

## First 5 minutes

- Open `/system-health` and confirm database, schema, cron, SMTP, storage, and deployment checks.
- Open `/automations` and confirm the low-stock schedule has a recent successful run.
- Open `/audit-logs` and confirm the deployment/diagnostic activity is recorded.
- Run the protected-route smoke test and confirm unauthenticated API requests return `401`.

## First 30 minutes

- Watch Vercel runtime errors and function duration.
- Watch Supabase errors and connection saturation.
- Check `/email-events` for failed or retrying deliveries.
- Check `/notifications` for unexpected unread automation or inventory alerts.
- Confirm no duplicate low-stock alerts are being created.
- Confirm weekly report queue/worker activity remains healthy.

## First 24 hours

- Review low-stock alerts and inventory movement audit entries.
- Review team access changes and suspended-account attempts.
- Compare catalog readiness counters with the pre-release baseline.
- Review System Health failure window and resolve only understood incidents.
- Export health history if an incident occurred.

## Release exit criteria

- No new release-related error pattern for 30 minutes.
- No unexpected permission regression.
- No failed worker invocation caused by secret mismatch.
- No SMTP delivery retry loop.
- Catalog and inventory counters remain stable.
