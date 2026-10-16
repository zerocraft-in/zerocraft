import fs from "node:fs";
import crypto from "node:crypto";
import { buildDemoCatalog, categories, DEMO_PRODUCT_COUNT, productGroups } from "./seed-commerce-data.mjs";

const seedSource = fs.readFileSync(new URL("./seed-commerce.mjs", import.meta.url), "utf8");
const first = buildDemoCatalog();
const second = buildDemoCatalog();
const digest = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (message) => { throw new Error(message); };
const duplicates = (values) => new Set(values).size !== values.length;

if (DEMO_PRODUCT_COUNT !== 72 || first.products.length !== 72) fail("Expected exactly 72 demo products.");
if (categories.length !== 9 || productGroups.length !== 9) fail("Expected exactly 9 categories and product groups.");
if (duplicates(categories.map(([slug]) => slug))) fail("Duplicate category slug.");
if (duplicates(first.products.map((product) => product.slug))) fail("Duplicate product slug.");
if (duplicates(first.products.map((product) => product.sku))) fail("Duplicate product SKU.");
if (duplicates(first.variants.map((variant) => variant.sku))) fail("Duplicate variant SKU.");
if (first.products.some((product) => product.price_paise <= 0 || !Number.isInteger(product.price_paise) || product.currency !== "INR" || product.currency_code !== "INR" || product.price !== product.price_paise / 100 || product.compare_at_price !== product.compare_at_price_paise / 100 || product.compare_at_price < product.price)) fail("Invalid INR product pricing.");
const productsBySlug = new Map(first.products.map((product) => [product.slug, product]));
if (first.variants.some((variant) => !productsBySlug.has(variant.product_slug) || variant.currency !== "INR" || variant.currency_code !== "INR" || variant.price !== variant.price_paise / 100 || variant.price_paise < productsBySlug.get(variant.product_slug).price_paise)) fail("Invalid variant reference or INR pricing.");
if (first.templates.length !== 8 || first.templates.some((template) => !productsBySlug.has(template.product_slug) || template.schema.fields?.length !== 2)) fail("Invalid customization template references.");
if (first.variants.length !== 170) fail(`Expected 170 meaningful variants; found ${first.variants.length}.`);
if (first.variants.filter((variant) => variant.stock != null).length !== 166) fail("Digital products must not receive physical inventory levels.");
if (digest(first) !== digest(second)) fail("Seed output is not deterministic.");
if (!/ZEROCRAFT_SEED_ENV/.test(seedSource) || !/development/.test(seedSource) || !/staging/.test(seedSource)) fail("Development/staging guard is missing.");
if (/(truncate|drop\s+table|\.delete\s*\(|\.update\s*\()/i.test(seedSource)) fail("Destructive or broad update logic found in seed.");
if (!/ignoreDuplicates:\s*true/.test(seedSource) || !/\.or\(filter\)/.test(seedSource)) fail("Conflict-safe composite insertion/readback is missing.");
const variantPayload = seedSource.slice(seedSource.indexOf("const variants ="), seedSource.indexOf("const variantRows ="));
if (/currency\s*:\s*variant\.currency/.test(variantPayload)) fail("Unsupported legacy variant currency payload remains.");
const templatePayload = seedSource.slice(seedSource.indexOf('store_customization_templates'), seedSource.indexOf('store_collection_products'));
if (/\.\.\.template\s*[,}]/.test(templatePayload) && !/product_slug/.test(templatePayload)) fail("Template product slug mapping is missing.");

console.log(JSON.stringify({
  products: first.products.length,
  categories: categories.length,
  variants: first.variants.length,
  customizationTemplates: first.templates.length,
  physicalInventoryLevels: 166,
  digitalVariantsWithoutPhysicalInventory: 4,
  deterministicDigest: digest(first),
  destructiveMutationPatterns: false,
}, null, 2));
