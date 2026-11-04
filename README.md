<div align="center">

<img src="./brand-kit/zerocraft-mark.svg" alt="Zerocraft" width="72" />

# Zerocraft

**Everything Starts at Zero.**

An opinionated commerce platform for creative teams: storefront, store administration and an internal Studio workspace in one TypeScript monorepo.

[Documentation](./docs/README.md) · [Security](./SECURITY_DEPLOYMENT.md) · [Contributing](./CONTRIBUTING.md)

</div>

## What is included

| Surface | What it does | Local URL |
| --- | --- | --- |
| **Zerocraft Store** | Catalog, customer accounts, cart and checkout | `http://localhost:3001` |
| **Zerocraft CMS** | Products, orders, inventory, customers, content, sales channels and settings | `http://localhost:3002` |
| **Zerocraft Studio** | Internal portfolio and CRM workspace | `http://localhost:3003` |

### Platform capabilities

- Multi-store host resolution with isolated Supabase projects.
- Role-based CMS navigation and server-side permission enforcement.
- Store-scoped API ownership checks to prevent cross-store access and IDOR issues.
- Content workspaces for metaobjects, files, menus and articles.
- Product, variant, category, inventory and order administration.
- Supabase Auth with server-managed sessions and protected route boundaries.
- Release, security, migration and route-contract verification scripts.
- Optional Cloudflare R2 support for public catalog media.

## Technology

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Supabase · Turborepo · Vercel

## Quick start

### Prerequisites

- Node.js 22+
- npm 11.17.0
- A Supabase project for the app you are running

### Install and configure

```bash
npm ci
copy .env.example .env.local
```

Use the app-specific `.env.example` files for Store, CMS or Studio variables. Keep `.env.local` files untracked. Service-role keys, encryption keys and provider credentials must remain server-only and must never use a `NEXT_PUBLIC_` prefix.

### Run a workspace

```bash
npm run dev:store
npm run dev:cms
npm run dev:studio
```

Run one command per terminal when working on a single surface. `npm run dev` starts all workspaces through Turborepo.

## Quality gates

```bash
npm run typecheck
npm run lint
npm run test:security
npm run test:cms-routes
npm run verify:release
npm run build
```

`verify:release` checks migration ordering, RBAC contracts, Gmail workspace security, CMS routes and CMS types. Run it before a deployment or schema change.

## Repository map

```text
apps/store/       public commerce experience
apps/cms/         authenticated store administration
apps/studio/      internal creative workspace
packages/ui/      shared UI primitives
packages/supabase schema, migrations, seeds and database helpers
scripts/          release, security, verification and seed tooling
docs/             architecture, development and deployment guides
brand-kit/        canonical visual identity assets
```

## Security and deployment

Read [Security and deployment](./SECURITY_DEPLOYMENT.md) before connecting a production project. Read the [deployment guide](./docs/deployment.md) for Vercel promotion, environment separation, migration order and smoke checks. Production data exports and secrets do not belong in this repository.

## License and ownership

This repository is private application source. Preserve third-party notices and client-owned assets. See [CONTRIBUTING.md](./CONTRIBUTING.md) for change and review conventions.
