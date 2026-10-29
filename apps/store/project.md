# ZeroCraft Storefront

## Product direction

ZeroCraft is a cinema-inspired storefront for Tamil and Malayalam culture. The interface treats the shop like a lively first-day-first-show theatre: bold display type, ticket and film-strip references, poster-like product art, and small moments of motion create energy without making the shopping path feel difficult.

The active homepage is rendered by `app/page.tsx` through `components/Home.tsx`. The visual system is defined primarily in `app/globals.css`. The obsolete duplicate CRT/Tailwind presentation tree has been removed; the remaining section components are limited to routes that still import them.

## Page layout

1. Announcement marquee: a yellow utility band communicates shipping, offers, and new drops.
2. Sticky site header: brand mark, desktop navigation, search, cart, and responsive menu controls.
3. Hero: dark cinema backdrop, oversized “Wear the Story” headline, Tamil/Malayalam language line, primary and secondary CTAs, trust stats, and layered poster/film props.
4. Category selector: six ticket-shaped category links for tees, hoodies, posters, frames, accessories, and fan packs.
5. Language collections: paired Tamil and Malayalam panels with contrasting red/yellow treatments.
6. Trending products: numbered product grid with quick add and hover artwork motion.
7. Typography marquee: full-width “First day first show” band.
8. Fan packs: bundle cards with savings, artwork, and product links.
9. Now showing: poster-led feature area styled like a theatre box office.
10. Story and trust: brand narrative followed by service assurances.
11. Reviews: ticket-inspired review cards with ratings and verified-fan cues.
12. Newsletter: high-contrast first-show signup panel.
13. Minimal footer: brand, navigation, location, copyright, and back-to-top link.

## Design style

- Editorial streetwear meets South Indian cinema ephemera.
- High-contrast blocks, thick borders, dashed dividers, rounded pills, ticket notches, and offset shadows.
- Motion is expressive but short: hover lift, poster scale, marquee movement, menu reveal, and cart/search transitions.
- Product imagery is treated as the hero of each card; text stays compact and action-oriented.
- The interface uses descriptive BEM-like class names for refreshed components (`site-header__action`, `product-card__price`) while retaining a small set of legacy utility aliases used by older detail routes.

## Color palette

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#1C1411` | Primary dark background, text, borders, shadows |
| `--paper` | `#F0E2C3` | Warm page background and light text |
| `--paper2` | `#F7ECD2` | Cards, overlays, and secondary light surfaces |
| `--sand` | `#DCC9A0` | Muted surface and hover treatment |
| `--red` | `#C23B22` | Cinema red, sales, emphasis, destructive accents |
| `--rd` | `#A8321C` | Dark red text on light backgrounds |
| `--yel` | `#EFB033` | Primary CTA, announcement bands, highlights |
| `--gold` | `#F6D58E` | Dark-surface accent and secondary highlight |
| `--teal` | `#17464C` | Deep supporting accent |
| `--teal2` | `#1F5F66` | Panels, frames, and trust sections |

Use the CSS tokens instead of introducing one-off colors for new storefront UI. White is reserved for high-contrast product and review treatments.

## Typography

- `Anton`: display face for headings, hero statements, navigation overlays, prices in large treatments, and cinema-style labels.
- `Archivo`: body copy, buttons, product names, and interface text.
- `Space Mono`: metadata, labels, categories, ratings, codes, and utility information.
- `Noto Sans Tamil` and `Noto Sans Malayalam`: script lines and regional-language content.
- Heading text is uppercase with tight line-height. Supporting copy uses a relaxed `1.55` line-height.
- Responsive type uses `clamp()` so the visual hierarchy remains dramatic on desktop and readable on mobile.

## Component contract

### Global shell

- `html[data-site="zerocraft-store"]` identifies the storefront document.
- `body#storefront[data-page-shell="storefront"]` identifies the application shell.
- `main#main[data-content-region="primary"]` is the skip-link target and primary content region.
- `#site-header` and `#site-footer` are the stable shell landmarks.

### Navigation and overlays

- `#mobile-menu` is controlled by the menu button through `aria-controls` and `aria-expanded`.
- `#search-overlay` is a modal dialog labelled by `#search-overlay-title`.
- `#search-products` is the search input and controls `#search-results`.
- `#cart-drawer` exposes `data-state="open|closed"` and is labelled by `#cart-drawer-title`.
- All action buttons explicitly use `type="button"` unless they submit a form.

### Commerce components

- Product cards use `#product-card-{slug}` and `data-product-slug`.
- Product metadata exposes `data-product-category`, `data-product-price`, and optional `data-badge`.
- Quick-add actions expose `data-action="quick-add"`.
- The product detail add panel uses `#product-add-panel`, `data-product-slug`, and `#product-size-options`.
- Newsletter uses `#newsletter-form`, `data-form="newsletter"`, and `#newsletter-email` with email autocomplete.

## Responsive behavior

- Desktop: centered 1280px content, multi-column product and category grids, full navigation.
- Tablet: desktop navigation collapses, grids reduce columns, and hero artwork remains layered.
- Mobile: compact icon controls, full-screen menu, single-column search results, always-visible quick-add, reduced section padding, and wrapped footer metadata.
- `prefers-reduced-motion: reduce` disables animation and restores native smoothness behavior.

## Accessibility and interaction rules

- Every major section has a stable ID and a heading relationship through `aria-labelledby` where practical.
- Skip navigation is available at `#main`.
- Focus-visible outlines use the red token on light surfaces and yellow on dark surfaces.
- Decorative art and glows use `aria-hidden="true"`; meaningful product links retain accessible labels.
- Modal-like search, cart, and mobile navigation expose dialog semantics and keyboard-close behavior.
- Same-page scrolling resolves fragment targets by element ID, avoiding selector parsing failures for unusual IDs.

## Files in the active route

- `app/layout.tsx`: metadata, fonts, document shell, providers, announcement, and global landmarks.
- `app/globals.css`: tokens, layout primitives, component styles, responsive rules, and reduced-motion rules.
- `components/Home.tsx`: homepage composition and section IDs.
- `components/Header.tsx`: sticky navigation, mobile menu, search trigger, and cart trigger.
- `components/SearchOverlay.tsx`: modal search UI and result semantics.
- `components/CatalogProductCard.tsx`: Supabase catalog card, variant picker, and quick-add behavior.
- `lib/commerce/catalog.ts`: server-only Supabase catalog queries and row-to-domain mapping.
- `components/AddPanel.tsx`: product size, quantity, cart, purchase, and delivery controls.
- `components/CartDrawer.tsx` and `components/CartProvider.tsx`: cart presentation and state.
- `components/NewsForm.tsx`: newsletter form semantics.
- `components/MotionExperience.tsx`: reduced-motion-aware same-page scrolling and route reset.
- `components/Marquee.tsx`: reusable announcement and editorial ticker.
- `components/Footer.tsx`: footer navigation and brand close.
