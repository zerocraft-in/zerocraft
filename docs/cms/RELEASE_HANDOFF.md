# ZeroCraft CMS release handoff

Release candidate: `0.0.34`  
Release commit: `4ede961`  
Production: [admin.zerocraft.in](https://admin.zerocraft.in)  
Supabase project ref: `jamyqssytdzbiiahtmsq`

## Release status

The CMS release candidate has passed repository verification, production smoke checks, and controlled production QA. The release is suitable for operational handoff with one monitoring note: System Health retains historical failure/SLA telemetry from the controlled weekly-report test. The event is resolved and SMTP diagnostics are healthy.

## Verified areas

- Catalog: product/category/subcategory CRUD, readiness counters, duplicate mapping, active/archive lifecycle, and audit entries.
- Inventory: location balances, on-hand quantity, reorder points, low-stock calculation, and inventory audit entries.
- Permissions: Admin, Manager, Staff, suspended/reactivated access, granular catalog/inventory guards, and protected API responses.
- Notifications: low-stock history, filters, read/unread analytics, exports, and recipient visibility.
- Reliability: database, schema, scheduled automation, SMTP connection, storage, deployment, diagnostics, and health history.

## Required production configuration

Set these as Vercel server-side environment variables. Never commit values to Git:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_STUDIO_URL`
- `NEXT_PUBLIC_STORE_URL`
- `ZEROCRAFT_HOSTNAME_ROUTING_ENABLED`
- `CRON_SECRET`
- `WEEKLY_REPORT_WORKER_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
- `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `EMAIL_REPLY_TO`

Supabase Vault must contain the weekly report worker URL and the same worker secret used by Vercel:

- `zerocraft_weekly_report_worker_url`
- `zerocraft_weekly_report_worker_secret`

## Deployment handoff

1. Confirm Vercel project root is `apps/cms` and production domain is `admin.zerocraft.in`.
2. Confirm production environment variables are present in the correct Vercel environment.
3. Apply pending Supabase migrations with the linked project; never delete applied migration files.
4. Deploy the release commit through the CMS-only Vercel project.
5. Run `npm run verify:release` before deployment and `npm run smoke:cms` with `CMS_BASE_URL=https://admin.zerocraft.in` after deployment.
6. Check System Health, Automation Health, Email Delivery, Notification History, and Audit Log.
7. Monitor Vercel, Supabase, cron, SMTP, and low-stock events for at least 30 minutes.

## Rollback

- Repoint Vercel to the last verified production deployment or commit.
- Do not remove or rewrite applied Supabase migration files.
- Repair schema/data issues with a forward migration.
- Re-run production smoke checks after rollback.
- Record the incident, deployment SHA, affected route, and resolution in the audit log.

## Handoff acceptance

- [ ] Production deployment is Ready.
- [ ] Production smoke test is green.
- [ ] Required secrets are configured and not exposed in client bundles.
- [ ] Supabase migrations are applied and recorded.
- [ ] Admin can access health, audit, notification, team, catalog, and inventory areas.
- [ ] Manager and Staff access matches the role matrix.
- [ ] No unresolved release-blocking incident remains.
- [ ] Previous verified deployment is available for rollback.
