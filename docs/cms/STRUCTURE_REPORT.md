# CMS structure report

## 1. Application boundary

The CMS is a Next.js application in `apps/cms`, mounted at the domain root. `apps/cms/proxy.ts` refreshes Supabase sessions, protects private pages and API routes, and redirects legacy `/studio` URLs to their root equivalents.

The application uses:

- Next.js App Router and server/client route components.
- Supabase SSR clients for authenticated data access.
- Shared Supabase package code from `packages/supabase`.
- Tailwind/PostCSS styling and local UI primitives in `apps/cms/components/ui`.
- A studio shell with a Square-inspired fixed rail, responsive navigation, contextual breadcrumbs, global create/search actions, notifications, theme, and mobile navigation.

## 2. Route groups

### Studio operations

- `/` — dashboard overview and setup progress.
- `/works` — portfolio projects.
- `/blogs` — journal content.
- `/clients` and `/clients/[id]` — client directory and client detail.
- `/appointments` — appointment operations.

### Commerce

- `/store` — commerce overview.
- `/store/products` — product catalog workspace.
- `/store/categories` — category and subcategory CRUD workspace.
- `/store/inventory` — inventory workspace.
- `/store/customization` — storefront/customization settings.
- `/orders` and `/orders/[view]` — order operations.

### Insights and system

- `/reports` — live record counts, commerce summary, and connection coverage.
- `/settings` — system and workspace settings.
- `/login` and `/auth/callback` — authentication entry points.

## 3. API surface

- `/api/studio/overview` — authenticated operational dashboard data.
- `/api/studio/store` — authenticated catalog read/write/archive operations for products, categories, subcategories, and item assignment.
- `/api/studio/store/category-media` — authenticated category image upload.
- `/api/studio/store/media` — product media operations.
- `/api/studio/store/inventory` — inventory operations.
- `/api/studio/store/customization` — store customization operations.
- `/api/studio/notify-appointment` — appointment notification action.

All listed studio APIs are intended to require authenticated staff access and same-origin requests. The store route additionally checks profile roles (`admin`, `manager`, `staff`).

## 4. Data model boundary

The CMS depends on core studio tables (`works`, `blogs`, `clients`, `appointments`, `notifications`) and commerce tables such as `store_categories`, `store_subcategories`, `store_products`, `store_product_variants`, `store_orders`, media, collections, inventory, and audit logs.

Commerce schema evolution is migration-based. The taxonomy migration adds subcategories and enforces the product category/subcategory relationship. Commerce migrations also include storage, transactional checkout, inventory, purchase orders, transfers, write hardening, and checkout lifecycle work.

## 5. Reporting boundary

The existing `/reports` page is an application report, not an audit-log viewer. It reports live table availability, counts, order performance, paid value by currency, and connection coverage. Database audit history is represented in the commerce schema by `store_audit_logs`, but no CMS route currently exposes a complete audit-log browser.
