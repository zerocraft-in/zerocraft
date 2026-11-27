# Architecture Overview

Maara Merch is a multi-tenant retail management SaaS for clothing businesses.
Three sales channels — shop, van, and online — share one catalogue, customer
base, and financial model, while stock is tracked per location.

## What exists today

The admin application (Next.js 16, App Router) is the only client. Phase 1
delivers the application foundation: design tokens, theme provider, owned UI
primitives, the money module, and the foundation status page. Authentication,
tenancy, RLS, and core business modules are designed but not implemented.

## Future clients

Future products share the same schema through constrained APIs or RLS-scoped
queries:

| Client | Platform | Status |
| --- | --- | --- |
| Admin | Next.js 16 | Phase 1 (current) |
| POS | Flutter | Future |
| Van Sales | Flutter | Future |
| Storefront | Next.js | Future |

Future clients do not receive the Supabase service/secret key. They authenticate
through their own Supabase Auth or a platform assertion JWT.

## Core principles

- **Money is integer paise.** No floating-point currency in JavaScript
  arithmetic. Formatting only at presentation via `Intl.NumberFormat("en-IN")`.
- **Inventory is movement-first.** `inventory_movements` is append-only; balances
  are a derived current-state table updated only inside trusted database
  functions.
- **Purchases do not move stock.** Only goods receipts increase stock.
- **Every business record carries `organization_id`.** Tenant access is granted
  only through active `organization_members` rows.
- **No client-provided organization ID is used for authorization.** RLS also
  enforces `organization_id = any(current_org_ids())` as defence in depth.
- **No production secrets in the repository.** No production database change
  without explicit approval.

## Documentation map

| Topic | Document |
| --- | --- |
| Monorepo layout and package boundaries | `architecture/monorepo-structure.md`, `architecture/application-boundaries.md` |
| Package architecture | `architecture/package-architecture.md` |
| System flows and rendering rules | `architecture/system-flows.md` |
| Database ownership model | `architecture/database-ownership.md` |
| Tenant provisioning | `architecture/tenant-provisioning.md` |
| Public CDN architecture | `architecture/public-cdn.md` |
| Commerce template | `architecture/commerce-template.md` |
| Database schema | `infrastructure/database-architecture.md` |
| Business rules | `business-rules/sales.md`, `business-rules/purchases.md`, `business-rules/inventory.md`, `business-rules/finance.md` |
