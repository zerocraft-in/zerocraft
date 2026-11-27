# Styling and Theming

Maara Merch uses Tailwind CSS 4 with shadcn/ui primitives and a custom design
system grounded in the clothing-retail vernacular.

## Design tokens

The design anchor is the garment tag / price sticker — a small, high-contrast
piece of information attached to a larger whole. The accent strategy uses a
near-black ink base (fabric), paper-white cards (tags), and a single amber "tag"
accent used sparingly for stock/sale markers.

### Core palette (light theme)

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#111012` | Near-black fabric — body text, primary actions |
| `--paper` | `#ffffff` | Card / tag surface |
| `--cloth` | `#f4f3f5` | Warm-neutral page background |
| `--dye` | `#0e7c7b` | Brand accent (teal) — primary buttons, active states |
| `--tag` | `#b45309` | Amber clothing tag — stock / sale / low-stock markers only |
| `--muted` | `#e7e5e4` | Hairline borders, dividers, subtle structure |

Already present in `globals.css`: `--primary` teal `oklch(0.48 0.13 165)` and
`--tag` `#b45309`.

## Typography

Two families, clearly distinct:

- **Display / headlines:** Manrope (geometric sans with personality). Used for
  page titles and section heads.
- **UI / body:** Inter (system fallback stack). Used for data, labels, tables,
  forms.

Type scale: h1 28px, h2 15px, body 13px, caption 11–12px; intentional weights
(extrabold display, medium labels, regular body). Line lengths < 80ch.

Serif is deliberately not used.

## Theme switching

Theme switching uses `class="dark"` on `<html>` (next-themes), not
`data-theme`, so shadcn dark variants work.

## Layout

- Sidebar + fixed header shell.
- Content area: left-aligned (never justified, no centered headline default).
- One memorable element per page; everything around it quiet.
- Responsive breakpoints: 390, 768, 1024, 1280, 1440 CSS pixels.

## Principles

1. Retail vernacular first: "shop floor," "receive stock," "tag garments."
2. Restraint: spend boldness in ONE place (the tag amber accent).
3. No generic defaults: no ALL-CAPS eyebrows, no middle dots, no `→` on
   buttons, no identical rounded cards with the same soft shadow, no warm cream
   background, no acid-green accent.
4. Accessibility floor: responsive to mobile, visible keyboard focus,
   prefers-reduced-motion respected, sufficient contrast.
