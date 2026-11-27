# ADR-001: Canonical Money Representation

**Status:** Proposed
**Date:** 2026-11-27
**Deciders:** Architecture Team
**Tags:** money, currency, database, type-safety

---

## Context

The codebase contains three conflicting implementations for monetary values:

| Implementation | Location | Internal Unit | Status |
|---|---|---|---|
| `money.ts` | `apps/admin/src/lib/money.ts` | **Integer paise** (1 INR = 100 paise) | Primary — used everywhere in admin, 40+ tests |
| `currency.ts` | `packages/utils/src/currency.ts` | **Float rupees** | Secondary — unused in apps/admin, no tests |
| `schemas.ts` | `packages/validators/src/schemas.ts` | Mixed: `priceSchema`=paise, `inrAmountSchema`=rupees | Validator package |

### Database Evidence (Unambiguous)

All monetary columns in the Commerce template migrations use `bigint` with `_paise` suffix:

| Migration | Table | Columns | Type | Unit |
|---|---|---|---|---|
| Commerce 004 | `variants` | `price_paise`, `compare_at_price_paise`, `cost_paise` | `bigint` | **paise** |
| Commerce 007 | `inventory_items` | `unit_cost_paise` | `bigint` | **paise** |
| Commerce 008 | `customers` | `total_spent_paise` | `bigint` | **paise** |
| Commerce 009 | `orders` | `subtotal_paise`, `discount_total_paise`, `shipping_total_paise`, `tax_total_paise`, `total_paise`, `refunded_paise` | `bigint` | **paise** |
| Commerce 010 | `payments` | `amount_paise`, `captured_paise`, `refunded_paise` | `bigint` | **paise** |
| Commerce 011 | `shipping_profiles` | `rate_paise`, `min_order_paise`, `max_order_paise` | `bigint` | **paise** |

Platform migration 003 stores only the currency code (`char(3)` default 'INR') in `organizations.currency`.

### Caller Analysis

- **Zero active imports** of `packages/utils/currency.ts` in `apps/admin`
- All monetary callers in `apps/admin` use `@/lib/money` (paise-based)
- Key files: `product-schema.ts`, `product-form-state.ts`, `types.ts`, `product-detail.tsx`, `variant-generator.ts`

---

## Evidence

From [Session C Offline Audit Report, Section 4 (Money/Currency Investigation)](../session-c-offline-audit.md#4-moneycurrency-investigation-c1-d):

- **Database schema is unambiguously paise-based** — all `_paise` columns are `bigint` with `>= 0` constraints
- **`apps/admin/src/lib/money.ts` is the source of truth** — used everywhere, fully tested (40+ tests), matches DB schema exactly
- **`packages/utils/currency.ts` is incompatible** — float rupees, no overflow safety, no parsing, unused, no tests
- **Validators mixed** — `priceSchema` correctly uses paise (`z.number().int().nonnegative()`), but `inrAmountSchema` uses rupees with float rounding

### Key Technical Differences

| Aspect | `money.ts` (canonical) | `currency.ts` (incompatible) |
|---|---|---|
| Internal unit | **Paise (branded `Paise` type)** | Rupees (raw `number`) |
| Parsing | Strict: rejects >2 decimals, handles "₹1,234.50", "-12.3" | None (assumes valid float) |
| Formatting | `formatPaise()` — Intl.NumberFormat, configurable locale | `formatInr()` / `formatInrRaw()` |
| Conversion | `rupeesToPaise(string\|number) → Paise` | `paiseToRupees(int) → float`, `rupeesToPaise(float) → int` |
| Overflow safety | Explicit checks in `addPaise`, `multiplyPaise`, etc. | None |
| Tests | 40+ comprehensive (parsing, formatting, round-trips, edge cases) | None |

---

## Decision Options

### Option 1: Standardize on Integer Paise (Recommended)
- **Decision:** Make `apps/admin/src/lib/money.ts` the single canonical implementation
- **Action:** Deprecate `packages/utils/src/currency.ts` with clear migration path
- **Action:** Fix `packages/validators/src/schemas.ts` — remove `inrAmountSchema` or align to paise
- **Pros:** Matches database exactly, type-safe (branded type), overflow-safe, fully tested, already used everywhere
- **Cons:** Requires deprecation of utils package; callers needing rupee display use `formatPaise()`

### Option 2: Standardize on Float Rupees
- **Decision:** Migrate everything to rupee-based floats
- **Pros:** More intuitive for humans
- **Cons:** **Breaks database contract** (all columns are `bigint` paise), floating-point precision bugs inevitable, no existing tests, massive migration effort

### Option 3: Support Both with Explicit Conversion Layer
- **Decision:** Keep both, add explicit conversion functions
- **Pros:** Backward compatibility
- **Cons:** Perpetuates confusion, dual maintenance burden, error-prone conversions

---

## Recommendation

**Option 1: Standardize on Integer Paise**

### Concrete Actions

1. **Deprecate `packages/utils/src/currency.ts`**
   - Add JSDoc `@deprecated` tags with migration guidance to `@/lib/money`
   - Keep file for now (may have external consumers), but mark clearly

2. **Fix `packages/validators/src/schemas.ts`**
   - Remove `inrAmountSchema` (rupee-based) — redundant with `priceSchema` (paise-based)
   - Or rename to `inrAmountPaiseSchema` for clarity

3. **Add `CURRENCY_UNIT.md`** in `packages/utils/` documenting:
   - Canonical unit: integer paise
   - Database contract: all monetary columns are `bigint` paise
   - Conversion: `rupeesToPaise()` for input, `formatPaise()` for display

4. **No silent caller changes** — only deprecation comments; callers migrate explicitly

---

## Consequences

### Positive
- Single source of truth for money handling
- Type safety via branded `Paise` type prevents accidental rupee/paise mixing
- Overflow protection built into arithmetic operations
- Database round-trips require no conversion
- Existing 40+ tests provide regression safety

### Negative
- `packages/utils/currency.ts` becomes dead code (deprecated)
- Any external consumers of `@zerocraft/utils` currency functions need migration
- Display formatting always goes through `formatPaise()` (already the case in admin)

### Risks
- Low: All current callers already use paise-based `money.ts`
- Medium: If `packages/utils` is published externally, deprecation needs semver major

---

## Open Questions

1. **Is `@zerocraft/utils` published to npm?** If yes, deprecation requires major version bump and migration guide for external consumers.

2. **Does `packages/validators` `inrAmountSchema` have any consumers?** Audit shows zero imports in apps/admin, but check workers and templates.

3. **Should we add a `rupees` branded type for display-layer clarity?** Currently `formatPaise()` returns formatted strings; a `Rupees` brand could help document intent at API boundaries.

4. **Currency multi-tenancy:** Platform DB stores `organizations.currency` (char(3)). Current code hardcodes INR. Future work: make `money.ts` currency-aware per organization.

---

## Related

- [ADR-002: SKU Validation](./ADR-002-sku-validation.md) — similar consolidation pattern
- [Migration Plan: Money Consolidation](../migration-plan.md#session-c-3-money-consolidation-mutation)
- [Session C Audit: Money Evidence](../session-c-offline-audit.md#4-moneycurrency-investigation-c1-d)