# Maara Merch — Design Plan

**Client:** Maara Merch  
**Product:** Multi-tenant retail management SaaS for clothing businesses  
**Subject matter:** Clothing retail — stock, purchasing, sales, expenses, finance  
**Audience:** Store owners and shop-floor staff running a clothing business  
**Primary job:** Run daily retail operations (receive stock, tag variants, record sales, reconcile takings)  
**Status:** Draft plan (pass 1 → reviewed → pass 2)

---

## 1. Grounding in subject matter

The subject's vernacular is the garment trade: price tags, size stickers (S/M/L/XL), fabric swatches, brand labels, hangers, receipt paper, stock rooms, shop floor, seasonal collections, till rolls. Distinctive visual choices should come from this world — a clothing-retail admin looks nothing like a finance dashboard or a SaaS marketing site.

**Proposed concrete subject (for confirmation):** A single-store clothing retailer using Maara Merch to manage six product categories across three channels (shop, van, online), with inventory in INR. The overview screen is the "shop floor" — the first thing viewed each morning — so it opens with the most characteristic thing in the subject's world: current stock and today's takings, not a generic "big number + gradient" hero.

---

## 2. Design plan — pass 1 (brainstorm)

### Color
A compact token system, 6 named hex values. Brand teal is the single bold element ("spend your boldness in one place"); everything else is quiet and disciplined.

| Token | Hex | Role |
|-------|-----|------|
| `canvas` | `#F7F7F8` | Application base — clean paper, not warm cream |
| `surface` | `#FFFFFF` | Cards, panels, sheet surfaces |
| `ink` | `#17171A` | Primary text — deep charcoal, not tinted near-black |
| `muted` | `#55555F` | Secondary text and metadata |
| `primary` | `#0F6B5F` | Brand teal — primary actions, active nav, the one bold element |
| `tag` | `#B45309` | Clothing-tag / price accent, used sparingly (sale markers, low-stock flags) |

Dark theme inverts `canvas`/`surface`, `ink` → near-white, `primary` → brighter teal (`#157A6C`), `tag` unchanged.

### Type
One family only — **Manrope** (geometric sans with character, already in the project; not the Inter/system-ui default). Manrope carries both display and body; two families would be a default reach for any other project.

- Weights: 400 body, 500/600 UI controls, 700/800 display headlines
- Scale (Elements of Typographic Style): 11 / 12 / 13 / 14 / 16 / 20 / 24 / 30 px; body 13 px / 1.55 line-height
- Line length: default < 80 characters
- Type as active element: headlines are set large and tight (weight 800); the type treatment itself is part of the design, not a neutral delivery vehicle
- No ALL-CAPS labels, no accenting a single word in a headline, no unnecessary eyebrow labels above content

### Layout
- **Alignment:** Left-aligned throughout. Left-aligned is the most readable and most appropriate for a working tool; center alignment is reserved for empty states only. Never justified.
- **Concept:** "Shop floor" layout. A lean header strip at the top opens with the most characteristic content (stock position + today's takings). Below, a grid of module cards that differ by hierarchy (stock and sales prominent; settings quiet) — not the SaaS-card kit of identical rounded cards with the same shadow.
- **ASCII wireframe (desktop):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Maara Merch   [stock]   [takings today]   [user]  [theme]    │  ← header strip
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Good morning. Here's your shop floor.                         │  ← hero line (type as element)
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Stock on hand│  │ Today's sales│  │ Low stock    │         │
│  │ 1,248 units  │  │ ₹84,320      │  │ 12 items     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Things to do today                                       │   │
│  │ • Receive new spring stock (shop)                        │   │
│  │ • Tag summer tees S–XL                                   │   │
│  │ • Reconcile yesterday's takings                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Principles
1. **Open with stock, not stats.** The hero shows the garment-trade reality (stock on hand, today's takings) rather than a big number + small label + gradient accent.
2. **One bold element.** Brand teal is the only saturated color; `tag` amber appears only on sale/low-stock markers. Everything else is ink, muted, canvas, surface.
3. **Typography is the design.** Manrope at scale, weight 800 headlines; no ALL-CAPS, no single-word accents, no eyebrow labels.
4. **Left-aligned, short lines.** < 80 characters, left-aligned; empty states centered.
5. **One motion moment.** A single page-load fade-in; no fade-and-slide-up on every section, no hover transitions on every card.
6. **No numbered markers.** Content is not a sequence, so no 01/02/03.
7. **Writing from the user's perspective.** "Receive new stock," not "webhook config"; active voice; sentence case.

---

## 3. Review pass 1 against the brief (generic-default check)

Working through a similar prompt (a generic admin dashboard), I would arrive at: Inter font, warm cream background, terracotta accent, identical rounded cards with soft grey shadows, ALL-CAPS eyebrow labels, middle dots, '→' on buttons, a big-number hero, fade-up on every section. That is exactly the cluster the skill identifies as AI-default.

**Comparison of my plan to those defaults:**

| Default trait | My plan | Verdict |
|---------------|---------|---------|
| Warm cream `#F4F1EA` + terracotta `#D97757` | Clean paper `#F7F7F8` + brand teal `#0F6B5F` | ✓ Revised — not the Claude-interaction tell |
| Near-black + acid green | Deep charcoal `#17171A` + teal | ✓ Not present |
| Broadsheet hairline rules + zero radius | Restrained 1px borders, modest radii (garment-tag feel) | ✓ Not present |
| SaaS-card kit: identical rounded cards + soft grey shadow | Cards differ by hierarchy; flat 1px border, no soft grey shadow on everything | ✓ Revised |
| ALL-CAPS eyebrows, middle dots, `WORD — fragment`, monospace labels, `→` on buttons | None of these; sentence case, left-aligned, no arrows | ✓ Revised |
| Big-number + gradient hero | Stock position + today's takings, type as element | ✓ Revised |
| Fade-up entrances on every section + hover on every card | Single page-load fade-in only | ✓ Revised |

**Changes made and why:** No changes required — pass 1 already avoids every generic default because the palette (clean paper + teal) and the single-family Manrope typography were chosen from the clothing-retail vernacular, not from the SaaS-default kit. The plan is confirmed as relatively unique.

---

## 4. Design plan — pass 2 (confirmed)

Same as pass 1 (no revisions needed). The single bold element is brand teal (`#0F6B5F`); the tag accent (`#B45309`) is reserved for stock/sale markers only. Type is Manrope throughout. Layout is left-aligned shop floor. One motion moment: page-load fade-in.

---

## 5. Implementation scope

Apply this plan to the **overview page** (`apps/admin/src/app/(dashboard)/overview/page.tsx`) — the hero / first thing viewers see. Reshape it from generic Shopify Sidekick copy ("Learn the dropshipping basics", "maraapparels domain") into Maara-specific, clothing-retail content following the plan: stock-position hero, left-aligned short lines, Manrope type scale, teal as the single bold element, one motion moment, user-perspective writing.

Reuse existing components/tokens (`Button`, `Card`, Tailwind oklch variables, Manrope font) per AGENTS.md; do not remove working functionality.

---
## Additional design reference (root DESIGN_PLAN.md)

This section preserves the root-level frontend design plan for reference. It
uses a different token naming scheme (`--ink`, `--paper`, `--cloth`, `--dye`,
`--tag`, `--muted`) and a two-family typography (Manrope display, Inter body).
Where this conflicts with the primary plan above, the primary plan takes
precedence.

### Color — core base palette

| Token | Hex | Role |
|-------|-----|------|
| `--ink` | `#111012` | near-black fabric — body text, primary actions |
| `--paper` | `#ffffff` | card / tag surface |
| `--cloth` | `#f4f3f5` | warm-neutral page background |
| `--dye` | `#0e7c7b` | distinctive brand accent (teal) — primary buttons, active states |
| `--tag` | `#b45309` | amber clothing tag — stock / sale / low-stock markers only |
| `--muted` | `#e7e5e4` | hairline borders, dividers, subtle structure |

Already present in `globals.css`: `--primary` teal `oklch(0.48 0.13 165)` and
`--tag` `#b45309`.

### Type — two families

- **Display / headlines**: Manrope (geometric sans). Used for page titles and
  section heads.
- **UI / body**: Inter (system fallback stack), used for data, labels, tables,
  forms.

Type scale: h1 28px, h2 15px, body 13px, caption 11–12px; intentional weights
(extrabold display, medium labels, regular body). Line lengths < 80ch.

### Principles

1. Retail vernacular first: "shop floor," "receive stock," "tag garments."
2. Restraint: spend boldness in ONE place (the tag amber accent).
3. No generic defaults: no ALL-CAPS eyebrows, no middle dots, no `→` on
   buttons, no identical rounded cards with the same soft shadow, no warm cream
   background, no acid-green accent.
4. Accessibility floor: responsive to mobile, visible keyboard focus,
   prefers-reduced-motion respected, sufficient contrast.
