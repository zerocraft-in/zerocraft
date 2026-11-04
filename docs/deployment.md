# Deployment guide

## Vercel projects

Deploy the three apps independently from the monorepo:

| App | Local port | Primary responsibility |
| --- | ---: | --- |
| Store | 3001 | Public customer experience |
| CMS | 3002 | Authenticated store administration |
| Studio | 3003 | Internal creative workspace |

Configure Production and Preview variables separately in Vercel. Public registry values may use `NEXT_PUBLIC_`; service-role keys, encryption keys, OAuth secrets, R2 credentials and worker secrets must remain server-only Secret variables.

## Promotion sequence

1. Review the commit and confirm no local environment files or exports are staged.
2. Run `npm run verify:release`.
3. Apply pending Supabase migrations with `npx supabase db push --workdir packages/supabase`.
4. Build the affected app with the matching `build:*` command.
5. Deploy to Preview and run the smoke checks.
6. Promote only after authentication, store isolation, API ownership checks and critical commerce flows pass.
7. Record the commit SHA, deployment URL, migration status and rollback target.

## Production requirements

- HTTPS is enforced at the hosting layer; localhost is the only permitted HTTP exception.
- Supabase database access is restricted through project network controls where supported.
- Authentication logs, API errors and unusual traffic are retained in the configured observability system.
- Backups and point-in-time recovery are enabled before high-risk migrations.
- See [the security deployment guide](../SECURITY_DEPLOYMENT.md) and [the CMS release checklist](./cms/release-checklist.md).
