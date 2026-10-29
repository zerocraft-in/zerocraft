# Zerocraft Platform MVP Architecture

Zerocraft is being shaped as a native WordPress/Shopify-style operating platform, not a copy of proprietary source code.

## Platform surfaces

| Surface | Current implementation | MVP responsibility |
|---|---|---|
| Content Studio | Pages, Works, Journal, media library | Publish public content with draft/published workflow and SEO metadata |
| Commerce | Products, categories, inventory, orders, customization | Manage catalogue, fulfilment and store operations |
| CRM | Clients, lead pipeline, activities, projects, milestones | Manage enquiry-to-delivery lifecycle |
| Integrations | Feature flags, provider registry, health checks | Enable modules and connect external services safely |
| Operations | Email, automations, notifications, audit logs, system health | Run the studio reliably |

## Current MVP additions

- `cms_pages` page records with slug, body, status, SEO title, SEO description and featured image.
- `cms_navigation_menus` and `cms_navigation_items` for the future WordPress-style menu builder.
- `cms_site_settings` for public site and theme configuration.
- Protected page CRUD API under `/api/studio/content/pages`.
- Content Studio page at `/content`.
- Unified CRM workspace at `/crm` with lead inbox, KPIs and relationship activity timeline.
- Existing Commerce and CRM modules remain connected to the same feature registry.

## Feature gating contract

The `studio_features` registry is the module switchboard:

- `content` controls Content Studio routes.
- `commerce` controls Store and order routes.
- `crm` controls Clients, Leads and CRM routes.
- `email`, `automation` and `analytics` control their respective workspaces.

Disabled features are removed from navigation and redirect from protected module routes.

## Next platform phases

1. Build the public page renderer from `cms_pages` with preview and publishing links.
2. Add navigation-menu management and site settings UI.
3. Add block/section editor primitives for page composition.
4. Add media asset records and upload lifecycle management.
5. Add product variant/bundle editor improvements and checkout configuration.
6. Add CRM client conversion, proposals, invoices and project deliverables.
7. Add plugin installation contracts, webhook subscriptions and provider OAuth setup.

## Activation

Apply `20261029130000_cms_platform_foundation.sql` after the already-applied feature registry migration, then run the protected CMS smoke suite.
