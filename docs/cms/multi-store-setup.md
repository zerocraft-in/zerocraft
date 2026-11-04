# Multi-store setup

Each store is isolated to its own Supabase project, Auth users and Storage buckets. Store selection is derived from the request host and the configured registry; a request cannot submit an arbitrary database URL.

## Configuration

`NEXT_PUBLIC_STORE_CONNECTIONS` contains public values only:

```dotenv
NEXT_PUBLIC_STORE_CONNECTIONS='[{"id":"store-one","name":"Store One","adminOrigin":"https://admin.example.com","storefrontOrigin":"https://shop.example.com","url":"https://PROJECT.supabase.co","key":"sb_publishable_REPLACE"}]'
STORE_SERVER_SECRETS='{"store-one":{"serviceRoleKey":"SERVER_ONLY_KEY"}}'
```

Keep `STORE_SERVER_SECRETS` server-only. HTTPS is required for non-localhost origins. Every admin/storefront alias must belong to exactly one store. Configure matching Supabase Auth callback and redirect URLs for each host.

## New store checklist

1. Create the Supabase project and apply the clean bootstrap or the approved migration baseline.
2. Create the owner Auth account and promote only the intended profile through a privileged session.
3. Configure public registry data and server secrets in both Store and CMS deployments.
4. Configure domains, Auth redirects, storage buckets and required provider credentials.
5. Sign in on the new admin host and verify catalog, orders, staff permissions and file access.
6. Keep payment and checkout integrations disabled until provider configuration and smoke checks pass.

## Isolation rules

- Unknown hosts fail closed in registry mode.
- Public configuration may contain publishable keys only.
- Service keys are selected by resolved store ID and never fall back to another store.
- Server queries and API mutations enforce the resolved store and record ownership.
- Test store switching with separate sessions; shared SSO is not assumed.
