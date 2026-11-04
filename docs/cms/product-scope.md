# CMS product scope

## Implemented surfaces

| Area | Responsibility |
| --- | --- |
| Overview | Store health, recent activity and operational summary |
| Catalog | Products, variants, categories, media and inventory |
| Orders | Order review, status changes and fulfilment context |
| Customers | Customer records and account context |
| Content | Metaobjects, files, menus and articles |
| Sales channels | Online Store and Point of Sale navigation with child routes |
| Settings | Store, checkout, users, permissions, domains and integrations |
| Operations | Audit, notifications, automation, email delivery and system health |

## Capability model

Feature flags and permissions control navigation and server access independently. A hidden navigation item is not an authorization boundary: every protected page and API route must enforce the authenticated user, role permission and store ownership again on the server.

## Planned work

The following items are intentionally documented as planned until their route, migration and verification exist:

- public renderer for CMS pages and navigation menus;
- richer block/section editing and media lifecycle tooling;
- additional checkout, provider and webhook integrations;
- expanded CRM delivery workflows in Studio.
