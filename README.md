# Zerocraft Commerce

A shared ecommerce storefront and store-admin application, with an isolated Supabase project for each store.

- `apps/store`: catalog, cart, customer accounts and checkout (port 3001).
- `apps/cms`: products, orders, inventory, customers, content and store administration (port 3002).
- `apps/studio`: internal portfolio and CRM workspace (port 3003).
- `packages/ui`: shared ZeroCraft UI components.
- `packages/supabase`: host-based project selection, auth clients, schema and migrations.

## Development

Use Node.js 22+ and npm 11.17.0. Run `npm ci`, copy the Store and CMS `.env.example` files to `.env.local`, then run `npm run dev`.

Single-store environments can continue using the existing Supabase URL, public key and server service-role key. For several stores, configure the public connection registry and matching server secrets in both applications. One admin deployment serves all configured admin hosts; its store switcher navigates between their isolated sign-in contexts.

See [multi-store setup](docs/cms/MULTI_STORE_SETUP.md) for configuration, project initialization, backups and verification. Never put service-role keys in a `NEXT_PUBLIC_` variable.

## Verification

```bash
npm run typecheck
npm run test:security
npm run test:cms-routes
node --experimental-strip-types scripts/verify-store-isolation.mjs
node --experimental-strip-types scripts/verify-content-workspaces.mjs
```
