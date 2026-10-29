# Cloudflare R2 media storage

Zerocraft uses Cloudflare R2 for public catalog media while Supabase remains the system of record for database rows and private customer/digital files.

## Environment

Set these server-only values in `apps/cms/.env.local` and in the Vercel project environment:

```env
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=zerocraft-media
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://media.zerocraft.in
CLOUDFLARE_R2_MEDIA_PREFIX=assets
```

Never prefix the access key or secret with `NEXT_PUBLIC_`.

## Migration

1. Run `POST /api/studio/store/r2-migration` with `{ "mode": "dry-run" }` to inventory Supabase's public `product-media` bucket.
2. Confirm the count and any unsupported objects.
3. Run the same endpoint with `{ "mode": "execute" }`.
4. The migration copies objects to R2, updates matching product/category references, and retains every Supabase original.
5. Verify the returned `migrated` count and check representative URLs before any manual Supabase cleanup.

Private `digital-products` and `customer-customizations` are intentionally not migrated to public R2. They contain protected customer/download data and require a separate signed-delivery design.

## Domain

Cloudflare R2 custom domains require the parent DNS zone to be managed in the same Cloudflare account. Attach `media.zerocraft.in` to the bucket only after `zerocraft.in` is present as a Cloudflare zone and its DNS/nameserver change has been reviewed.
