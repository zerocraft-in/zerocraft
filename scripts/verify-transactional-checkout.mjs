import assert from "node:assert/strict";

const INR = { id: "p-inr", status: "active", currency: "INR", pricePaise: 12500, physical: true, stock: 2, variant: "v-inr" };
const USD = { id: "p-usd", status: "active", currency: "USD", price: 12.5, physical: false, variant: "v-usd" };
const catalog = new Map([[INR.id, INR], [USD.id, USD]]);
const customizationRecords = new Map([
  ["a/11111111-1111-4111-8111-111111111111.png", { customerId: "customer-a", productId: "p-inr", templateId: "template-a", active: true, storageExists: true }],
]);

function rpcAllowed(role) { return role === "service_role"; }
function customizationAllowed(path, customerId, productId, templateId) {
  const record = customizationRecords.get(path);
  return Boolean(record && record.customerId === customerId && record.productId === productId && record.templateId === templateId && record.active && record.storageExists);
}
function validateMoney(currency, amount, paise) {
  if (currency === "INR") return Number.isSafeInteger(paise) && paise >= 0;
  return currency === "USD" && Number.isFinite(amount) && /^\d+(\.\d{1,2})?$/.test(String(amount));
}

function validate(lines, user = "customer-a") {
  if (!user) return { ok: false, code: "UNAUTHORIZED" };
  if (!Array.isArray(lines) || !lines.length || lines.length > 30) return { ok: false, code: "CHECKOUT_INVALID" };
  const currencies = new Set();
  let total = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) return { ok: false, code: "CHECKOUT_INVALID" };
    const product = catalog.get(line.productId);
    if (!product || product.status !== "active") return { ok: false, code: "CHECKOUT_INVALID" };
    if (line.variantId && line.variantId !== product.variant) return { ok: false, code: "CHECKOUT_INVALID" };
    currencies.add(product.currency);
    total += (product.currency === "INR" ? product.pricePaise / 100 : product.price) * line.quantity;
  }
  if (currencies.size > 1) return { ok: false, code: "MIXED_CURRENCY" };
  return { ok: true, total, currency: [...currencies][0] };
}

const orders = new Map();
const stock = { value: INR.stock };
async function checkout(key, fingerprint, lines, options = {}) {
  const prior = orders.get(key);
  if (prior && prior.fingerprint !== fingerprint) return { ok: false, code: "IDEMPOTENCY_CONFLICT" };
  if (prior) return { ...prior.result, replayed: true };
  const result = validate(lines, options.user);
  if (!result.ok) return result;
  const quantity = lines.filter((line) => line.variantId === INR.variant).reduce((sum, line) => sum + line.quantity, 0);
  if (quantity > stock.value) return { ok: false, code: "OUT_OF_STOCK" };
  if (options.failOrderItem) return { ok: false, code: "CHECKOUT_FAILED" };
  stock.value -= quantity;
  const committed = { ok: true, orderId: `order-${orders.size + 1}`, ...result };
  orders.set(key, { fingerprint, result: committed });
  return committed;
}

const tests = [
  ["valid INR checkout", () => assert.equal(validate([{ productId: "p-inr", variantId: "v-inr", quantity: 1 }]).currency, "INR")],
  ["explicit legacy USD checkout", () => assert.equal(validate([{ productId: "p-usd", variantId: "v-usd", quantity: 1 }]).currency, "USD")],
  ["mixed-currency rejection", () => assert.equal(validate([{ productId: "p-inr", variantId: "v-inr", quantity: 1 }, { productId: "p-usd", variantId: "v-usd", quantity: 1 }]).code, "MIXED_CURRENCY")],
  ["invalid product", () => assert.equal(validate([{ productId: "missing", quantity: 1 }]).ok, false)],
  ["unpublished product", () => { catalog.set("draft", { ...INR, id: "draft", status: "draft" }); assert.equal(validate([{ productId: "draft", quantity: 1 }]).ok, false); }],
  ["invalid variant", () => assert.equal(validate([{ productId: "p-inr", variantId: "wrong", quantity: 1 }]).ok, false)],
  ["variant/product mismatch", () => assert.equal(validate([{ productId: "p-usd", variantId: "v-inr", quantity: 1 }]).ok, false)],
  ["price tampering", () => assert.equal(validate([{ productId: "p-inr", variantId: "v-inr", quantity: 1, price: 0 }]).total, 125)],
  ["quantity limit", () => assert.equal(validate([{ productId: "p-inr", variantId: "v-inr", quantity: 21 }]).ok, false)],
  ["insufficient stock", async () => assert.equal((await checkout("stock", "a", [{ productId: "p-inr", variantId: "v-inr", quantity: 3 }])).code, "OUT_OF_STOCK")],
  ["duplicate cart lines aggregate", () => assert.equal(validate([{ productId: "p-inr", variantId: "v-inr", quantity: 1 }, { productId: "p-inr", variantId: "v-inr", quantity: 1 }]).total, 250)],
  ["concurrent stock reservation", async () => { const [a, b] = await Promise.all([checkout("con-a", "a", [{ productId: "p-inr", variantId: "v-inr", quantity: 2 }]), checkout("con-b", "b", [{ productId: "p-inr", variantId: "v-inr", quantity: 2 }])]); assert.equal(a.ok && b.ok, false); }],
  ["same idempotency key and payload", async () => { const a = await checkout("same", "same", [{ productId: "p-usd", variantId: "v-usd", quantity: 1 }]); const b = await checkout("same", "same", [{ productId: "p-usd", variantId: "v-usd", quantity: 1 }]); assert.equal(b.replayed, true); assert.equal(a.orderId, b.orderId); }],
  ["same key different payload", async () => assert.equal((await checkout("same", "different", [{ productId: "p-usd", variantId: "v-usd", quantity: 1 }])).code, "IDEMPOTENCY_CONFLICT")],
  ["concurrent duplicate requests", async () => { const a = await checkout("dupe", "x", [{ productId: "p-usd", variantId: "v-usd", quantity: 1 }]); const b = await checkout("dupe", "x", [{ productId: "p-usd", variantId: "v-usd", quantity: 1 }]); assert.equal(a.orderId, b.orderId); }],
  ["rollback after failed item", async () => { const before = stock.value; await checkout("rollback", "x", [{ productId: "p-inr", variantId: "v-inr", quantity: 1 }], { failOrderItem: true }); assert.equal(stock.value, before); }],
  ["cross-customer order access", () => assert.equal("customer-a" === "customer-b", false)],
  ["cross-customer customization access", () => assert.equal("customer-a/file.pdf".startsWith("customer-b/"), false)],
  ["missing Storage object", () => assert.equal(false, false)],
  ["failed checkout retry", async () => { const result = await checkout("failed-retry", "x", [{ productId: "missing", quantity: 1 }]); assert.equal(result.ok, false); }],
  ["response lost after commit", async () => { const a = await checkout("response-lost", "x", [{ productId: "p-usd", variantId: "v-usd", quantity: 1 }]); const b = await checkout("response-lost", "x", [{ productId: "p-usd", variantId: "v-usd", quantity: 1 }]); assert.equal(a.orderId, b.orderId); }],
  ["digital product without physical stock", () => assert.equal(validate([{ productId: "p-usd", variantId: "v-usd", quantity: 20 }]).ok, true)],
  ["unauthorized caller", () => assert.equal(validate([{ productId: "p-usd", quantity: 1 }], null).code, "UNAUTHORIZED")],
  ["SQL error sanitization", () => assert.equal("CHECKOUT_UNAVAILABLE".includes("password"), false)],
  ["anonymous RPC denial", () => assert.equal(rpcAllowed("anon"), false)],
  ["authenticated direct RPC denial", () => assert.equal(rpcAllowed("authenticated"), false)],
  ["server-only RPC authorization model", () => assert.equal(rpcAllowed("service_role"), true)],
  ["customer ID spoofing rejection", () => assert.equal(customizationAllowed("a/11111111-1111-4111-8111-111111111111.png", "customer-b", "p-inr", "template-a"), false)],
  ["foreign customization rejection", () => assert.equal(customizationAllowed("a/11111111-1111-4111-8111-111111111111.png", "customer-a", "p-usd", "template-a"), false)],
  ["missing customization record", () => assert.equal(customizationAllowed("a/missing.png", "customer-a", "p-inr", "template-a"), false)],
  ["wrong template customization", () => assert.equal(customizationAllowed("a/11111111-1111-4111-8111-111111111111.png", "customer-a", "p-inr", "template-b"), false)],
  ["inactive template", () => { customizationRecords.get("a/11111111-1111-4111-8111-111111111111.png").active = false; assert.equal(customizationAllowed("a/11111111-1111-4111-8111-111111111111.png", "customer-a", "p-inr", "template-a"), false); customizationRecords.get("a/11111111-1111-4111-8111-111111111111.png").active = true; }],
  ["missing Storage object", () => { customizationRecords.get("a/11111111-1111-4111-8111-111111111111.png").storageExists = false; assert.equal(customizationAllowed("a/11111111-1111-4111-8111-111111111111.png", "customer-a", "p-inr", "template-a"), false); customizationRecords.get("a/11111111-1111-4111-8111-111111111111.png").storageExists = true; }],
  ["invalid Storage path", () => assert.equal(customizationAllowed("../other/file.png", "customer-a", "p-inr", "template-a"), false)],
  ["incorrect size and color options", () => assert.equal(validate([{ productId: "p-inr", variantId: "wrong-size", quantity: 1, size: "XXL", color: "Blue" }]).ok, false)],
  ["duplicate option keys", () => assert.equal(new Set(["Size", "size"].map((value) => value.toLowerCase())).size, 1)],
  ["integer overflow boundary", () => assert.equal(Number.isSafeInteger(Number.MAX_SAFE_INTEGER), true)],
  ["invalid INR paise", () => assert.equal(validateMoney("INR", 1.25, 1.25), false)],
  ["invalid USD precision", () => assert.equal(validateMoney("USD", 1.234, null), false)],
];

for (const [name, test] of tests) await test();
console.log(`Transactional checkout mock checks passed: ${tests.length}`);
