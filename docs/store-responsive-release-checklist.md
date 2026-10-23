# Zerocraft Store Responsive Release Checklist

## Verified

- [x] Store typecheck passes.
- [x] Store production build passes.
- [x] Full monorepo typecheck passes.
- [x] Store lint passes for the refined storefront files.
- [x] Category and language filtering preserve combined state.
- [x] Search and clear-search update the URL.
- [x] Wishlist, quick view, add-to-cart, cart count, and cart drawer work.
- [x] Announcement ticker supports pause/resume and reduced motion.
- [x] Narrow screens use a single product column below 340px.
- [x] Studio and Store metadata remain separate.

## Before deployment

- [x] Capture visual screenshots at 320, 375, 390, 430, 768, and desktop widths.
- [x] Configure Store social previews to use the existing approved raster OG asset.
- [ ] Confirm production environment values for `NEXT_PUBLIC_SITE_URL`, Supabase, and checkout providers.
- [ ] Run commerce, cart, checkout, migration, and public smoke checks.
- [ ] Review the unrelated dirty working-tree changes and commit only the intended release set.
- [ ] Deploy Store and Studio independently.
- [ ] Verify canonical URLs, favicon, Open Graph, cart, checkout, and product detail routes after deployment.

## Release blockers

- CMS route contract check must be updated to recognize the intentional Manual Payments `/transactions` page instead of requiring the old ComingSoon placeholder.
- Supabase schema verification requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the release environment.

## Intended release allowlist

Keep only the following task-scoped files when creating the clean release worktree:

- `apps/store/app/layout.tsx`
- `apps/store/app/product/[slug]/page.tsx`
- `apps/store/components/layout/Header.tsx`
- `apps/store/components/layout/InlineBranding.tsx`
- `apps/store/components/sections/ProductCard.tsx`
- `apps/store/components/sections/Shop.tsx`
- `apps/store/components/sections/TopTicker.tsx`
- `apps/store/styles/globals.css`
- `apps/store/public/brand/logo-wordmark.svg`
- `apps/store/public/og-image.jpg`
- `apps/studio/app/layout.tsx`
- `apps/cms/app/transactions/page.tsx`
- `apps/cms/components/studio/manual-payments-review.tsx`
- `scripts/release/check-cms-routes.mjs`
- `playwright.config.ts`
- `tests/store-responsive.spec.ts`
- `docs/store-responsive-release-checklist.md`
- `package.json`
- `package-lock.json`
