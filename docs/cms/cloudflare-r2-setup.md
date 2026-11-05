# Cloudflare R2 media

R2 is optional public media storage. Supabase remains the system of record for metadata, private customer files and digital delivery.

## Server-only variables

```dotenv
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=zerocraft-media
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://media.example.com
CLOUDFLARE_R2_MEDIA_PREFIX=assets
```

Store these as Vercel Secret variables and never expose them through `NEXT_PUBLIC_` names.

## Studio Media CMS

The Studio Media page uses the same `zerocraft-media` bucket with an isolated key namespace:

```text
zerocraft-media/
└── studio/
    ├── general/<uuid>-<file-name>
    ├── projects/<uuid>-<file-name>
    ├── brand/<uuid>-<file-name>
    └── <custom-folder>/<uuid>-<file-name>
```

Studio never trusts a browser-provided object key. The server validates the signed-in Studio member, checks `catalog.read` for listing and `catalog.manage` for upload/delete, generates the object key, writes the object to R2, and stores metadata in `public.files` (the deployed name of the historical `store_media_assets` table) with RLS enabled.

For the Studio app, configure the same server-only variables in `apps/studio/.env.local` (or the deployment environment). The Studio adapter always uses the `studio/` prefix, so the CMS `assets/` namespace remains unchanged.

The current Supabase project already exposes `public.files` with `catalog.read` / `catalog.manage` RLS policies, so no second metadata table is required.

The bucket can remain public for previews when `CLOUDFLARE_R2_PUBLIC_BASE_URL` is configured. If that value is empty, uploads and metadata still work, but the UI will not expose a public preview URL.

## Migration procedure

1. Run the R2 migration endpoint in dry-run mode and review the inventory.
2. Confirm unsupported objects and the expected count.
3. Execute the migration and verify representative media URLs.
4. Keep the Supabase originals until the new references and backups are verified.
5. Do not migrate `digital-products` or customer customization files to public R2; use signed delivery for protected data.

The R2 custom domain must be attached only after the parent DNS zone and HTTPS configuration have been reviewed.
