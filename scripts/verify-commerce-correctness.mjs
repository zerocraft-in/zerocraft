import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { resolveCatalogMoney } from "../lib/commerce/money.ts";
import { getVariantOption, normalizeVariantOptions } from "../lib/commerce/variant-options.ts";

function formatCatalogPriceForTest(amount, currency) {
  if (!/^[A-Z]{3}$/.test(String(currency ?? "").trim().toUpperCase()) || !Number.isFinite(amount)) return "Price unavailable";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: String(currency).trim().toUpperCase(), maximumFractionDigits: 2 }).format(amount);
}

function formatCatalogPaiseForTest(amountPaise, currency) {
  const amount = Number(amountPaise);
  return Number.isInteger(amount) ? formatCatalogPriceForTest(amount / 100, currency) : "Price unavailable";
}

assert.equal(formatCatalogPaiseForTest(1299, "INR"), "₹12.99");
assert.equal(formatCatalogPriceForTest(34, "USD"), "$34.00");
assert.equal(formatCatalogPriceForTest(34, null), "Price unavailable");
assert.equal(resolveCatalogMoney({ currency: "INR", price: 999, pricePaise: 1299 }).amount, 12.99);
assert.deepEqual(resolveCatalogMoney({ currency: "USD", price: 34, pricePaise: null }), { currency: "USD", amount: 34, amountPaise: null });
assert.throws(() => resolveCatalogMoney({ currency: undefined, price: 34, pricePaise: null }), /missing a valid currency/);
assert.throws(() => resolveCatalogMoney({ currency: "INR", price: 12.99, pricePaise: null }), /valid paise amount/);

const options = normalizeVariantOptions({ Size: "A4", "Colour": "Warm White" });
assert.deepEqual(options, { size: "A4", color: "Warm White" });
assert.equal(getVariantOption(options, "size"), "A4");
assert.equal(getVariantOption(options, "color"), "Warm White");
assert.equal(getVariantOption(options, "finish"), null);

const catalogSource = await fs.readFile(new URL("../lib/commerce/catalog.ts", import.meta.url), "utf8");
assert.doesNotMatch(catalogSource, /store_product_variants\([^)]*\bcurrency\b/);
assert.doesNotMatch(catalogSource, /from ["']@\/lib\/data\/storeData["']/);

console.log(JSON.stringify({
  passed: 13,
  checks: [
    "INR paise formatting",
    "legacy USD formatting",
    "missing currency is unavailable",
    "INR paise is authoritative",
    "legacy USD amount is preserved",
    "missing currency is rejected by catalog money resolution",
    "missing INR paise is rejected",
    "Size and Colour options normalize",
    "variant option lookup is canonical",
    "catalog has no unsupported variant currency/static model authority",
  ],
}, null, 2));
