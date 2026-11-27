# ADR-002: SKU Validation — Consolidation to Single Source

**Status:** Proposed
**Date:** 2026-11-27
**Deciders:** Architecture Team
**Tags:** sku, validation, database, type-safety, consolidation

---

## Context

The codebase contains **three conflicting SKU validation implementations** with different rules:

| Implementation | Location | Rules | Status |
|---|---|---|---|
| **Database** | Commerce migrations 004, 006 | `text` NOT NULL, 1–64 chars, **any characters** | Source of truth for persistence |
| **Validators package** | `packages/validators/src/schemas.ts` | `z.string().regex(/^[A-Z0-9-]+$/)` — uppercase alphanumeric + hyphen only | Used in API validation |
| **Admin app** | `apps/admin/src/lib/product-schema.ts` | `z.string().min(1).max(64).transform(v => v.toUpperCase())` — case-insensitive input, uppercase storage | Used in admin forms |

### Database Evidence (Schema Contract)

```sql
-- Commerce 004: variants.sku
sku text NOT NULL,
CONSTRAINT variants_sku_length CHECK (char_length(sku) BETWEEN 1 AND 64)

-- Commerce 006: variants.sku UNIQUE (tenant-scoped)
CREATE UNIQUE INDEX variants_tenant_sku_unique ON variants (tenant_id, sku);
```

**Database allows ANY 1–64 character string** — no character set restriction.

### Conflict Matrix

| Input | Database | Validators | Admin |
|---|---|---|---|
| `"abc-123"` | ✅ Accept | ❌ Reject (lowercase) | ✅ Accept → `"ABC-123"` |
| `"ABC-123"` | ✅ Accept | ✅ Accept | ✅ Accept |
| `"sku with spaces"` | ✅ Accept | ❌ Reject | ❌ Reject (transform fails) |
| `"sku@special"` | ✅ Accept | ❌ Reject | ❌ Reject |
| `""` (empty) | ❌ Reject | ✅ Accept (min 1 not enforced?) | ❌ Reject (min 1) |
| `"a".repeat(65)` | ❌ Reject (len) | ✅ Accept (no max) | ❌ Reject (max 64) |

---

## Evidence

From [Session C Offline Audit Report, Section 4.2 (SKU Validation)](../session-c-offline-audit.md#42-sku-validation-c2):

- **Three implementations, three different rule sets** — no single source of truth
- **Validators package is strictest** — rejects valid database values (lowercase, special chars)
- **Admin is most permissive on input** — uppercases everything, but rejects spaces/special chars during transform
- **Database is most permissive** — accepts anything 1–64 chars
- **Unique index is tenant-scoped** — `(tenant_id, sku)` unique, not global

### Current Callers

- **Validators package:** Used in API routes (needs investigation — may be zero active callers in admin)
- **Admin product-schema:** Used in all product/variant forms, variant generator, API mutations
- **Database:** Source of truth — all writes must satisfy DB constraints

---

## Decision Options

### Option 1: Database as Source of Truth, Validators/ Admin Align (Recommended)
- **Decision:** Database schema (1–64 chars, any text) is canonical
- **Action:** Update `packages/validators/src/schemas.ts` to match DB: `z.string().min(1).max(64)`
- **Action:** Update `apps/admin/src/lib/product-schema.ts` to match DB: `z.string().min(1).max(64)` — **remove `.transform(v => v.toUpperCase())`**
- **Action:** Add SKU normalization (uppercase) as **separate, explicit step** at persistence layer if desired
- **Pros:** Single source of truth, no data loss, maximum flexibility, matches DB exactly
- **Cons:** Loses automatic uppercase normalization in admin (could be feature, not bug)

### Option 2: Enforce Uppercase Alphanumeric + Hyphen Everywhere
- **Decision:** Restrict DB with CHECK constraint `sku ~ '^[A-Z0-9-]+$'`
- **Action:** Add migration to constrain `variants.sku`
- **Action:** Keep validators package as-is, update admin to match
- **Pros:** Consistency, predictable SKU format
- **Cons:** **Breaking change** — existing data may violate; requires data migration; reduces flexibility

### Option 3: Keep Three Implementations, Document Differences
- **Decision:** Accept inconsistency, add comments explaining each layer's rules
- **Pros:** Zero code changes
- **Cons:** Perpetuates bugs, confusion, silent data corruption risk

---

## Recommendation

**Option 1: Database as Source of Truth — Align Validators and Admin**

### Concrete Actions

1. **Fix `packages/validators/src/schemas.ts`**
   ```typescript
   // Before: z.string().regex(/^[A-Z0-9-]+$/)
   // After:  z.string().min(1).max(64)
   export const skuSchema = z.string().min(1).max(64);
   ```

2. **Fix `apps/admin/src/lib/product-schema.ts`**
   ```typescript
   // Before: z.string().min(1).max(64).transform(v => v.toUpperCase())
   // After:  z.string().min(1).max(64)
   export const skuSchema = z.string().min(1).max(64);
   ```

3. **Add explicit SKU normalization at persistence layer** (if uppercase desired)
   - In variant creation/update actions: `sku.toUpperCase()` before DB write
   - Keeps normalization visible, testable, and separate from validation

4. **Add integration test** verifying:
   - Admin can create variant with any 1–64 char SKU
   - API accepts same SKU
   - DB persists without error
   - Round-trip preserves exact input (or documents normalization)

---

## Consequences

### Positive
- Single source of truth: database schema
- No silent rejection of valid database values
- Maximum flexibility for merchant SKU schemes
- Validators package becomes thin wrapper over DB constraints

### Negative
- Admin loses automatic uppercase transform (may surprise users)
- If uppercase SKUs are business requirement, must add explicit normalization step

### Risks
- **Low:** Existing SKUs in DB already satisfy 1–64 char constraint
- **Medium:** If validators package has external consumers, they may rely on strict regex
- **Low:** Admin forms already handle uppercase display; input flexibility is UX improvement

---

## Open Questions

1. **Is uppercase SKU a business requirement or implementation artifact?** Audit shows admin transforms to uppercase, but DB doesn't require it. Confirm with product.

2. **Does `packages/validators` have external consumers?** If published to npm, regex change is breaking.

3. **Should SKU uniqueness be case-insensitive?** Current unique index `(tenant_id, sku)` is case-sensitive. If business requires case-insensitive uniqueness, need `LOWER(sku)` in index or citext.

4. **Are there SKUs with special characters in production?** Check existing data before relaxing validators.

---

## Related

- [ADR-001: Money Representation](./ADR-001-money-representation.md) — similar consolidation pattern
- [Migration Plan: SKU Validation Consolidation](../migration-plan.md#session-c-4-sku-validation-consolidation)
- [Session C Audit: SKU Evidence](../session-c-offline-audit.md#42-sku-validation-c2)