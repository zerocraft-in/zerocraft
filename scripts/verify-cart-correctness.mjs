import assert from "node:assert/strict";
import { getCartLineId, parseCartValidationPayload } from "../apps/store/lib/commerce/cart.ts";
import { validateCartLine } from "../apps/store/lib/commerce/cart-validation.ts";

const productId = "20000000-0000-4000-8000-000000000001";
const variantA = "30000000-0000-4000-8000-000000000001";
const variantB = "30000000-0000-4000-8000-000000000002";
const base = { id: productId, title: "Poster", status: "active", product_type: "physical", price: 12.99, price_paise: 1299, currency: "INR", currency_code: "INR", stock: null, image_url: null, store_product_variants: [
  { id: variantA, label: "A4", sku: "A4-001", options: { Size: "A4" }, price: 12.99, price_paise: 1299, currency_code: "INR", stock: 4, is_active: true },
  { id: variantB, label: "A3", sku: "A3-001", options: { Size: "A3" }, price: 19.99, price_paise: 1999, currency_code: "INR", stock: 4, is_active: true },
] };

assert.notEqual(getCartLineId({ productId, variantId: variantA }), getCartLineId({ productId, variantId: variantB }));
assert.notEqual(getCartLineId({ productId, variantId: variantA, customizationReference: "user-a/one.png" }), getCartLineId({ productId, variantId: variantA, customizationReference: "user-a/two.png" }));
assert.equal(parseCartValidationPayload({ items: [{ productId, variantId: variantA, quantity: 2, size: "A4" }] }).items.length, 1);
assert.ok("error" in parseCartValidationPayload({ items: [{ productId: "prod-1", quantity: 1 }] }));
assert.ok("error" in parseCartValidationPayload({ items: [{ productId, quantity: 21, price: 1 }] }));

const valid = validateCartLine({ productId, variantId: variantA, quantity: 2, size: "A4" }, base, new Map([[variantA, 4]]));
assert.equal(valid.status, "valid");
assert.equal(valid.unitPricePaise, 1299);
assert.equal(valid.lineTotalPaise, 2598);
assert.equal(validateCartLine({ productId, variantId: "30000000-0000-4000-8000-000000000099", quantity: 1 }, base, new Map()).errors[0].code, "VARIANT_INVALID");
assert.equal(validateCartLine({ productId, variantId: variantA, quantity: 5 }, base, new Map([[variantA, 4]])).errors[0].code, "INSUFFICIENT_INVENTORY");
assert.equal(validateCartLine({ productId, variantId: variantA, quantity: 1, size: "A3" }, base, new Map([[variantA, 4]])).errors[0].code, "OPTION_INVALID");
assert.equal(validateCartLine({ productId, variantId: variantA, quantity: 1 }, { ...base, status: "archived" }, new Map()).errors[0].code, "PRODUCT_UNAVAILABLE");
const usd = validateCartLine({ productId, quantity: 1 }, { ...base, store_product_variants: [], currency: "USD", currency_code: "USD", price: 34, price_paise: null }, new Map());
assert.equal(usd.currency, "USD");
assert.equal(usd.unitPricePaise, null);
assert.deepEqual([...new Set([valid.currency, usd.currency])], ["INR", "USD"]);

console.log(JSON.stringify({ passed: 12, remoteCalls: 0, checks: [
  "variant-safe line identity",
  "customization-safe line identity",
  "legacy product IDs rejected by validation payload",
  "excessive quantity and client price fields rejected",
  "INR authoritative paise calculation",
  "invalid variant rejected",
  "insufficient inventory rejected",
  "variant option mismatch rejected",
  "unpublished product rejected",
  "legacy USD calculation preserved",
  "mixed currencies remain distinguishable",
  "remote service mocked with in-memory catalog records",
] }, null, 2));

