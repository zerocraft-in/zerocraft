# Isolated multi-store setup

## Architecture

There are two application workspaces: Store and CMS. All stores use the same code and shared ZeroCraft UI. Each store owns a separate Supabase project, including its Database, Auth users, and Storage buckets. The admin store switcher changes to the selected store's configured admin origin. Each store has a distinct admin hostname, so cookies, browser storage and separate open tabs do not silently switch databases underneath an existing editor. Sign in separately to each project's admin account; shared SSO is not implemented.

Connections are resolved from the exact request `Host`, never from an arbitrary database URL supplied by a request. Unknown hosts fail closed in registry mode. Public storefront hosts are also pinned to their corresponding project. Service keys are selected by the resolved store ID without falling back to another project's credentials. Configure the same public registry in both deployments and add all relevant domains to the appropriate hosting project.

## Environment

`NEXT_PUBLIC_STORE_CONNECTIONS` is JSON containing **only public configuration**. Example (replace every placeholder):

```dotenv
NEXT_PUBLIC_STORE_CONNECTIONS='[{"id":"store-one","name":"Store One","adminOrigin":"https://one.admin.example.com","storefrontOrigin":"https://one.example.com","url":"https://PROJECT_ONE.supabase.co","key":"sb_publishable_REPLACE"},{"id":"store-two","name":"Store Two","adminOrigin":"https://two.admin.example.com","storefrontOrigin":"https://two.example.com","url":"https://PROJECT_TWO.supabase.co","key":"sb_publishable_REPLACE"}]'
STORE_SERVER_SECRETS='{"store-one":{"serviceRoleKey":"SERVER_ONLY_KEY_ONE"},"store-two":{"serviceRoleKey":"SERVER_ONLY_KEY_TWO"}}'
```

Optional `adminAliases` and `storefrontAliases` arrays contain additional full origins for a store (for example `http://localhost:3002` and `http://localhost:3001`). Every host must belong to exactly one store. HTTPS is required except for localhost. Register each project's exact callback URLs and allowed redirect URLs in Supabase Auth. Google OAuth callbacks, if used, now live under `/api/admin/...`; update registered redirect URLs accordingly.

The existing Zerocraft connection was registered in the three local `.env.local` files. Only one real project is currently connected. No additional paid Supabase project was created. To connect another store, supply its project public configuration, server secret, admin/storefront domains, and an authorized admin user in that project. Restart/redeploy after changing registry environment values; public variables are bundled at build time.

Legacy single-store environment variables remain supported when the connection registry is absent. Encrypted integration credentials accept the new `COMMERCE_CREDENTIALS_ENCRYPTION_KEY` with a legacy fallback to the original key; do not rotate the encryption key without re-encrypting the stored records.

## Initialize a new project

1. Create a separate Supabase project and enable the `pg_cron` and `pg_net` extensions if scheduled reports/automation are needed.
2. Run `packages/supabase/supabase/schema.sql` on the **empty** project. It is a fresh-project bootstrap, not an upgrade script. It includes store tables, functions, triggers, RLS policies, grants, role permissions, feature defaults, and Storage buckets/policies. It contains no products, orders, customer records, user accounts, integration credentials, or Studio tables.
3. Create the store owner's Auth account, then explicitly promote only that account's `profiles` row to `admin` through a privileged database session. Do not grant admin to arbitrary signups.
4. Add the project to the connection registry and server-secret map. Configure domains and Auth callback allowlists, then deploy/restart both apps.
5. Sign in on that store's admin host and verify products, orders, staff access and file upload. Keep checkout/payment feature flags disabled until that store's providers and checkout tests are complete.

The clean bootstrap was checked in a separate schema inside a rolled-back transaction against the connected database. Existing Auth triggers and Storage policies were omitted from that validation transaction to avoid touching the live Auth/Storage schemas. A second live-project integration test has not been performed.

Historical migrations retain their original Studio identifiers so existing migration history is reproducible. The latest store-only migration removes the old feature tables and renames shared infrastructure. Do not replay the historical migrations over the clean bootstrap; maintain each new project's subsequent migration baseline separately.

In multi-store mode, media management uses each project's Supabase Storage. Shared global R2 credentials are disabled. The existing linked legacy R2 product image was copied byte-for-byte to the current project's Storage, its references updated transactionally, and the original R2 file retained.

## Backup and removal performed on November 1, 2026

- Private database snapshot: `zc_backup_20261101_store_only`, containing 80 original public-table copies with matching row counts and captured function/constraint/policy definitions. Access is revoked from PUBLIC, anon, and authenticated. The backup schema is not exposed through the Data API.
- Ignored local folder: `.local-backups/20261101-store-only/`. Includes verified Studio/CMS source ZIPs, 9 Studio table JSON exports, SHA-256 checksums, and the legacy-media copy manifest. Studio exports contain 14 records; the old public Studio tables were removed only after backup hashes matched.
- Removed: creative Studio app, CRM/leads/projects/appointments/portfolio feature code and the 9 corresponding public tables.
- Preserved and renamed: shared staff permissions, sessions, invites, integrations, notifications, low-stock alerts, automation and health infrastructure under `commerce_*`. Customer access grants were copied from `clients.*` to `customers.*`, preserving allow/deny values before old capabilities were removed.
- Preserved counts: 59 products, 10 orders, 155 variants, 22 categories and 4 profiles. Original backup copies retain pre-migration media URLs.

Backups intentionally retain the deleted Studio data privately for recovery. Do not delete the backup schema or local folder until the retention period is decided. Recovery should be performed in a separate recovery project first, using the table copies, captured object definitions and source ZIPs; this transition has no automatic rollback command.

## Verification

Run the repository typechecks, security tests, route checks, and `scripts/verify-store-isolation.mjs`. Isolation checks cover two synthetic projects, concurrent host resolution, unknown hosts, duplicate projects/hosts, public secret-key rejection, HTTPS and legacy compatibility. Browser checks confirmed the existing admin loads its 10 orders after the transition. A true cross-project login/switch test requires a second configured project.
