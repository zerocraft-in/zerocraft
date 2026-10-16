import { createClient } from "@supabase/supabase-js";
import { buildDemoCatalog, categories, collections, DEMO_PRODUCT_COUNT } from "./seed-commerce-data.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allow = process.env.ZEROCRAFT_SEED_ENV === "development" || process.env.ZEROCRAFT_SEED_ENV === "staging";
if (!url || !key) throw new Error("Missing Supabase server credentials.");
if (!allow) throw new Error("Refusing to seed. Set ZEROCRAFT_SEED_ENV=development or staging explicitly.");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { products: productDefinitions, variants: variantDefinitions, templates: templateDefinitions } = buildDemoCatalog();
if (DEMO_PRODUCT_COUNT !== 72 || productDefinitions.length !== 72) throw new Error("Seed definition must generate exactly 72 demo products.");

const READBACK_COLUMNS = {
  store_categories: "id,slug",
  store_collections: "id,slug",
  store_products: "id,slug,sku,category_id",
  store_product_variants: "id,sku,stock",
  store_variant_options: "id,product_id,name",
  store_variant_option_values: "id,option_id,value",
  store_variant_values: "variant_id,option_value_id",
  store_inventory_locations: "id,code",
  store_inventory_levels: "location_id,variant_id",
  store_customization_templates: "id,slug",
  store_collection_products: "collection_id,product_id",
  storefront_sections: "id,section_key",
  storefront_banners: "id",
};
const READBACK_BATCH_SIZE = 40;
const columnsFor = (table) => READBACK_COLUMNS[table] ?? "id";
const compositeKey = (row, keys) => keys.map((key) => String(row[key])).join("\u001f");

async function readBack(table, rows, keys) {
  const result = [];
  for (let offset = 0; offset < rows.length; offset += READBACK_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + READBACK_BATCH_SIZE);
    const filter = batch.map((row) => `and(${keys.map((key) => `${key}.eq.${row[key]}`).join(",")})`).join(",");
    const { data, error } = await supabase.from(table).select(columnsFor(table)).or(filter);
    if (error) throw new Error(`${table}: ${error.message}`);
    result.push(...(data ?? []));
  }
  const byKey = new Map(result.map((row) => [compositeKey(row, keys), row]));
  const missing = rows.filter((row) => !byKey.has(compositeKey(row, keys)));
  if (missing.length) throw new Error(`${table}: readback missing ${missing.length} expected row(s)`);
  return rows.map((row) => byKey.get(compositeKey(row, keys)));
}

async function insert(table, rows, onConflict) {
  if (!rows.length) return [];
  if (onConflict.includes(",")) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    const keys = onConflict.split(",").map((key) => key.trim());
    return readBack(table, rows, keys);
  }
  const existingResult = await supabase.from(table).select(columnsFor(table)).in(onConflict, rows.map((row) => row[onConflict]).filter(Boolean));
  if (existingResult.error) throw new Error(`${table}: ${existingResult.error.message}`);
  const existingKeys = new Set((existingResult.data ?? []).map((row) => row[onConflict]));
  const missing = rows.filter((row) => !existingKeys.has(row[onConflict]));
  if (missing.length) {
    const { error } = await supabase.from(table).insert(missing);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  const { data, error } = await supabase.from(table).select(columnsFor(table)).in(onConflict, rows.map((row) => row[onConflict]).filter(Boolean));
  if (error) throw new Error(`${table}: ${error.message}`);
  const byKey = new Map((data ?? []).map((row) => [String(row[onConflict]), row]));
  const missingRows = rows.filter((row) => !byKey.has(String(row[onConflict])));
  if (missingRows.length) throw new Error(`${table}: readback missing ${missingRows.length} expected row(s)`);
  return rows.map((row) => byKey.get(String(row[onConflict])));
}

const categoryRows = await insert("store_categories", categories.map(([slug, name]) => ({
  slug,
  name,
  description: `Original Zerocraft ${name.toLowerCase()} made for the demo catalog.`,
  image_url: "https://placehold.co/1200x800/png?text=Zerocraft+Demo+Category",
  is_active: true,
})), "slug");
const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));

const collectionRows = await insert("store_collections", collections.map(([slug, name, description]) => ({
  slug,
  name,
  tagline: description,
  description,
  image_url: "https://placehold.co/1200x800/png?text=Zerocraft+Demo+Collection",
  status: "published",
})), "slug");
const collectionBySlug = new Map(collectionRows.map((row) => [row.slug, row.id]));

const productInput = productDefinitions.map(({ category, ...product }) => ({ ...product, category_id: categoryBySlug.get(category) }));
if (productInput.some((product) => !product.category_id)) throw new Error("Seed category lookup failed.");
const products = await insert("store_products", productInput, "slug");
const productBySlug = new Map(products.map((row) => [row.slug, row]));
if (productDefinitions.some((product) => !productBySlug.get(product.slug)?.id)) throw new Error("Seed product lookup failed.");

const variants = variantDefinitions.map((variant) => ({
  product_id: productBySlug.get(variant.product_slug)?.id,
  label: variant.label,
  sku: variant.sku,
  options: variant.options,
  price: variant.price,
  price_paise: variant.price_paise,
  currency_code: variant.currency_code,
  stock: variant.stock,
  is_active: variant.is_active,
}));
const variantRows = await insert("store_product_variants", variants, "sku");
const variantBySku = new Map(variantRows.map((row) => [row.sku, row]));
if (variantDefinitions.some((variant) => !variantBySku.get(variant.sku)?.id)) throw new Error("Seed variant lookup failed.");

const optionRows = [];
for (const product of products) {
  const options = new Set(variantDefinitions.filter((variant) => variant.product_slug === product.slug).flatMap((variant) => Object.keys(variant.options)));
  for (const name of options) optionRows.push({ product_id: product.id, name, sort_order: 0 });
}
const storedOptions = await insert("store_variant_options", optionRows, "product_id,name");
const optionByProductName = new Map(storedOptions.map((row) => [`${row.product_id}:${row.name}`, row]));
if (optionRows.some((option) => !optionByProductName.get(`${option.product_id}:${option.name}`)?.id)) throw new Error("Seed option lookup failed.");
const optionValueRows = [];
for (const variant of variantDefinitions) {
  const product = productBySlug.get(variant.product_slug);
  for (const [name, value] of Object.entries(variant.options)) optionValueRows.push({ option_id: optionByProductName.get(`${product.id}:${name}`)?.id, value, sort_order: 0 });
}
const storedOptionValues = await insert("store_variant_option_values", optionValueRows, "option_id,value");
const optionValueByKey = new Map(storedOptionValues.map((row) => [`${row.option_id}:${row.value}`, row]));
const variantValueRows = variantDefinitions.flatMap((variant) => {
  const storedVariant = variantBySku.get(variant.sku);
  const product = productBySlug.get(variant.product_slug);
  if (!storedVariant?.id || !product?.id) throw new Error(`Seed variant relationship lookup failed for ${variant.sku}.`);
  return Object.entries(variant.options).map(([name, value]) => {
    const option = optionByProductName.get(`${product.id}:${name}`);
    const optionValue = optionValueByKey.get(`${option?.id}:${value}`);
    if (!option?.id || !optionValue?.id) throw new Error(`Seed option-value relationship lookup failed for ${variant.sku}.`);
    return { variant_id: storedVariant.id, option_value_id: optionValue.id };
  });
});
await insert("store_variant_values", variantValueRows, "variant_id,option_value_id");

const mainLocation = (await insert("store_inventory_locations", [{ code: "DEMO-MAIN", name: "Demo Main Studio", is_active: true }], "code"))[0];
if (mainLocation) await insert("store_inventory_levels", variantRows.filter((variant) => variant.stock != null).map((variant) => ({ location_id: mainLocation.id, variant_id: variant.id, on_hand: variant.stock, reserved: 0, reorder_point: 3 })), "location_id,variant_id");

await insert("store_customization_templates", templateDefinitions.map(({ product_slug, ...template }) => ({ ...template, product_id: productBySlug.get(product_slug)?.id })), "slug");
await insert("store_collection_products", products.map((product, index) => ({ collection_id: collectionBySlug.get(collections[index % collections.length][0]), product_id: product.id, sort_order: index })), "collection_id,product_id");
await insert("storefront_sections", [
  { section_key: "demo-featured", title: "Demo featured products", payload: { product_slugs: [...productBySlug.keys()].slice(0, 8), demo: true }, sort_order: 10, is_published: true },
  { section_key: "demo-categories", title: "Demo categories", payload: { category_slugs: categories.map(([slug]) => slug), demo: true }, sort_order: 20, is_published: true },
], "section_key");
await insert("storefront_banners", [{ id: "70000000-0000-4000-8000-000000000001", title: "Everything starts at zero", eyebrow: "Development catalog", body: "Original demo inventory for Zerocraft Studio.", image_url: "https://placehold.co/1600x600/png?text=Zerocraft+Demo", href: "/store/shop", sort_order: 10, is_published: true }], "id");
console.log(`Seed complete: ${products.length} products, ${variantRows.length} variants. Demo-only data.`);
