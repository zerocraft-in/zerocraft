# Package Architecture

This document describes the internal architecture of each shared package.

## @zerocraft/ui — Shared shadcn/ui components

### Exports

Subpath exports for tree-shaking:

```
@zerocraft/ui                 → src/index.ts (all named exports)
@zerocraft/ui/button          → Button, buttonVariants
@zerocraft/ui/input           → Input
@zerocraft/ui/label           → Label
@zerocraft/ui/separator       → Separator
@zerocraft/ui/skeleton        → Skeleton
@zerocraft/ui/alert           → Alert
@zerocraft/ui/card            → Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
@zerocraft/ui/auth-heading    → AuthHeading
@zerocraft/ui/submit-button   → SubmitButton
@zerocraft/ui/provider-icons  → GoogleIcon, AppleIcon
@zerocraft/ui/auth-shell      → AuthShell
@zerocraft/ui/mark            → Mark, Wordmark
@zerocraft/ui/utils           → cn()
@zerocraft/ui/use-mobile      → useIsMobile()
```

The `@zerocraft/ui/admin/*` import convention has been removed. Admin app
imports use `@zerocraft/ui/*` for shared components or local `./` imports for
admin-specific UI components.

### Runtime dependencies

- `class-variance-authority`
- `clsx`
- `lucide-react`
- `tailwind-merge`

### Internal imports

`packages/ui` must not depend on application-specific `@/` aliases. Internal
package dependencies use relative imports.

## @zerocraft/auth-core — Auth, session, RBAC primitives

Public exports from `src/index.ts` are stable. Apps import named exports
directly. Handles redirect validation, rate limiting, crypto/handoff, and email
normalization.

### Runtime dependencies

None (stdlib only).

## @zerocraft/utils — INR formatting, SKU helpers, constants

Exports `formatInr`, `formatInrRaw`, `paiseToRupees`, `rupeesToPaise`,
`buildSku`, `parseSku`, `validateSku`, `CURRENCY`, `CURRENCY_SYMBOL`,
`DEFAULT_LOCALE`.

### Runtime dependencies

None (stdlib only).

### Relationship to `apps/admin/src/lib/money.ts`

`money.ts` remains the source of truth. `packages/utils/src/currency.ts` is a
lightweight subset with decimal rupee amounts. Not merged due to incompatible
behaviors (paise vs rupees, branded types vs plain numbers, strict validation
vs simple conversion).

## @zerocraft/validators — Shared Zod schemas

Exports Zod schemas: `skuSchema`, `priceSchema`, `inrAmountSchema`,
`emailSchema`, `phoneSchema`.

### Runtime dependencies

- `zod`

### Relationship to admin validation

`skuSchema` is not used in `apps/admin` due to incompatible SKU validation
rules (uppercase/hyphen-separated vs lowercase allowed, max 64 vs max 40, no
transform vs `.toUpperCase()`).

## @zerocraft/eslint-config — Shared ESLint flat config

Exports `base` flat config and default export. Apps extend it as base.

### Runtime dependencies

- `eslint`
- `eslint-config-next`

## @zerocraft/tsconfig — Shared TypeScript presets

Exports `base.json` preset. Apps extend it with `verbatimModuleSyntax: false`
override.

### Runtime dependencies

None (stdlib only).

## @zerocraft/mcp — MCP server

Pre-built dist, no consumers. No changes by design.
