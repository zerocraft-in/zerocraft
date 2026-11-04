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

## Migration procedure

1. Run the R2 migration endpoint in dry-run mode and review the inventory.
2. Confirm unsupported objects and the expected count.
3. Execute the migration and verify representative media URLs.
4. Keep the Supabase originals until the new references and backups are verified.
5. Do not migrate `digital-products` or customer customization files to public R2; use signed delivery for protected data.

The R2 custom domain must be attached only after the parent DNS zone and HTTPS configuration have been reviewed.
