# Shopify Admin — Full Dashboard Audit & Zerocraft Platform Blueprint

**Reference:** `https://admin.shopify.com/store/10ckt4-mh`  
**Audit date:** 2026-10-29  
**Mode:** Read-only live browser inspection. No store, billing, account, security, or publishing settings were changed.

## Executive summary

Shopify Admin is not a collection of independent pages. It is a persistent operating system for a store:

```text
App shell
├─ global navigation and search
├─ operational modules
├─ sales channels and apps
├─ settings shell
├─ account / alerts / plan controls
└─ contextual Sidekick assistant
```

The most important product decisions to carry into Zerocraft are:

1. Keep one stable shell while content changes underneath it.
2. Treat every business object as a reusable list workspace: views, search, filters, sort, columns, bulk actions, import/export, pagination, empty/error/loading states.
3. Separate operations navigation from configuration navigation.
4. Make modules independently enableable and server-guarded.
5. Make permissions, roles, sessions, audit history, and provider health first-class product surfaces.
6. Use a command/assistant layer as an action accelerator, never as a replacement for reliable underlying workflows.

Shopify's live store was a new/trial store with no orders, products, or customers. Therefore, empty states and setup flows were directly observed; populated detail workflows are mapped from the visible controls, routes, table patterns, and settings model.

## 1. Persistent application shell

### Desktop frame

- Fixed dark navigation rail on the left.
- Shopify wordmark/brand at the top and collapse control.
- Search is a dedicated navigation row and exposes `Ctrl K`.
- Main routes stay in a scrollable navigation container.
- Sales channels and Apps are separate groups below core routes.
- Settings, alerts, account/store switcher, and plan/trial CTA are anchored near the bottom.
- Main content starts beside the rail and has its own page header.
- Sidekick is persistent at the bottom-center of the workspace.

### Collapsed frame

- Rail becomes icon-only.
- Route hierarchy remains available through accessible tooltips/disclosures.
- Main content reflows; it is never covered by the rail.
- Bottom utilities remain reachable.

### Global controls observed

- Search and command surface.
- Store/account menu: store identity, account identity, View Dev Dashboard, Create store, Help Center, Log out.
- Alerts feed with unread count.
- Trial/plan banner: `Trial ends in 3 days — Subscribe for ₹20`.
- Sidekick text input, file attachment, dictation, and open/expand action.
- Skip-to-content accessibility link.

### Zerocraft target

Keep the existing charcoal/lime brand, but implement the same operating rhythm:

```text
216–240px rail → 56px utility header → 1120–1280px focused content → assistant dock
```

The current Zerocraft sidebar parity work already covers the reference hierarchy, feature-gated visibility, child-route active pills, no vertical child guide line, and animated disclosure behavior. The next parity layer is the shared workspace system described below.

## 2. Exact primary information architecture

### Core navigation

| Shopify area | Visible children observed | Zerocraft interpretation |
| --- | --- | --- |
| Home | Dashboard/onboarding | Overview, setup checklist, operating dashboard |
| Orders | Orders, Drafts | Enquiries, projects, invoices, optional store orders |
| Products | Collections, Inventory, Purchase orders, Transfers, Gift cards | Works/services, products, categories, inventory, fulfilment |
| Customers | Segments, Companies | Clients, leads, segments, organizations |
| Growth | Attribution, Autopilot, Campaigns | Attribution, campaigns, automations |
| Discounts | — | Offers, packages, referral incentives |
| Content | Metaobjects, Files, Menus, Blog posts | Content Studio, media, navigation, Journal |
| Markets | Graph/create markets | Service areas, catalogs, publishing destinations |
| Analytics | Dashboard/report cards/explorations | GA4, Search Console, lead and project reporting |
| Sales channels | Online Store, Agentic | Public website, WhatsApp, Instagram, client portal |
| Apps | Add | Integrations, provider modules, future marketplace |

### Navigation behavior

- Parent rows are route-aware and expand when a child route is active.
- Child rows are compact text links and receive the active pill.
- Active child must not duplicate the parent's active surface.
- Feature-disabled modules must disappear from navigation and be blocked server-side.
- The settings shell is separate from the operational sidebar.

## 3. Page-by-page capability inventory

### Home / Overview

Shopify Home is an onboarding command center, not only a KPI dashboard.

Observed patterns:

- Store/workspace identity headline.
- Assistant composer with a suggested command such as `Create a product listing`.
- Recents, file attachment, and dictation affordances.
- Dismissible setup cards with CTA and explanation.
- Setup tasks for products, theme, payments, domain, shipping, POS, and regional requirements.

Zerocraft Home should add operating metrics next to setup progress:

- Open leads and unread enquiries.
- Active projects and overdue milestones.
- Upcoming appointments.
- Unpaid invoices and recent revenue.
- Integration health and feature activation checklist.
- Recent activity and quick-create actions.

### Orders / operational queue

Observed:

- Orders title and contextual view selector.
- Empty/trial state explaining that orders appear after subscription.
- One primary CTA and a learn-more action.
- Drafts is an inline child route.

Zerocraft equivalent:

- Enquiry inbox, project requests, estimates, invoices, and optional commerce orders.
- Shared list workspace with status views, owner, due date, source, amount, and last activity.

### Products

Observed:

- Page title and `View as` control.
- Saved view tab (`All`).
- Create new view control.
- Search/filter and sort controls.
- Add product and Import actions.
- Discovery action to find products to sell.
- Product route is plan-gated in this trial store.

Required Zerocraft store model:

- Product list and detail editor.
- Collections/categories.
- Variants, pricing, stock, media, SEO, publishing destinations.
- Import/export and bulk edit.
- Feature dependency: Store/Commerce enabled.

### Customers / CRM

Observed:

- Export, Import, Add customer.
- AI-assisted segment description.
- Query-builder/editor toggle.
- Search customers.
- Display options, sort, column visibility, Reset view, Save view.
- No-match state and learn-more action.
- Segments and Companies child routes.

Required Zerocraft CRM model:

- Clients, leads, organizations, contacts, activities, notes, source, lifecycle stage, owner, consent, and revenue.
- Segment rules stored as JSON with a readable label.
- Saved views per user/workspace.
- Bulk assignment, stage change, archive, export, and follow-up actions.

### Growth

Observed:

- Intro banner for the featured growth product.
- Get started, Learn more, Dismiss.
- Performance date range (`Last 30 days`) and View details.
- Metrics for sales attributed to marketing and sessions by traffic type.
- Campaign Autopilot setup.
- Recent campaigns and Create campaign.

Zerocraft should connect:

- GA4 events: WhatsApp clicks, project brief submission, email, Instagram, UTM attribution.
- Search Console clicks, impressions, CTR, queries, and pages.
- Campaign-to-lead-to-project attribution.
- Campaign notes, status, owner, spend, and outcome.

### Discounts / Offers

Observed:

- Export and Create discount.
- Discount codes and automatic discounts.
- Help/learn-more link.
- Discount types include product, order, shipping, amount-off, and buy-X-get-Y.

Zerocraft equivalent:

- Package offers.
- Seasonal campaigns.
- Referral incentives.
- Free consultation offers.
- Store product promotions.

### Content

Observed at `content/metaobjects`:

- Manage and Add definition.
- Status/view shortcuts: Available on storefront, Web pages, Active, Draft.
- Recent entries.
- Custom filter and Search definitions.
- Display options, sort, columns, filters, Reset, Save.
- No-definition state.

Required Content Studio:

- Pages, Journal/blog, reusable blocks, media/files, menus, SEO, revisions, scheduled publishing, preview, rollback.
- Status lifecycle: draft → review → scheduled → published → archived.

### Markets

Observed:

- Graph view and Create market.
- Tree context pane with Store default and Regions.
- Search in all markets, Filter, Sort.
- Table columns: Market, Status, Includes, Customizations, View on graph.
- Suggested markets with Create and Dismiss.

Zerocraft interpretation:

- Service areas: Tenkasi, Tirunelveli, Tamil Nadu, India, Remote.
- Catalogs and rate cards per segment.
- Publishing destinations and rollout status.
- Preview and rollback for public content releases.

### Analytics

Observed metric families:

- Gross sales, returning customer rate, orders fulfilled, orders.
- Total sales over time/breakdown/channel/product.
- Sessions over time/device/location/social referrer/landing page/referrer.
- Average order value and conversion rate.
- Marketing channel performance.
- Customer cohort analysis.
- Product sell-through rate.
- POS staff sales and location totals.
- Conversion rate breakdown.

Observed controls:

- Today date selector.
- Compare-to date selector.
- Currency selector.
- More actions.
- New exploration.
- Metric cards link to reports.

Zerocraft first release:

- Leads by source.
- WhatsApp clicks and project brief submissions.
- Email and Instagram conversions.
- Project conversion and revenue by service.
- GA4 and Search Console cards.
- Date range, comparison, refresh timestamp, definitions, and drill-down.

### Online Store / sales channel

Observed:

- Sales channel group with Online Store and Agentic.
- Online Store children: Pages and Preferences.
- Theme/editor surface in an embedded workspace.
- Channel-specific actions and preview context.

Zerocraft channel model:

- Website visibility: private/public.
- Preview, publish, rollback.
- Theme/brand system.
- Page builder, media, navigation, SEO, and channel-specific publishing.
- WhatsApp/Instagram as optional destinations instead of assuming all content is public.

## 4. Settings and platform operations

Shopify uses a dedicated searchable settings shell. The live settings index exposed these categories:

| Category | Scope to implement in Zerocraft |
| --- | --- |
| General | Workspace name, contact, address, currency, locale, timezone, units, IDs |
| Plan | Feature plan, limits, trial, upgrade state |
| Billing | Invoices, payment method, usage charges, billing profile |
| Users | Members, invitations, status, owner, access |
| Roles | Reusable role definitions and assignments |
| Security | User activity logs, service accounts, collaborator access |
| Payments | Payment provider connections, payout state |
| Checkout | Checkout fields, policies, order processing |
| Customer accounts | Login/account model, profile settings |
| Shipping and delivery | Service areas, rates, delivery methods |
| Taxes and duties | Tax regions, rates, exemptions |
| Locations | Studio/store locations, fulfilment/source locations |
| Apps | Installed integrations and permissions |
| Sales channels | Destination configuration and publishing status |
| Domains | Primary/custom domains and verification |
| Customer events | Tracking pixels, event consent, webhook/event destinations |
| Notifications | Email, in-app, operational and security notifications |
| Metafields/metaobjects | Custom data definitions and records |
| Languages | Locale/content translations |
| Customer privacy | Consent, cookie/tracking, data requests, retention |
| Policies | Privacy, terms, refund, cancellation, service policies |

### General settings details observed

- Business entity.
- Store contact details: email, phone, address.
- Currency display and regional settings.
- Backup region.
- Metric/imperial unit system.
- Default weight unit.
- Time zone.
- Order ID prefix/suffix.
- Order processing rules and auto-archive option.
- Store assets: Metafields and Brand.
- Resources: Change log, Help Center, partner help, keyboard shortcuts, activity log.
- Transfer ownership/organization.

### Billing and plan details observed

- Plan page shows Trial, remaining days, Cancel trial, and Choose plan.
- Billing page shows billing profile, India payment/address requirements, upcoming bill, threshold, payment method link, past bills with All/Paid/Unpaid tabs, search/filter, sort, and charge table.

### Users, roles, and security details observed

Users:

- Export, Import, Add users.
- User table with selection, user, status, role, and sign-in security state.
- Store owner row.
- Learn more.

Roles:

- Export and Add role.
- All tab, search/filter, sort, table selection.
- Role name, category, assigned-user count.
- Built-in roles such as Administrator, Store manager, Marketer, Merchandiser, Customer support, Online store editor, App developer, and POS roles.

Security:

- User activity logs with View action.
- Organization service accounts for developer automations and agents.
- Service-account search/filter/sort and empty state.
- Collaborator code, Generate new code, Remove code requirement, and collaborator approval flow.

### Account/store management

The live store/account menu exposed:

- Store identity: My Store.
- Account identity: `zerocraft studio` / `in.zerocraft@gmail.com`.
- View Dev Dashboard.
- Create store.
- Help Center.
- Log out.

Zerocraft should separate:

- Workspace identity.
- Authenticated account identity.
- Organization/workspace switching.
- Session/device management.
- Billing identity.
- Ownership transfer.

## 5. Reusable UI patterns to copy into Zerocraft

### List workspace

```text
Page title + primary action
└─ saved-view tabs
   └─ search / filters / sort / display / import / export
      └─ selection + bulk actions
         └─ dense table
            └─ pagination + empty/error/permission states
```

Required shared components:

- `AdminShell`
- `PrimaryNav`
- `TopBar`
- `GlobalSearchCommand`
- `QuickCreateMenu`
- `AssistantDock`
- `PageHeader`
- `PageToolbar`
- `ViewTabs`
- `SavedViewManager`
- `DataTableWorkspace`
- `FilterBuilder`
- `SortMenu`
- `ColumnVisibilityMenu`
- `BulkActionBar`
- `EmptyState`
- `OnboardingCard`
- `DetailEditor`
- `InspectorPanel`
- `StickyActionBar`
- `ConfirmDialog`
- `Drawer`
- `SettingsShell`
- `IntegrationCard`
- `FeatureGate`
- `AuditTimeline`
- `Toast/NotificationStack`

### Detail editor

- Two-column layout: primary editor + inspector.
- Sticky Save/Publish/Archive action area.
- Draft autosave and unsaved-change protection.
- Preview, revision history, activity, SEO, and publishing metadata.
- Permission-aware field visibility and disabled states.

### State system

Every route must implement:

- Loading skeleton.
- Empty state with one clear action.
- Partial data state.
- Error state with retry.
- Permission denied state.
- Disabled-feature state with enable/configure CTA.
- Integration-not-connected state.
- Provider degraded/offline state.
- Success toast and persisted refresh.

## 6. Data model and backend requirements

### Platform tables

- `studio_workspaces`
- `studio_workspace_members`
- `studio_roles`
- `studio_permissions`
- `studio_role_permissions`
- `studio_member_roles`
- `studio_sessions`
- `studio_devices`
- `studio_audit_logs`
- `studio_activity_events`
- `studio_features`
- `studio_feature_dependencies`
- `studio_integrations`
- `studio_integration_credentials` (encrypted/provider reference only)
- `studio_saved_views`
- `studio_view_filters`
- `studio_notifications`

### Business tables

- `studio_clients`, `studio_client_contacts`, `studio_client_activities`
- `studio_leads`, `studio_lead_events`, `studio_lead_sources`
- `studio_projects`, `studio_project_milestones`, `studio_deliverables`
- `studio_appointments`, `studio_availability`
- `studio_products`, `studio_categories`, `studio_inventory`, `studio_orders`
- `studio_content_entries`, `studio_content_revisions`, `studio_publish_releases`
- `studio_campaigns`, `studio_attribution_events`
- `studio_service_areas`, `studio_catalogs`, `studio_channels`

### API guarantees

- Feature and permission checks happen server-side for every read and mutation.
- Direct URLs to disabled modules return a guarded enable/configure state, never an unprotected page.
- Every list API supports search, filter, sort, cursor/offset pagination, and stable ordering.
- Mutations are idempotent where retries are possible.
- Provider calls have timeout, retry, degraded state, and redacted logging.
- Destructive actions require explicit confirmation and create audit events.
- Secrets are never returned to the browser after connection.

## 7. Security and governance blueprint

### Authentication

- Supabase Auth session with rotating refresh token.
- Email/password and OAuth providers as configured.
- Optional MFA/TOTP or passkey for owners/admins.
- Re-authentication for billing, ownership, security, credential rotation, and destructive actions.

### Session/device management

- Current browser session and other sessions.
- Device name, browser, OS, approximate location, IP hash, last active, created at.
- Trusted/untrusted state.
- Revoke one session or all other sessions.
- New-device alert.

### Authorization

- Workspace-scoped RBAC.
- Resource/action permissions: view, create, edit, publish, export, delete, manage settings, manage members, manage billing.
- Owner/admin/service-account boundaries.
- Server-side row-level security and API authorization.

### Audit and privacy

- Immutable audit entries for login, invite, role change, feature toggle, provider connect/disconnect, export, publish, delete, billing, and session revoke.
- Redacted metadata; never store access tokens, raw secrets, or full payment data.
- Data export and deletion workflow.
- Consent and tracking preference records.
- Retention policy and cleanup jobs.

## 8. Zerocraft parity matrix

| Area | Existing foundation | Gap to close | Priority |
| --- | --- | --- | --- |
| Shell/navigation | Shopify-style feature-gated sidebar and settings shell | Icon rail polish, mobile drawer, unified utility strip | P0 |
| Integrations | Feature registry and provider cards | Connection lifecycle, retries, secret rotation, health history | P0 |
| CRM | Clients/leads routes and forms | Shared table workspace, segments, saved views, bulk actions | P0 |
| Projects | Project foundation | Milestone/detail editor, audit timeline, publish-like status model | P0 |
| Content | Content routes/foundation | Revisions, scheduled publishing, preview/rollback | P1 |
| Analytics | GA4/Search Console integration paths | Persisted reports, date comparison, drill-down, provider health | P1 |
| Store | Commerce routes/foundation | Product editor, inventory movements, orders, bulk operations | P1 |
| Growth | Attribution foundation | Campaign model, funnel reports, automation | P1 |
| Settings | Dedicated settings pages | Complete connected values, save states, permissions, audit trail | P0 |
| Users/Roles | Team access foundation | Role editor, invitations, revoke, resource permissions | P0 |
| Sessions/devices | Device route placeholder/foundation | Real session registry and revocation | P0 |
| Assistant | Text/voice command foundation | Permission-aware command executor and action history | P1 |
| Billing | UI foundation | Billing provider and plan enforcement | P2 |

## 9. Recommended implementation order

### P0 — platform reliability

1. Finish `AdminShell`, settings shell, and responsive rail.
2. Make feature registry the only source for navigation and route guards.
3. Finish users, roles, permissions, sessions/devices, audit logs.
4. Build `DataTableWorkspace` and migrate Clients and Leads.
5. Add integration connection lifecycle and provider health.
6. Add global error/loading/permission/dependency states.

### P1 — operating product

1. Migrate Projects and Works to shared list/detail primitives.
2. Build Content Studio publishing and revision system.
3. Connect Analytics/Growth cards to GA4, Search Console, and attribution tables.
4. Add optional Store product/inventory/order workflows behind Commerce.
5. Add assistant command execution after underlying actions are permission-safe.

### P2 — platform expansion

1. Billing and plan enforcement.
2. Marketplace/installable app model.
3. Service areas/Markets rollout system.
4. Advanced automation, service accounts, webhooks, and public API.

## 10. Acceptance checklist

- [ ] Navigation reflects feature toggles without reload where possible.
- [ ] Disabled feature links disappear and direct routes are server-guarded.
- [ ] Users can search, filter, sort, save views, choose columns, and run bulk actions.
- [ ] Long forms autosave drafts and protect unsaved changes.
- [ ] All sensitive actions require permission and appropriate re-authentication.
- [ ] Sessions/devices can be listed and revoked.
- [ ] Audit events are visible, timestamped, scoped, and redacted.
- [ ] Provider credentials never reach the client.
- [ ] Search Console, GA4, WhatsApp, email, and Instagram show connected/degraded/error states.
- [ ] Home, empty, populated, editor, settings, mobile, and collapsed-rail states pass visual QA.
- [ ] No Base UI native-button warnings or hydration mismatches.
- [ ] Production smoke tests cover enabled/disabled features, permissions, provider failure, and mobile layout.

## Limitations of this audit

- The reference store is a new/trial store, so populated orders/products/customers and billing history were not available.
- Markets rendered as a specialized workspace; some details were loaded outside the standard AppFrame.
- Online Store rendered an embedded theme surface; the iframe did not expose additional accessible content during the audit.
- Some settings routes are lazy-loaded and may show the shell before the detail panel finishes loading. The route inventory and visible settings index were still captured from the live app.

## Source documents

- [SHOPIFY_ADMIN_UI_UX_ANALYSIS_PLAN.md](./SHOPIFY_ADMIN_UI_UX_ANALYSIS_PLAN.md)
- [studio-sidebar.tsx](../../apps/cms/components/layout/studio-sidebar.tsx)
- [studio-shell.tsx](../../apps/cms/app/studio-shell.tsx)
- [admin-routes.ts](../../apps/cms/lib/admin-routes.ts)
