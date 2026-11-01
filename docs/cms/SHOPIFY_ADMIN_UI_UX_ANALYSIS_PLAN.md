# Shopify Admin UI/UX Analysis & Zerocraft CMS Platform Plan

## Scope

Reference audited: `https://admin.shopify.com/store/10ckt4-mh`

The audit covered the live Shopify admin shell and the visible first-party flows available in the current trial store: Home, Orders, Products, Customers, Growth, Discounts, Content, Markets, Analytics, Online Store, Settings, Apps, global search, Sidekick, sales-channel navigation, empty states, data tables, filters, settings navigation, and theme management.

The store is currently a new/trial store with no orders, products, or customers. Therefore, empty-state behavior and the information architecture were observed directly; populated table/detail workflows are defined below as the implementation target for Zerocraft.

## Executive direction

Zerocraft should adopt Shopify's platform model, not copy its commerce vocabulary everywhere:

1. One persistent admin shell.
2. A compact primary navigation with expandable feature groups.
3. Feature modules that can be enabled or hidden from Integrations / Feature Registry.
4. List pages that share the same table, filter, view, bulk-action, import/export, and empty-state system.
5. Detail pages that use a two-column editor with sticky action controls.
6. A global command/search surface available from every route.

Implementation note: the first command-center vertical slice now includes a browser-native wake phrase mode. The supported phrase is “Hey Zerocraft”; after activation, the user can say a supported navigation or create command. This is intentionally opt-in because browser microphone access cannot be enabled silently. The command center also keeps text input and one-shot voice input as fallbacks.
7. A right-side assistant surface for contextual help and actions.
8. A settings shell with searchable categories and independent settings pages.
9. Server-side permissions, audit events, and feature gating for every module.

The result should feel like a premium dark Zerocraft version of Shopify admin: same operating model and density, but with Zerocraft's charcoal/lime visual language, creative-studio terminology, CRM workflows, and optional Store workspace.

## Observed Shopify system

### 1. Global application shell

- Permanent dark left rail with brand mark at the top.
- Global search trigger near the top of the rail; shortcut shown as `Ctrl K`.
- Main navigation remains stable while page content changes.
- Active route uses a filled/rounded highlight.
- Primary sections expand inline and reveal secondary routes.
- Sales channels are a separate navigation group below the core admin routes.
- Apps are a separate expandable group with an Add action.
- Settings, account/store switcher, alerts, and billing/trial state stay at the bottom.
- Main content is a light canvas with a page title row and large rounded cards.
- Sidekick is a persistent bottom-center assistant dock, with file attachment, dictation, and open controls.
- A skip-to-content link and semantic landmarks are present.

### 2. Navigation model

Observed top-level groups:

| Group | Child routes observed | Zerocraft equivalent |
| --- | --- | --- |
| Home | Dashboard | Overview |
| Orders | Orders, Drafts | Leads, Projects, Enquiries, Payments |
| Products | Products, Collections, Inventory, Purchase orders, Transfers, Gift cards | Works, Services, Deliverables, Store products, Categories, Inventory |
| Customers | Customers, Segments, Companies | Clients, Leads, CRM segments, Organizations |
| Growth | Attribution, Autopilot, Campaigns | Growth, Attribution, Campaigns, Automations |
| Discounts | Discounts | Offers, Packages, Promo codes |
| Content | Metaobjects, Files, Menus, Blog posts | Content Studio, Media, Navigation, Journal |
| Markets | Markets, Catalogs, Rollouts | Service areas, Catalogs, Publishing rollouts |
| Analytics | Analytics, Reports, Live View | Analytics, Reports, Live View, Search Console |
| Sales channels | Online Store, Agentic | Public website, Storefront, WhatsApp, Instagram |
| Apps | Installed apps, Add | Integrations, Feature Registry, App Marketplace |
| Settings | General, Plan, Billing, Users, Payments, Checkout, Customer accounts, Shipping, Taxes, Locations, Apps, Sales channels, Domains, Customer events, Metafields, Languages, Privacy, Policies | Workspace, Team, Security, Connections, Billing, Data, SEO, Privacy |

### 3. Home / onboarding dashboard

The Home page is an onboarding command center rather than only a metric dashboard:

- Store identity headline: `Welcome to Shopify — Let's set up My Store`.
- Context selector in the heading.
- Large command/assistant input: `Create a product listing`.
- Recents button, file attachment action, and dictation action.
- Dismissible setup cards with title, explanation, primary CTA, and dismiss button.
- Cards cover product creation, sourcing, theme, payments, domain, shipping, POS, and country-specific setup.
- A progress/guide card groups regional setup tasks.

Zerocraft Home should combine this with live operating metrics:

- Open leads, active projects, overdue milestones, unpaid invoices, upcoming appointments.
- Setup checklist for integrations and feature modules.
- Recent activity feed.
- Quick create command bar.
- Dismissible onboarding cards stored per workspace/user.

### 4. Orders pattern

The empty Orders page uses a very clear centered empty state:

- Page title at the top.
- Large bordered/rounded content card.
- Illustration centered above the message.
- Short explanation.
- One primary CTA.
- Secondary learn-more action below.

Zerocraft should use this exact empty-state pattern for empty Leads, Projects, Clients, Appointments, Works, and Orders.

For populated list pages, implement the Shopify pattern:

- Page title + primary create action.
- Saved views/tabs.
- Search/filter/sort/display controls.
- Bulk selection and bulk action bar.
- Dense responsive table.
- Pagination or cursor loading.
- Empty, loading, error, and permission states.

### 5. Products pattern

Products has a list workspace with:

- Page title.
- View selector.
- Saved view tab (`All`).
- Create-view control.
- Search/filter and sort controls.
- Empty onboarding panel with Add product and Import actions.
- Secondary discovery card for sourcing.
- Product editor route with a plan gate in the current trial.

Zerocraft store implementation should expose:

- Products list.
- Product detail/edit.
- Categories/collections.
- Inventory.
- Media and digital files.
- Pricing, variants, SEO, publishing destinations.
- Import/export.
- Bulk edit.

Existing Zerocraft routes already provide the foundation: `/store`, `/store/products`, `/store/products/new`, `/store/products/[id]`, `/store/categories`, `/store/inventory`, `/store/customization`, and `/store/bin`.

### 6. Customers / CRM pattern

Customers is the strongest reference for Zerocraft CRM:

- Page header with Export, Import, and Add customer actions.
- Segment count and percentage summary.
- Query-builder entry point (`Start a query`).
- AI-assisted segment description (`Describe your segment`).
- Toggle between visual editor and query mode.
- Search field.
- Display options menu.
- Sort menu with field and direction.
- Column picker with a large set of optional fields.
- Reset view and Save view controls.
- Table and friendly no-match state.
- Export and destructive workflows use confirmation surfaces.

Zerocraft CRM should implement this as a reusable `DataTableWorkspace` component for Clients and Leads, with saved views persisted per user/workspace.

### 7. Growth pattern

Growth is a dashboard plus attribution surface:

- Intro/banner for the featured growth product.
- Get started and Learn more actions.
- Performance section with date control and granularity options.
- Metric cards linking to deeper reports.
- Campaign Autopilot section.
- Recent campaigns section.
- Create campaign action.

Zerocraft mapping:

- WhatsApp, Instagram, GA4, Search Console, and email attribution.
- UTM source/medium/campaign reporting.
- Lead conversion funnel.
- Campaign notes and tasks.
- Campaign-to-project attribution.

### 8. Discounts / offers pattern

Discounts uses a compact management page with:

- Export and Create discount actions.
- One-line product explanation.
- Friendly help link.
- Create flow choosing product discount, order discount, shipping discount, amount-off, or buy-X-get-Y.
- Publish/unpublish access controls by sales channel.

Zerocraft should rename this area to Offers for the Studio workspace and preserve the same choice architecture:

- Package discount.
- Seasonal offer.
- Referral incentive.
- Free consultation / discovery offer.
- Store product discount.

### 9. Content pattern

Content uses a dashboard index rather than sending users directly to a table:

- Page title.
- Manage and Add definition actions.
- Status/collection cards: Available on storefront, Web pages, Active, Draft.
- Recent entries section.
- Search field.
- Custom view selector.
- Display options: sort, columns, filters, reset, save.
- Table with no-definition state.

Zerocraft Content Studio should contain:

- Pages.
- Journal/blog posts.
- Reusable content blocks.
- SEO fields.
- Media library.
- Navigation menus.
- Publishing status: draft, review, scheduled, published, archived.
- Revision history.

### 10. Markets pattern

Markets demonstrates a more advanced information architecture:

- Page title with Graph view and Create market actions.
- Tree pane for hierarchy/context.
- Search across all markets.
- Filter and sort.
- Table with status and customization columns.
- Suggested markets inline with dismiss actions.

Zerocraft equivalent:

- Service areas: Tenkasi, Tirunelveli, Tamil Nadu, India, Remote.
- Client segments / catalogs.
- Publishing destinations: public website, Instagram, WhatsApp catalogue, store.
- Rollout status with preview and rollback.

### 11. Analytics pattern

Analytics is a dashboard of linked metric cards:

- Last refreshed indicator.
- More actions.
- Targets/goal action.
- New exploration action.
- Dismissible information banner.
- Date range control.
- Compare-to control.
- Currency selector.
- Metric cards with definition popovers.
- Linked detail reports.
- Line charts, tables, breakdown lists, donuts, horizontal bars, funnels, and cohort grids.
- No-data states inside each card.

Zerocraft Analytics should initially support:

- Leads by source.
- WhatsApp clicks.
- Project brief submissions.
- Email drafts/sends.
- Instagram clicks.
- Project conversion rate.
- Revenue by service.
- Appointment conversion.
- Search Console clicks/impressions/CTR.
- GA4 traffic and event summaries.

### 12. Online Store channel

The Online Store page has a distinct channel workspace:

- Main content in an embedded/editor surface.
- Store visibility status (`Private` in the current trial).
- Preview store action.
- More actions menu.
- Theme preview hero card.
- Current theme name and metadata.
- Select plan / launch CTA.
- Edit theme action.
- Discover themes gallery.
- Import and New theme actions.
- Theme cards with image, author, and Add button.

Zerocraft public website channel should use:

- Public/private status.
- Preview site.
- Publish/rollback.
- Current published version.
- Theme/brand system.
- Page builder entry.
- Media and navigation controls.

### 13. Settings pattern

Settings is a dedicated shell with:

- Back to Settings control.
- Search settings input.
- Left settings navigation.
- Store/workspace identity block.
- One focused setting view in main content.

Observed categories include General, Plan, Billing, Users, Payments, Checkout, Customer accounts, Shipping and delivery, Taxes and duties, Locations, Apps, Sales channels, Domains, Customer events, Metafields and metaobjects, Languages, Customer privacy, and Policies.

Zerocraft should preserve this split between product navigation and configuration navigation. Do not place every configuration page inside the main sidebar.

## Zerocraft UI system to implement

### Layout

- Left rail: 224–248px desktop, collapsible to icon rail.
- Top utility bar: global search, quick create, notifications, profile.
- Main content max width: 1440px.
- Page content width: 1120–1280px for tables/forms.
- Section spacing: 24–32px.
- Dense table row height: 52–60px.
- Detail editor grid: main 2fr + aside 1fr.
- Sticky footer action bar on long forms.
- Responsive breakpoint: mobile bottom navigation or drawer rail.

### Visual language

- Base background: charcoal/near-black.
- Surface: slightly lighter graphite.
- Borders: low-contrast neutral.
- Primary action: Zerocraft lime.
- Success: emerald.
- Warning: amber.
- Error: red.
- Info: cyan/blue.
- Use large radius only on surfaces and panels; buttons remain compact.
- Keep text hierarchy quiet: one strong page title, small uppercase eyebrow, muted descriptions.
- Avoid excessive gradients, oversized empty space, and decorative cards that do not communicate state.

### Shared components

Create a reusable admin component layer:

- `AdminShell`
- `PrimaryNav`
- `NavSection`
- `TopBar`
- `GlobalSearchCommand`
- `QuickCreateMenu`
- `AccountSwitcher`
- `NotificationCenter`
- `AssistantDock`
- `PageHeader`
- `PageToolbar`
- `ViewTabs`
- `SavedViewManager`
- `DataTableWorkspace`
- `ColumnVisibilityMenu`
- `FilterBuilder`
- `SortMenu`
- `BulkActionBar`
- `StatusBadge`
- `MetricCard`
- `ChartCard`
- `DefinitionPopover`
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

All components should use the existing shadcn/ui and Base UI primitives, with native button semantics preserved.

## Feature registry and navigation gating

The existing feature registry is the correct foundation for Shopify-style modular behavior.

Rules:

1. A disabled feature must not appear in primary navigation.
2. A disabled feature must not be reachable through a direct URL except for a guarded upgrade/enable screen.
3. APIs must enforce the same feature check server-side.
4. Feature enable/disable actions require permission and create audit logs.
5. Enabled features can expose child routes and quick actions.
6. Integrations can be `not_configured`, `connected`, `degraded`, `error`, or `disabled`.
7. A feature can depend on an integration, permission, or migration state.
8. A feature disabled by dependency should show a clear reason in Integrations, not a broken page.

Suggested modules:

| Module | Default | Enables |
| --- | --- | --- |
| CRM | Enabled | Clients, Leads, Segments, Activities |
| Projects | Enabled | Projects, Milestones, Deliverables |
| Content Studio | Enabled | Pages, Journal, Media, SEO |
| Store | Optional | Products, Categories, Inventory, Orders |
| Scheduling | Optional | Appointments, Availability |
| Email workspace | Optional | Inbox, Drafts, Templates, Delivery |
| Analytics | Optional | GA4, Search Console, attribution |
| Automations | Optional | Triggers, actions, retries |
| Team access | Enabled | Members, roles, permissions |
| Devices & sessions | Enabled | Device registry, revocation, audit |

## Route and feature plan

### Phase 1 — Shell parity

- Redesign `apps/cms/app/cms-frame.tsx` and shared shell around the Shopify information architecture.
- Add collapsible sections and feature-driven child navigation.
- Add global search and quick create command surfaces.
- Standardize top bar, account, notifications, and assistant dock.
- Add responsive navigation drawer and icon rail.

### Phase 2 — Shared data workspaces

- Refactor Leads, Clients, Projects, Works, Products, Orders, and Content into the same list primitives.
- Add saved views, filter builder, sort menu, column visibility, bulk actions, import/export, and pagination.
- Add consistent loading, error, empty, permission, and dependency states.

### Phase 3 — Detail/editor parity

- Create shared detail layout with two-column content + inspector.
- Add sticky Save/Publish/Archive action bar.
- Add draft autosave and revision history.
- Add audit timeline and activity panel.
- Add URL/SEO/publishing metadata where relevant.

### Phase 4 — Analytics and growth

- Add dashboard metric-card framework.
- Connect GA4/Search Console/UTM data to cards.
- Add date ranges, comparison, refresh timestamp, definitions, and drill-down reports.
- Add campaign and lead attribution views.

### Phase 5 — Store channel

- Add public/private status and preview.
- Add theme/customization workspace.
- Add publish/rollback flow.
- Add catalogs and destinations.
- Add product/order/inventory workflows only when Store is enabled.

### Phase 6 — Settings and platform operations

- Searchable settings shell.
- Team, permissions, security, sessions, integrations, billing, privacy, SEO, and data export.
- Feature Registry as the source of truth for navigation and route guards.
- Audit log for all access, configuration, and publishing changes.

## Data and backend requirements

Required tables or extensions:

- `studio_features` / feature registry.
- `studio_integrations` and provider connection state.
- `studio_saved_views`.
- `studio_filters` or JSONB view definitions.
- `studio_activity_events`.
- `studio_audit_logs`.
- `studio_content_revisions`.
- `studio_publish_releases`.
- `studio_campaigns` and attribution records.
- `studio_sessions` and device registry.
- Optional Store tables already present in the CMS foundation.

API requirements:

- Every list route supports search, filters, sort, pagination, and permission checks.
- Every mutation validates feature enablement and role permission server-side.
- Every external provider call has timeout, retry, degraded-state handling, and redacted error logging.
- Every destructive action requires an explicit confirmation and audit event.

## UX states and acceptance criteria

Every feature page must support:

- Loading skeleton.
- Empty state with one clear next action.
- Partial data state.
- Error state with retry.
- Permission denied state.
- Disabled-feature state with enable/configure action.
- Integration-not-connected state.
- Offline/degraded provider state.
- Success toast and persisted refresh.

Acceptance criteria:

1. Navigation reflects enabled feature state immediately after a toggle.
2. Direct URLs to disabled modules are guarded server-side.
3. Search can find records and navigate to detail pages.
4. Every list supports a saved view.
5. Table columns can be customized and reset.
6. Bulk actions show selection count and confirmation where destructive.
7. Long forms preserve draft state and show unsaved changes.
8. All key actions are keyboard accessible.
9. No Base UI native-button warnings.
10. Live production smoke tests cover enabled/disabled features, permissions, mobile layout, and provider failure states.

## Recommended build order for Zerocraft

1. Finish feature-gated `AdminShell` and navigation.
2. Add shared list workspace primitives.
3. Refactor Leads and Clients first because they are the CRM core.
4. Refactor Projects and Works next.
5. Add Content Studio and publishing.
6. Add Analytics/Growth cards and drilldowns.
7. Add Store channel parity behind the Store feature flag.
8. Finish Settings, Integrations, Sessions, and audit UX.
9. Add assistant/Sidekick actions after the underlying commands are stable.
10. Run production visual QA and accessibility QA across desktop, tablet, and mobile.

## Important product decision

The Zerocraft implementation should be Shopify-inspired at the platform level, but it should not become a literal Shopify clone. The reusable principles are navigation hierarchy, table workspaces, saved views, feature gating, settings shell, analytics drilldowns, and consistent empty/loading/error states. Zerocraft's differentiator remains creative-service CRM, project delivery, content publishing, WhatsApp/email lead conversion, and optional commerce.

## Current browser audit — exact shell contract

The live reference was rechecked in the Shopify admin browser on 2026-10-29 across Home, Orders, Products, Customers, Settings, Online Store, and collapsed-navigation mode. The following contract is the exact behavior to reproduce in Zerocraft's own brand system.

### Persistent sidebar contract

Expanded desktop navigation:

- Fixed dark rail with a brand mark and a collapse control.
- Search is a first-class navigation row, not only an input hidden in the page header.
- Primary links are ordered: Home, Orders, Products, Customers, Growth, Discounts, Content, Markets, Analytics.
- Parent items with children expose an inline disclosure control and preserve the active child route.
- Sales channels is a distinct section below primary navigation.
- Apps is a distinct section with a separate Add action.
- Settings, store/account switcher, alerts, and trial/plan action are anchored at the bottom.
- Every route keeps the same rail; only active state and expanded parent state change.

Collapsed desktop navigation:

- Rail compresses to icon-only mode.
- The same route hierarchy remains available through tooltip/disclosure affordances.
- Sales channels, Apps, alerts, account switcher, and plan status remain accessible.
- Main content reflows into the additional horizontal space; it must not be covered by the rail.

Zerocraft implementation mapping:

- Rename `Home` to `Overview` only in visible copy; retain the same first-position behavior.
- Use `Studio` and `Store` as workspace contexts above the primary group, but keep the Shopify-style parent/child disclosure model inside each context.
- Keep `System` and `Settings` out of the primary content hierarchy; use the dedicated settings shell.
- Keep Integrations as the Apps equivalent and allow feature modules to appear/disappear without changing the shell geometry.

### Top utility and assistant contract

- Desktop content begins beside the rail with no second competing header.
- Global search is centered in the utility strip and exposes a keyboard shortcut.
- Quick create is a compact adjacent action.
- Notifications and account controls are compact icon buttons at the far edge.
- Home and data pages can expose contextual actions in the page header, but the global utility strip remains stable.
- A persistent bottom-center assistant dock provides text input, attachments, dictation, and open/expand behavior.
- Zerocraft's command center should occupy the same assistant role and support the optional “Hey Zerocraft” voice mode without leaving the current workspace.

### Page shell contract

Every primary page must render this sequence:

1. Persistent app shell and active navigation state.
2. Page title row with optional status/context selector.
3. Primary actions aligned to the title row.
4. Page-specific toolbar or setup surface.
5. Main content surface: table, cards, editor, chart dashboard, or empty state.
6. Contextual assistant access and non-blocking notifications.

Do not mix multiple competing page headers, oversized hero cards, or unrelated dashboard cards above a focused table. Shopify's visual rhythm is compact: title, action, toolbar, content.

### Exact page layout contracts observed

| Reference page | Required layout | Zerocraft route target |
| --- | --- | --- |
| Home | Store/workspace title, assistant composer, dismissible onboarding feed, regional setup guide | `/` |
| Orders | Title, centered subscription/empty state, one primary CTA, learn-more action | `/orders` |
| Products | Title, View as, saved view tabs, disabled/enabled search/filter/sort, add/import empty state, discovery panel | `/store/products` |
| Customers | Export/import/add actions, segment composer, editor toggle, search, display options, reset/save view, table/no-match state | `/clients`, `/leads` |
| Growth | Intro banner, performance controls, metric cards, campaign automation, recent campaigns | `/system/growth` |
| Discounts | Export/create actions, discount-type chooser, channel publishing controls | `/offers` or feature-gated `/discounts` |
| Content | Definition/status cards, recent entries, search, saved-view toolbar, table | `/content`, `/blogs`, `/media-library` |
| Markets | Tree/sidebar context, graph/create actions, search/filter/sort, status/customization table | `/markets` or future service-area route |
| Analytics | Refresh metadata, goals/exploration actions, date/compare/currency controls, linked metric cards and chart modules | `/reports`, `/system/growth`, `/system/search-console` |
| Online Store | Visibility status, preview, more actions, current theme hero, publish/edit action, theme gallery | `/store/customization` and future `/channels/website` |
| Settings | Back control, settings search, identity block, category navigation, focused detail panel | `/settings` |

### Shopify-style visual tokens to apply consistently

- Expanded rail: 240px target; compact rail: 64px target.
- Main shell offset must be derived from rail state, never hard-coded in page components.
- Content max width: 1280–1440px; focused data surfaces: 960–1200px.
- Page title baseline: 28–32px; supporting copy: 13–14px.
- Toolbar controls: 32–36px high; table rows: 52–60px high.
- Surfaces: 12–16px radius, 1px low-contrast border, restrained shadow.
- Primary actions: one visually dominant action per page; secondary actions are outline/ghost.
- Empty state: one bordered surface, centered illustration/icon, short explanation, one next action.
- Dark Zerocraft brand shell can remain charcoal/lime, but page hierarchy, density, alignment, and control placement must match this contract.

### Implementation gap from the current CMS

The current CMS already has the route coverage and feature registry, but it is not yet a full visual parity implementation. The remaining work is:

- Replace the current flat Studio/Store link list with nested Shopify-style disclosures.
- Add a true compact icon-rail state with tooltip access.
- Split the global shell from the settings shell at the layout level.
- Standardize page headers/toolbars across Clients, Leads, Projects, Products, Orders, Content, Reports, and Integrations.
- Add shared saved views, filter builder, display options, bulk action, and column menus.
- Add a persistent contextual assistant dock instead of only a modal command surface.
- Add missing first-class routes for Markets/Service areas, Offers/Discounts, and Website channel while preserving feature gating.
- Add visual QA snapshots for expanded rail, collapsed rail, mobile drawer, empty state, populated table, editor, and settings pages.

This contract is the source of truth for the next implementation pass. “Exact” means matching the observed navigation hierarchy, page density, layout rhythm, interaction states, and responsive behavior while keeping Zerocraft branding and avoiding Shopify trademarks or copied proprietary assets.
## Sidebar parity implementation update — 2026-10-29

The Zerocraft shell now follows the audited Shopify navigation contract under Zerocraft branding:

- Fixed 240px desktop navigation with 64px compact icon rail.
- Studio/Store workspace switcher at the top of the rail.
- Grouped primary navigation with route-aware active states and nested disclosure controls.
- Dedicated Sales channels section with Website entry.
- Dedicated Apps section with integrations entry and add affordance.
- Footer controls for Alerts, Help & support, Settings, workspace plan identity, and collapse/expand navigation.
- Active group auto-expands on direct route loads; collapsed mode hides labels and secondary disclosures.
- Sidebar and main content offsets animate together when the rail is collapsed.

Live Shopify observations used for this pass:

| Shopify contract | Zerocraft implementation |
| --- | --- |
| Primary navigation + disclosure affordances | `StudioSidebar` grouped navigation |
| Sales channels | Website route under `/channels` |
| Apps | Integrations route under `/settings/integrations` |
| Settings and alert utilities | `/settings` and `/notifications` footer actions |
| Compact rail | Controlled `SidebarProvider` state with `w-16` rail |

The visual pattern is intentionally Shopify-like while keeping Zerocraft labels, routes, icons, and brand identity distinct.

### Latest navigation/settings convergence

- Removed the Studio/Store tab switcher from the sidebar.
- Removed disclosure arrows and nested expandable navigation from the main rail.
- The rail now renders one continuous active-route navigation list across Studio, Store, Payments, Insights, Staff, and System.
- Added Shopify-style Sales channels and Apps utility rows below the main navigation.
- Added Alerts, workspace plan identity, Help, Settings, and collapse controls to the footer utility area.
- Settings now uses a Shopify-style shell with Back to admin, settings search, workspace identity, and a complete settings index covering General, Plan, Billing, Users, Payments, Checkout, Customer accounts, Shipping, Taxes, Locations, Apps, Sales channels, Domains, Customer events, Notifications, Metafields, Languages, Privacy, and Policies.

### Dropdown navigation convergence — 2026-10-29

The live Shopify audit confirms a two-part navigation contract: the top-level item remains a route link, while a separate chevron control expands its children. Zerocraft now mirrors that behavior with:

- Active parent route styling and route-aware automatic expansion.
- Separate accessible expand/collapse buttons with `aria-expanded` and descriptive labels.
- Framer Motion height, opacity, and horizontal reveal transitions for child groups.
- Collapsed rail behavior that hides child disclosures and keeps icon navigation compact.
- Animated Sales channels and Apps sections with Website and App integrations child routes.
- Canonical group routes for Studio, Store, Payments & invoices, Insights, Staff, and System so overview routes expand correctly.

### Final sidebar visual pass — 2026-10-29

The second live visual audit confirmed that Shopify's expand affordance is an accessible interaction target rather than a persistent visible arrow in the normal rail. The Zerocraft implementation now keeps the expand/collapse button semantics and removes visible arrow glyphs from the UI.

- Desktop rail: 240px wide, fixed below the 56px utility header.
- Compact rail: 64px wide with icon-only navigation.
- Row height: 36px parent rows and 32px child rows.
- Horizontal padding: 12px parent rows, 10px indented child rows.
- Radius: 8px navigation surfaces; 12px workspace plan card.
- Surface: background rail with a single border divider and muted active/hover fill.
- Active state: muted fill, foreground text, medium weight, route-aware parent expansion.
- Motion: 180ms Framer Motion height/opacity/4px slide reveal with `AnimatePresence`.
- Naming: `Overview` is now `Home`; Store overview resolves to `/store` and expands correctly on direct loads.

### Sidebar parity finalization — 2026-10-29

- Parent rows use compact 32px Shopify-style spacing with `rounded-lg` muted active/hover surfaces.
- Child rows are intentionally text-only and indented, matching Shopify's compact nested navigation treatment.
- A child route receives the active pill; its parent remains emphasized without incorrectly duplicating the active surface.
- Disclosure controls remain keyboard/screen-reader accessible through `aria-expanded`, but their visual arrow/button chrome is hidden from the normal rail.
- Apps is a text-only utility row with a separate plus action; Sales channels and Apps children use the same text indentation rhythm.
- Live `/store` verification confirmed Home naming, Store expansion, child route links, and absence of console errors/warnings.

### Shopify sidebar information-architecture pass — 2026-10-29

The reference sidebar was audited against the supplied Shopify Admin view and the local CMS was converged to the same compact hierarchy:

- Search pill, Home, Orders, Products, Customers, Growth, Discounts, Content, Markets, and Analytics.
- Products uses text-only children: Collections, Inventory, Purchase orders, Transfers, and Gift cards.
- Sales channels defaults open with Online Store and Agentic; Apps defaults open with Add and a separate plus action.
- The existing Zerocraft routes remain the targets behind these labels, so this is a visual/IA convergence rather than a destructive route rename.
- Feature gating remains authoritative: Growth/Analytics are omitted while the analytics feature is disabled, and Commerce-only items are omitted when Commerce is disabled.
- Sidebar width is now 216px to match the reference capture, with the main shell/header offset updated to the same value.
- Search is 32px high with a dark elevated fill, 1px muted border, compact `Ctrl K` keycap, and 8px radius.
- Main rows are 32px high; active surfaces use `#303033`, hover uses `#242426`, labels use `#b4b4b8`, and the rail divider uses `#2a2a2d`.
- Nested labels align with the parent text column; Shopify's vertical child guide line is intentionally removed.
- Child active state uses a full-width muted pill; parent groups stay plain/semibold when only a child route is active.
- `Purchase orders` has a dedicated `/orders/purchase-orders` route so the top-level Orders item and child active item do not collide.
- Reveal/collapse uses a 160ms Framer Motion height/opacity transition with an ease-out curve and preserves `aria-expanded` semantics.

### Platform implementation pass — 2026-10-29

- Added a server-side `/api/studio/assistant` command router with a strict allowlist of safe navigation/create actions.
- Added Gemini REST integration support using server-only `GEMINI_API_KEY` and optional `GEMINI_MODEL` configuration.
- Local direct commands still work without an AI key; natural-language commands show a transparent configuration/provider state instead of failing silently.
- Added `assistant` to the feature registry so the assistant dock, command modal, and voice entry point disappear when the feature is disabled.
- Added Supabase migration `20261029150000_studio_assistant_registry.sql` to register the AI feature and Gemini provider without storing credentials.
- Verified local browser flow: dashboard opens the assistant, `open products` navigates to `/store/products`, the Products group expands, and the child links render with the Shopify-style active state.
- CMS typecheck and elevated production build passed; browser console showed no warning/error entries during the smoke test.
