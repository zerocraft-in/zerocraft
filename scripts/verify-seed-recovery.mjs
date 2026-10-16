import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildDemoCatalog, categories, collections } from "./seed-commerce-data.mjs";

const envText = await fs.readFile(path.resolve(".env.local"), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=][^=]*)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase environment configuration.");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const read = async (table, columns) => {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
};
const keyOf = (...values) => values.map(String).join("\u001f");
const expected = buildDemoCatalog();
const [categoryRows, productRows, variantRows, optionRows, optionValueRows, variantValueRows, counts] = await Promise.all([
  read("store_categories", "id,slug"),
  read("store_products", "id,slug,category_id"),
  read("store_product_variants", "id,sku,product_id,currency_code,price,price_paise,stock"),
  read("store_variant_options", "id,product_id,name"),
  read("store_variant_option_values", "id,option_id,value"),
  read("store_variant_values", "variant_id,option_value_id"),
  Promise.all(["store_inventory_locations", "store_inventory_levels", "store_customization_templates", "store_collection_products", "storefront_sections", "storefront_banners"].map(async (table) => [table, (await supabase.from(table).select("*", { count: "exact", head: true })).count ?? 0])),
]);

const categoriesBySlug = new Map(categoryRows.map((row) => [row.slug, row]));
const productsBySlug = new Map(productRows.filter((row) => row.slug.startsWith("demo-")).map((row) => [row.slug, row]));
const variantsBySku = new Map(variantRows.map((row) => [row.sku, row]));
const optionsByKey = new Map(optionRows.map((row) => [keyOf(row.product_id, row.name), row]));
const optionValuesByKey = new Map(optionValueRows.map((row) => [keyOf(row.option_id, row.value), row]));
const actualVariantValues = new Set(variantValueRows.map((row) => keyOf(row.variant_id, row.option_value_id)));
const expectedVariantValues = new Set();
let categoryReferencesValid = true;
let variantPricingValid = true;
for (const product of expected.products) {
  const storedProduct = productsBySlug.get(product.slug);
  const category = categoriesBySlug.get(product.category);
  categoryReferencesValid &&= Boolean(storedProduct?.category_id && category?.id === storedProduct.category_id);
}
for (const variant of expected.variants) {
  const storedVariant = variantsBySku.get(variant.sku);
  const storedProduct = productsBySlug.get(variant.product_slug);
  variantPricingValid &&= Boolean(storedVariant?.product_id === storedProduct?.id && storedVariant.currency_code === "INR" && storedVariant.price_paise === variant.price_paise && Number(storedVariant.price) === variant.price);
  for (const [name, value] of Object.entries(variant.options)) {
    const option = optionsByKey.get(keyOf(storedProduct?.id, name));
    const optionValue = optionValuesByKey.get(keyOf(option?.id, value));
    if (optionValue) expectedVariantValues.add(keyOf(storedVariant?.id, optionValue.id));
  }
}

const pending = Object.fromEntries(counts);
const result = {
  demoProducts: productsBySlug.size,
  variants: variantRows.length,
  distinctVariantSkus: variantsBySku.size,
  variantOptionLinks: actualVariantValues.size,
  variantOptionLinksComplete: actualVariantValues.size === expectedVariantValues.size && [...expectedVariantValues].every((value) => actualVariantValues.has(value)),
  categoryReferencesValid,
  variantPricingValid,
  digitalVariantsWithoutStock: variantRows.filter((row) => row.stock == null).length,
  pendingCounts: pending,
  expectedCollectionKeys: collections.map(([slug]) => slug),
  expectedCategoryKeys: categories.map(([slug]) => slug),
};
console.log(JSON.stringify(result, null, 2));
if (!result.variantOptionLinksComplete || !result.categoryReferencesValid || !result.variantPricingValid) process.exitCode = 1;
