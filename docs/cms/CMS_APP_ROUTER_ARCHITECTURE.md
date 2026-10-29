# Zerocraft CMS App Router architecture

The CMS keeps its existing public URLs stable while adding the App Router primitives needed for a Shopify-style admin platform.

## Shell ownership

- `app/layout.tsx` owns fonts, providers, appearance, and the global `CmsFrame` boundary.
- `app/template.tsx` provides a route-instance transition boundary without remounting the global document.
- `app/@modal/` is the global parallel modal slot. Its default state renders nothing, while `(.)quick-create` intercepts quick-create navigation from any CMS page.
- `app/cms-frame.tsx` decides which routes use the Studio shell.
- `app/studio-shell.tsx` owns the global admin sidebar and top bar.
- `app/settings/` owns the settings workspace content inside that shell.

## Settings route

`/settings` remains the stable entry point. Settings navigation now uses nested URLs such as `/settings/general`, `/settings/shipping`, and `/settings/privacy`; the page still accepts the legacy `?section=` query for backward compatibility.

The settings segment includes:

- `layout.tsx`: stable settings boundary and `@overlay` parallel slot.
- `template.tsx`: remounts the settings content on pathname changes for clean route transitions.
- `loading.tsx`: Shopify-style settings skeleton with the navigation column and content cards.
- `error.tsx`: route-local recovery UI.
- `[section]/page.tsx`: dynamic settings section route.
- `_components/`: private, non-routable settings components.
- `@overlay/default.tsx`: empty parallel overlay state.
- `@overlay/(.)preview/page.tsx`: intercepted preview panel when a preview navigation is initiated from the settings workspace.
- `preview/page.tsx`: canonical preview route.

## Incremental route groups

`app/(admin)/layout.tsx` is the route-group boundary for future admin route migrations. It intentionally has no visual output yet, so existing routes do not change while the platform is moved in safe slices.

The root route group is deliberately non-breaking: existing CMS URLs stay at `/`, `/orders`, `/settings`, `/store`, and so on. New admin routes can move under `(admin)` later without changing their public paths.

This structure avoids duplicating the global shell and allows future groups such as `(auth)`, `(admin)`, and `(storefront)` to share layouts without changing the browser URL.
