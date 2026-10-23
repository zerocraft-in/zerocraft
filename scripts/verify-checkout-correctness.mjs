import assert from "node:assert/strict";
import { parseCheckoutRequest, canonicalCheckoutPayload } from "../apps/store/lib/commerce/checkout.ts";

const id = "11111111-1111-4111-8111-111111111111";
const variant = "22222222-2222-4222-8222-222222222222";
const base = {
  idempotencyKey: "checkout-test-1",
  items: [{ productId: id, variantId: variant, quantity: 2 }],
  address: { fullName: "Test Customer", street: "1 Test Street", city: "Chennai", state: "TN", postalCode: "600001", country: "IN", phone: "9999999999" },
  delivery: "standard",
  paymentMethod: "cod",
};

const parsed = parseCheckoutRequest(base);
assert.equal(parsed.ok, true, "valid INR-shaped request parses");
if (parsed.ok) assert.equal(canonicalCheckoutPayload(parsed.data), canonicalCheckoutPayload({ ...parsed.data, idempotencyKey: "different-key" }), "fingerprint excludes idempotency key");
assert.equal(parseCheckoutRequest({ ...base, items: [{ ...base.items[0], price: 1 }] }).ok, false, "client price is rejected");
assert.equal(parseCheckoutRequest({ ...base, paymentMethod: "card" }).ok, false, "unsupported payment is rejected");
assert.equal(parseCheckoutRequest({ ...base, paymentMethod: "upi_qr" }).ok, true, "UPI manual payment parses");
assert.equal(parseCheckoutRequest({ ...base, paymentMethod: "bank_transfer" }).ok, true, "bank transfer manual payment parses");
assert.equal(parseCheckoutRequest({ ...base, items: [{ ...base.items[0], quantity: 21 }] }).ok, false, "excessive quantity is rejected");
assert.equal(parseCheckoutRequest({ ...base, items: [{ ...base.items[0], productId: "prod-1" }] }).ok, false, "static product IDs are rejected");
assert.equal(parseCheckoutRequest({ ...base, items: [{ ...base.items[0], customizationReference: `${id}/bad.txt` }] }).ok, true, "reference is syntax-bounded and ownership is server-side");
console.log("Checkout correctness checks passed: 8");

